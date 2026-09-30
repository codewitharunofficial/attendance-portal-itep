"use client";
import { useState } from "react";
import Link from "next/link";
import AuthShell from "../components/AuthShell";
import { api, getErrorMessage } from "@/lib/api-client";

export default function Signup() {
  const [f, setF] = useState({ name: "", email: "", password: "", programme: "", role: "counsellor" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const { data } = await api.post("/auth/signup", f);
      setDone(data.status);
    } catch (err) {
      setErr(await getErrorMessage(err));
    } finally { setBusy(false); }
  }
  if (done) return (
    <AuthShell><div className="done">
      <div className="tick">✓</div>
      <h2>{done === "active" ? "Admin account created" : "Request sent"}</h2>
      <p className="sub" style={{ margin: "8px 0 20px" }}>{done === "active"
        ? "No admin existed yet, so you’re the first one. You can sign in now."
        : "An admin needs to approve your account. You’ll be able to sign in once they do."}</p>
      <Link href="/"><button>Go to sign in</button></Link>
    </div></AuthShell>
  );
  return (
    <AuthShell>
      <h2>Request an account</h2>
      <p className="sub" style={{ marginBottom: 22 }}>An admin reviews every request before you can sign in.</p>
      <form onSubmit={submit}>
        <div><label>Full name</label><input required value={f.name} onChange={set("name")} /></div>
        <div><label>Email</label><input type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></div>
        <div><label>Password</label><input type="password" required minLength={6} autoComplete="new-password" value={f.password} onChange={set("password")} />
          <div className="hint">At least 6 characters.</div></div>
        <div><label>Sign up as</label>
          <select value={f.role} onChange={set("role")}><option value="counsellor">Counsellor</option><option value="admin">Admin</option></select></div>
        {f.role === "counsellor" && <div><label>Programme</label><input placeholder="e.g. Mathematics (BSC BED)" value={f.programme} onChange={set("programme")} /></div>}
        <button className="full" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
        {err && <div className="msg err">{err}</div>}
      </form>
      <p className="switch">Already approved? <Link href="/">Sign in</Link></p>
    </AuthShell>
  );
}
