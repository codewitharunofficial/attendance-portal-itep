import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
export async function middleware(req) {
  const t = req.cookies.get("token")?.value;
  try { await jwtVerify(t, new TextEncoder().encode(process.env.JWT_SECRET)); return NextResponse.next(); }
  catch { return NextResponse.redirect(new URL("/", req.url)); }
}
export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
