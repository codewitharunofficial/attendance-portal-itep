"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import LoadingScreen, { Spinner } from "../components/LoadingScreen";
import { hoursBetween } from "@/lib/bill";
import { MAX_SESSION_HOURS, MAX_SESSIONS_PER_DAY, MAX_HOURS_PER_DAY } from "@/lib/constants";
import { api, getErrorMessage, downloadFile } from "@/lib/api-client";

const OFFICE = { lat: +process.env.NEXT_PUBLIC_OFFICE_LAT, lng: +process.env.NEXT_PUBLIC_OFFICE_LNG, r: +process.env.NEXT_PUBLIC_RADIUS_M || 200 };
const dist = (a, b, c, d) => { const R = 6371000, t = (x) => x * Math.PI / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const GEO_MSG = { 1: "Location permission denied. Allow location access in your browser to mark attendance.",
  2: "Couldn’t determine your location. Move somewhere with better signal.", 3: "Location request timed out. Retrying…" };
const newSession = () => ({ id: Math.random().toString(36).slice(2), courseCode: "", timeIn: "", timeOut: "", type: "Major", topic: "", studentsAssigned: "", studentsAttended: "" });

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState({}), [pos, setPos] = useState(null), [locErr, setLocErr] = useState("");
  const [sessions, setSessions] = useState([newSession()]), [km, setKm] = useState(""), [msg, setMsg] = useState(null);
  const [rows, setRows] = useState([]), [reports, setReports] = useState([]), [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState(""), [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(null);

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
  const monthHours = rows.reduce((s, r) => s + hoursBetween(r.timeIn, r.timeOut), 0);
  const days = new Set(rows.map((r) => r.date)).size;

  // today's already-SAVED sessions (for the daily cap), plus what's still being drafted in the form
  const todaysSaved = rows.filter((r) => r.date === today());
  const savedHours = todaysSaved.reduce((s, r) => s + hoursBetween(r.timeIn, r.timeOut), 0);
  const draftHours = sessions.reduce((s, x) => s + (x.timeIn && x.timeOut && x.timeOut > x.timeIn ? hoursBetween(x.timeIn, x.timeOut) : 0), 0);
  const slotsLeft = MAX_SESSIONS_PER_DAY - todaysSaved.length - sessions.length;
  const hoursLeft = +(MAX_HOURS_PER_DAY - savedHours - draftHours).toFixed(2);

  const setField = (id, k) => (e) => setSessions(sessions.map((x) => (x.id === id ? { ...x, [k]: e.target.value } : x)));
  const addSession = () => slotsLeft > 0 && setSessions([...sessions, newSession()]);
  const removeSession = (id) => setSessions(sessions.filter((x) => x.id !== id));

  function validateDraft() {
    if (todaysSaved.length + sessions.length > MAX_SESSIONS_PER_DAY)
      return `You can only log ${MAX_SESSIONS_PER_DAY} sessions a day (${todaysSaved.length} already saved today).`;
    for (const [i, x] of sessions.entries()) {
      if (x.timeOut && x.timeIn && x.timeOut <= x.timeIn) return `Session ${i + 1}: time out must be after time in.`;
      if (x.timeIn && x.timeOut && hoursBetween(x.timeIn, x.timeOut) > MAX_SESSION_HOURS)
        return `Session ${i + 1}: a session can be at most ${MAX_SESSION_HOURS} hours.`;
    }
    if (savedHours + draftHours > MAX_HOURS_PER_DAY) return `That’s more than the ${MAX_HOURS_PER_DAY}-hour daily limit (${savedHours.toFixed(1)}h already saved today).`;
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const v = validateDraft();
    if (v) return setMsg({ ok: false, t: v });
    setBusy(true); setMsg(null);
    try {
      const payload = { sessions: sessions.map(({ id, ...rest }) => rest), km, lat: pos?.lat, lng: pos?.lng, accuracy: pos?.acc };
      const { data } = await api.post("/attendance", payload);
      setMsg({ ok: true, t: `Saved ${data.count} session${data.count > 1 ? "s" : ""}.` });
      setSessions([newSession()]); setKm(""); load();
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

  if (loading) return <LoadingScreen message="Loading your dashboard…" subtitle="Fetching your attendance and reports." />;
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
          <div className="stat"><span>Hours taken</span><b>{monthHours.toFixed(1)}</b></div>
          <div className="stat"><span>Days present</span><b>{days}</b></div>
        </div>

        <form className="panel" onSubmit={submit}>
          <div className="panel-h"><div><h2>New attendance entry</h2>
            <p className="sub">Date is recorded automatically. Up to {MAX_SESSIONS_PER_DAY} sessions ({MAX_HOURS_PER_DAY} hrs) a day — {todaysSaved.length} saved today, {Math.max(0, hoursLeft)}h / {Math.max(0, slotsLeft)} session{slotsLeft === 1 ? "" : "s"} left to add.</p>
          </div></div>
          <div className={`loc ${inside === null ? "" : inside ? "in" : "out"}`}>
            <span className="dot" />
            {locErr || (d === null ? "Finding your location…" : inside ? `You’re at the office (${d} m away).` : `You’re ${d} m from the office. You need to be within ${OFFICE.r} m.`)}
          </div>

          {sessions.map((x, i) => (
            <div className="session" key={x.id}>
              <div className="session-h"><b>Session {i + 1}</b>
                {sessions.length > 1 && <button type="button" className="remove-x" onClick={() => removeSession(x.id)} aria-label={`Remove session ${i + 1}`}>✕</button>}
              </div>
              <div className="grid">
                <div><label>Course code</label><input required value={x.courseCode} onChange={setField(x.id, "courseCode")} /></div>
                <div><label>Time in</label><input type="time" required value={x.timeIn} onChange={setField(x.id, "timeIn")} /></div>
                <div><label>Time out</label><input type="time" required value={x.timeOut} onChange={setField(x.id, "timeOut")} /></div>
                <div><label>Major / Minor</label><select value={x.type} onChange={setField(x.id, "type")}><option>Major</option><option>Minor</option></select></div>
              </div>
              <div className="sect">Bill details (optional)</div>
              <div className="grid">
                <div><label>Unit / topic covered</label><input value={x.topic} onChange={setField(x.id, "topic")} /></div>
                <div><label>Students assigned</label><input type="number" min="0" value={x.studentsAssigned} onChange={setField(x.id, "studentsAssigned")} /></div>
                <div><label>Students attended</label><input type="number" min="0" value={x.studentsAttended} onChange={setField(x.id, "studentsAttended")} /></div>
              </div>
            </div>
          ))}

          <div className="row" style={{ marginBottom: 6 }}>
            <button type="button" className="ghost sm" disabled={slotsLeft <= 0} onClick={addSession}>+ Add another session</button>
            {slotsLeft <= 0 && <span className="cap-note">Daily limit reached.</span>}
          </div>

          <div className="sect">Travel (once per day)</div>
          <div className="grid">
            <div><label>Kilometres travelled today</label><input type="number" min="0" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} />
              <div className="hint">Enter this once a day — conveyance is charged once even with multiple sessions.</div></div>
          </div>

          <div style={{ marginTop: 14 }}><button disabled={busy || !pos}>{busy && <Spinner />}{busy ? "Saving…" : `Save ${sessions.length > 1 ? `${sessions.length} sessions` : "attendance"}`}</button></div>
          {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
        </form>

        <div className="panel">
          <div className="panel-h">
            <div><h2>This month</h2><p className="sub">Your entries so far.</p></div>
            <button type="button" className="ghost" disabled={dl === "current"} onClick={() => download(undefined, "current")}>
              {dl === "current" && <Spinner />}{dl === "current" ? "Preparing…" : "Download Excel + bill"}
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
              {dl === r.month && <Spinner size={12} />}{dl === r.month ? "Preparing…" : r.month}
            </button>))}</div>
            : <div className="empty" style={{ padding: 8, textAlign: "left" }}>Nothing yet. Reports appear here after the first month ends.</div>}
        </div>
      </main>
    </>
  );
}
