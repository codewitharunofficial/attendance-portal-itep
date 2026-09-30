import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/apiError";

export const POST = withErrorHandling(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("token", "", { path: "/", maxAge: 0 });
  return res;
});
