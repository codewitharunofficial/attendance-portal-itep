import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { generateMonthly } from "@/lib/monthly";
import { withErrorHandling, unauthorized } from "@/lib/apiError";

// Runs on the 1st of each month (see vercel.json). Manual: curl -H "Authorization: Bearer $CRON_SECRET" <site>/api/cron/monthly
export const GET = withErrorHandling(async (req) => {
  if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET is not configured.");
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) throw unauthorized("Unauthorized.");
  await connectDB();
  return NextResponse.json({ ok: true, ...(await generateMonthly()) });
});
