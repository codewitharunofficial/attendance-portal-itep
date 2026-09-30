import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { monthIST } from "@/lib/geo";
import { buildWorkbook } from "@/lib/report";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Report from "@/models/Report";
import { withErrorHandling, unauthorized, notFound } from "@/lib/apiError";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const send = (buf, name) => new NextResponse(buf, { headers: { "Content-Type": XLSX, "Content-Disposition": `attachment; filename="${name}"` } });

// GET /api/reports?list=1            -> stored monthly reports
// GET /api/reports?month=YYYY-MM     -> generate on demand (defaults to current month)
// GET /api/reports?stored=YYYY-MM    -> download stored report
// Admins may add &userId=<id>
export const GET = withErrorHandling(async (req) => {
  const s = await getSession();
  if (!s) throw unauthorized();
  await connectDB();
  const q = new URL(req.url).searchParams;
  const uid = s.role === "admin" && q.get("userId") ? q.get("userId") : s.id;

  if (q.get("list")) {
    const reports = await Report.find({ user: uid }).select("month createdAt").sort({ month: -1 }).lean();
    return NextResponse.json({ reports });
  }
  if (q.get("stored")) {
    const r = await Report.findOne({ user: uid, month: q.get("stored") });
    if (!r) throw notFound("No report has been generated for that month yet.");
    return send(r.file, `attendance-${r.month}.xlsx`);
  }
  const month = q.get("month") || monthIST();
  const user = await User.findById(uid).lean();
  if (!user) throw notFound("Counsellor not found.");
  const entries = await Attendance.find({ user: uid, date: { $regex: `^${month}` } }).sort({ date: 1, timeIn: 1 }).lean();
  return send(await buildWorkbook(user, month, entries), `attendance-${month}.xlsx`);
});
