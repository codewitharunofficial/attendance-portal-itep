import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
export async function getSession() {
  const t = cookies().get("token")?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key())).payload; } catch { return null; }
}
