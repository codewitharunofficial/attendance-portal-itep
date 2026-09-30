import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateMonthly } from "@/lib/monthly";
import { withErrorHandling, forbidden } from "@/lib/apiError";

export const POST = withErrorHandling(async (req) => {
  const s = await getSession();
  if (s?.role !== "admin") throw forbidden("Admins only.");
  await connectDB();
  const { month } = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, ...(await generateMonthly(/^\d{4}-\d{2}$/.test(month) ? month : undefined)) });
});
