"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "./components/AuthShell";
import { api, getErrorMessage } from "@/lib/api-client";

export default function Login() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const { data } = await api.post("/auth/login", f);
      localStorage.setItem("user", data?.name ? data?.name : "Arun")
      router.push(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setErr(await getErrorMessage(err));
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <h2>Welcome back</h2>
      <p className="sub" style={{ marginBottom: 22 }}>Sign in to mark today’s sessions.</p>
      <form onSubmit={submit}>
        <div><label>Email</label><input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label>Password</label><input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <button className="full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {err && <div className="msg err">{err}</div>}
      </form>
      <p className="switch">New here? <Link href="/signup">Request an account</Link></p>
    </AuthShell>
  );
}
