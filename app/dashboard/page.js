"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import { hoursBetween } from "@/lib/bill";
import { api, getErrorMessage, downloadFile } from "@/lib/api-client";

const OFFICE = { lat: +process.env.NEXT_PUBLIC_OFFICE_LAT, lng: +process.env.NEXT_PUBLIC_OFFICE_LNG, r: +process.env.NEXT_PUBLIC_RADIUS_M || 200 };
const dist = (a, b, c, d) => { const R = 6371000, t = (x) => x * Math.PI / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const empty = { courseCode: "", timeIn: "", timeOut: "", type: "Major", topic: "", studentsAssigned: "", studentsAttended: "", km: "" };
const GEO_MSG = { 1: "Location permission denied. Allow location access in your browser to mark attendance.",
  2: "Couldn’t determine your location. Move somewhere with better signal.", 3: "Location request timed out. Retrying…" };

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState({}), [pos, setPos] = useState(null), [locErr, setLocErr] = useState("");
  const [f, setF] = useState(empty), [msg, setMsg] = useState(null);
  const [rows, setRows] = useState([]), [reports, setReports] = useState([]), [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState(""), [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(null); // month currently downloading, for a per-button spinner
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const { data } = await api.get("/attendance");
      setRows(data.rows || []); setMe({ name: data.name, role: data.role });
      const rep = await api.get("/reports", { params: { list: 1 } });
      setReports(rep.data.reports || []);
    } catch (err) {
      if (err.response?.status === 401) return router.push("/");
      setLoadErr(await getErrorMessage(err));
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => {
    load();
    if (!navigator.geolocation) { setLocErr("This browser can’t share your location."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); setLocErr(""); },
      (err) => setLocErr(GEO_MSG[err.code] || "Couldn’t get your location. Check your device’s location settings."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [load]);

  const d = pos && OFFICE.lat ? Math.round(dist(pos.lat, pos.lng, OFFICE.lat, OFFICE.lng)) : null;
  const inside = d !== null ? d <= OFFICE.r : null;
  const hours = rows.reduce((s, r) => s + hoursBetween(r.timeIn, r.timeOut), 0);
  const days = new Set(rows.map((r) => r.date)).size;

  async function submit(e) {
    e.preventDefault();
    if (f.timeOut && f.timeIn && f.timeOut <= f.timeIn) return setMsg({ ok: false, t: "Time out must be after time in." });
    setBusy(true); setMsg(null);
    try {
      await api.post("/attendance", { ...f, lat: pos?.lat, lng: pos?.lng, accuracy: pos?.acc });
      setMsg({ ok: true, t: "Attendance saved." }); setF(empty); load();
    } catch (err) {
      setMsg({ ok: false, t: await getErrorMessage(err) });
    } finally { setBusy(false); }
  }
  async function download(params, key) {
    setDl(key); setMsg(null);
    try { await downloadFile("/reports", params); }
    catch (err) { setMsg({ ok: false, t: await getErrorMessage(err) }); }
    finally { setDl(null); }
  }
  async function logout() {
    try { await api.post("/auth/logout"); } catch { /* still leave, even if this call fails */ }
    router.push("/");
  }

  if (loading) return <main><p className="sub">Loading…</p></main>;
  if (loadErr) return (
    <main><div className="panel" style={{ textAlign: "center" }}>
      <h2>Couldn’t load your dashboard</h2><p className="sub" style={{ margin: "8px 0 18px" }}>{loadErr}</p>
      <button onClick={load}>Retry</button>
    </div></main>
  );

  return (
    <>
      <Nav name={me.name} role={me.role} onLogout={logout} />
      <main>
        <div className="hello"><h1>{me.name ? `Hello, ${me.name.split(" ")[0]}` : "Mark attendance"}</h1><p>{today()} · log today’s sessions below.</p></div>

        <div className="stats">
          <div className="stat hl"><span>Sessions this month</span><b>{rows.length}</b></div>
          <div className="stat"><span>Hours taken</span><b>{hours.toFixed(1)}</b></div>
          <div className="stat"><span>Days present</span><b>{days}</b></div>
        </div>

        <form className="panel" onSubmit={submit}>
          <div className="panel-h"><div><h2>New attendance entry</h2><p className="sub">Date is recorded automatically.</p></div></div>
          <div className={`loc ${inside === null ? "" : inside ? "in" : "out"}`}>
            <span className="dot" />
            {locErr || (d === null ? "Finding your location…" : inside ? `You’re at the office (${d} m away).` : `You’re ${d} m from the office. You need to be within ${OFFICE.r} m.`)}
          </div>
          <div className="sect" style={{ marginTop: 0 }}>Session</div>
          <div className="grid">
            <div><label>Date</label><input value={today()} disabled /></div>
            <div><label>Course code</label><input required value={f.courseCode} onChange={set("courseCode")} /></div>
            <div><label>Time in</label><input type="time" required value={f.timeIn} onChange={set("timeIn")} /></div>
            <div><label>Time out</label><input type="time" required value={f.timeOut} onChange={set("timeOut")} /></div>
            <div><label>Major / Minor</label><select value={f.type} onChange={set("type")}><option>Major</option><option>Minor</option></select></div>
          </div>
          <div className="sect">Bill details (optional)</div>
          <div className="grid">
            <div><label>Unit / topic covered</label><input value={f.topic} onChange={set("topic")} /></div>
            <div><label>Students assigned</label><input type="number" min="0" value={f.studentsAssigned} onChange={set("studentsAssigned")} /></div>
            <div><label>Students attended</label><input type="number" min="0" value={f.studentsAttended} onChange={set("studentsAttended")} /></div>
            <div><label>Kilometres travelled</label><input type="number" min="0" step="0.1" value={f.km} onChange={set("km")} /></div>
          </div>
          <div style={{ marginTop: 20 }}><button disabled={busy || !pos}>{busy ? "Saving…" : "Save attendance"}</button></div>
          {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
        </form>

        <div className="panel">
          <div className="panel-h">
            <div><h2>This month</h2><p className="sub">Your entries so far.</p></div>
            <button type="button" className="ghost" disabled={dl === "current"} onClick={() => download(undefined, "current")}>
              {dl === "current" ? "Preparing…" : "Download Excel + bill"}
            </button>
          </div>
          <div className="scroll"><table>
            <thead><tr><th>Date</th><th>Course</th><th>In</th><th>Out</th><th>Type</th><th>Topic</th></tr></thead>
            <tbody>
              {rows.map((r) => <tr key={r._id}><td>{r.date}</td><td>{r.courseCode}</td><td>{r.timeIn}</td><td>{r.timeOut}</td>
                <td><span className={`badge ${r.type.toLowerCase()}`}>{r.type}</span></td><td>{r.topic || "—"}</td></tr>)}
              {!rows.length && <tr><td colSpan="6" className="empty">No entries yet. Your first session will show up here.</td></tr>}
            </tbody>
          </table></div>
        </div>

        <div className="panel">
          <div className="panel-h"><div><h2>Past monthly reports</h2><p className="sub">Built automatically on the 1st of each month.</p></div></div>
          {reports.length ? <div className="row">{reports.map((r) => (
            <button key={r.month} type="button" className="ghost sm" disabled={dl === r.month} onClick={() => download({ stored: r.month }, r.month)}>
              {dl === r.month ? "Preparing…" : r.month}
            </button>))}</div>
            : <div className="empty" style={{ padding: 8, textAlign: "left" }}>Nothing yet. Reports appear here after the first month ends.</div>}
        </div>
      </main>
    </>
  );
}
