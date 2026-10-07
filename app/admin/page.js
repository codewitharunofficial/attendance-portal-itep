"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Nav from "../components/Nav";
import LoadingScreen, { Spinner } from "../components/LoadingScreen";
import { api, getErrorMessage, downloadFile } from "@/lib/api-client";

const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const blank = { name: "", email: "", password: "", programme: "", ratePerHourMajor: "", ratePerHourMinor: "" };

export default function Admin() {
  const router = useRouter();
  const [users, setUsers] = useState([]), [pending, setPending] = useState([]);
  const [f, setF] = useState(blank), [month, setMonth] = useState(thisMonth());
  const [msg, setMsg] = useState(null), [edit, setEdit] = useState({}), [rates, setRates] = useState({});
  const [loadErr, setLoadErr] = useState(""), [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(null); // `${userId}:excel` or `${userId}:schedule` while a download is in flight

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users); setPending(data.pending);
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) return router.push("/dashboard");
      setLoadErr(await getErrorMessage(err));
    } finally { setLoading(false); }
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const say = (ok, t) => setMsg({ ok, t });
  async function call(url, method, body) {
    try { const { data } = await api.request({ url, method, data: body }); return { ok: true, j: data }; }
    catch (err) { return { ok: false, j: { error: await getErrorMessage(err) } }; }
  }
  async function add(e) {
    e.preventDefault();
    const { ok, j } = await call("/admin/users", "post", f);
    if (ok) { say(true, "Counsellor added."); setF(blank); load(); } else say(false, j.error);
  }
  async function save(u) {
    const { ok, j } = await call("/admin/users", "patch", { id: u._id, ...edit[u._id] });
    if (ok) { say(true, `Saved ${u.name}.`); setEdit({ ...edit, [u._id]: undefined }); load(); } else say(false, j.error);
  }
  async function decide(u, action) {
    if (action === "reject" && !confirm(`Reject ${u.name}’s request? Their sign-up will be removed.`)) return;
    const rt = rates[u._id] || {};
    const { ok, j } = await call("/admin/requests", "post", { id: u._id, action, ratePerHourMajor: rt.major, ratePerHourMinor: rt.minor });
    if (ok) { say(true, action === "approve" ? `${u.name} approved as ${u.role}.` : "Request rejected."); load(); } else say(false, j.error);
  }
  async function generate() {
    const { ok, j } = await call("/admin/generate", "post", { month });
    ok ? say(true, `Built ${j.generated} report(s) for ${j.month}.`) : say(false, j.error);
  }
  async function download(u, kind) {
    const key = `${u._id}:${kind}`;
    setDl(key); setMsg(null);
    try {
      if (kind === "excel") await downloadFile("/reports", { userId: u._id, month });
      else await downloadFile("/admin/schedule", { userId: u._id, month });
    } catch (err) { say(false, await getErrorMessage(err)); }
    finally { setDl(null); }
  }
  const val = (u, k) => edit[u._id]?.[k] ?? u[k] ?? "";
  const set = (u, k, v) => setEdit({ ...edit, [u._id]: { ...edit[u._id], [k]: v } });
  const setRate = (u, k, v) => setRates({ ...rates, [u._id]: { ...rates[u._id], [k]: v } });
  async function logout() {
    try { await api.post("/auth/logout"); } catch { /* still leave, even if this call fails */ }
    router.push("/");
  }

  if (loading) return <LoadingScreen message="Loading the admin panel…" subtitle="Fetching counsellors and requests." />;
  if (loadErr) return (
    <main><div className="panel" style={{ textAlign: "center" }}>
      <h2>Couldn’t load the admin panel</h2><p className="sub" style={{ margin: "8px 0 18px" }}>{loadErr}</p>
      <button onClick={load}>Retry</button>
    </div></main>
  );

  return (
    <>
      <Nav name="Admin" role="admin" onLogout={logout} />
      <main>
        <div className="hello"><h1>Admin</h1><p>Approve access, manage counsellors and pull reports.</p></div>
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`} style={{ margin: "0 0 18px" }}>{msg.t}</div>}

        {pending.length > 0 && (
          <div className="panel req">
            <div className="panel-h"><div><h2>Sign-up requests<span className="count">{pending.length}</span></h2>
              <p className="sub">Approve to let them sign in. Admin requests give full access, so check them carefully.</p></div></div>
            <div className="scroll"><table>
              <thead><tr><th>Name</th><th>Email</th><th>Wants to be</th><th>Programme</th><th>Major / hr</th><th>Minor / hr</th><th></th></tr></thead>
              <tbody>{pending.map((u) => (
                <tr key={u._id}>
                  <td><b>{u.name}</b></td><td>{u.email}</td>
                  <td><span className={`badge ${u.role === "admin" ? "minor" : "major"}`}>{u.role}</span></td>
                  <td>{u.programme || "—"}</td>
                  {u.role === "counsellor" ? <>
                    <td><input type="number" min="0" style={{ width: 90 }} placeholder="0" onChange={(e) => setRate(u, "major", e.target.value)} /></td>
                    <td><input type="number" min="0" style={{ width: 90 }} placeholder="0" onChange={(e) => setRate(u, "minor", e.target.value)} /></td>
                  </> : <><td>—</td><td>—</td></>}
                  <td><div className="row"><button className="sm" onClick={() => decide(u, "approve")}>Approve</button><button className="danger sm" onClick={() => decide(u, "reject")}>Reject</button></div></td>
                </tr>))}
              </tbody>
            </table></div>
          </div>
        )}

        <form className="panel" onSubmit={add}>
          <div className="panel-h"><div><h2>Add counsellor directly</h2><p className="sub">Skips the request step.</p></div></div>
          <div className="grid">
            <div><label>Name</label><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><label>Email</label><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label>Temporary password</label><input required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            <div><label>Programme</label><input placeholder="e.g. Mathematics (BSC BED)" value={f.programme} onChange={(e) => setF({ ...f, programme: e.target.value })} /></div>
            <div><label>Major rate / hr</label><input type="number" min="0" value={f.ratePerHourMajor} onChange={(e) => setF({ ...f, ratePerHourMajor: e.target.value })} /></div>
            <div><label>Minor rate / hr</label><input type="number" min="0" value={f.ratePerHourMinor} onChange={(e) => setF({ ...f, ratePerHourMinor: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 18 }}><button>Add counsellor</button></div>
        </form>

        <div className="panel">
          <div className="panel-h">
            <div><h2>Counsellors</h2><p className="sub">Edit rates inline, then save the row. Excel is the bill; Schedule is the finance-ready Approved Schedule, built from the same month’s attendance.</p></div>
            <div className="row">
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 165 }} />
              <button type="button" className="ghost" onClick={generate}>Build reports for month</button>
            </div>
          </div>
          <div className="scroll"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Programme</th><th>Major / hr</th><th>Minor / hr</th><th>New password</th><th>Reports for {month}</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><input value={val(u, "name")} onChange={(e) => set(u, "name", e.target.value)} /></td>
                  <td>{u.email}</td>
                  <td><input value={val(u, "programme")} onChange={(e) => set(u, "programme", e.target.value)} /></td>
                  <td><input type="number" style={{ width: 90 }} value={val(u, "ratePerHourMajor")} onChange={(e) => set(u, "ratePerHourMajor", e.target.value)} /></td>
                  <td><input type="number" style={{ width: 90 }} value={val(u, "ratePerHourMinor")} onChange={(e) => set(u, "ratePerHourMinor", e.target.value)} /></td>
                  <td><input placeholder="leave blank to keep" value={edit[u._id]?.password ?? ""} onChange={(e) => set(u, "password", e.target.value)} /></td>
                  <td><div className="row">
                    <button type="button" className="sm" disabled={!edit[u._id]} onClick={() => save(u)}>Save</button>
                    <button type="button" className="ghost sm" disabled={dl === `${u._id}:excel`} onClick={() => download(u, "excel")}>
                      {dl === `${u._id}:excel` && <Spinner size={12} />}{dl === `${u._id}:excel` ? "Preparing…" : "Excel"}
                    </button>
                    <button type="button" className="ghost sm" disabled={dl === `${u._id}:schedule`} onClick={() => download(u, "schedule")}>
                      {dl === `${u._id}:schedule` && <Spinner size={12} />}{dl === `${u._id}:schedule` ? "Preparing…" : "Schedule"}
                    </button>
                  </div></td>
                </tr>))}
              {!users.length && <tr><td colSpan="7" className="empty">No counsellors yet. Approve a request or add one above.</td></tr>}
            </tbody>
          </table></div>
        </div>
      </main>
    </>
  );
}
