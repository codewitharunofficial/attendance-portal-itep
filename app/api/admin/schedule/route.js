import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import { buildScheduleRows } from "@/lib/schedule";
import { buildScheduleDoc } from "@/lib/scheduleDoc";
import { withErrorHandling, forbidden, badRequest, notFound } from "@/lib/apiError";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// GET /api/admin/schedule?userId=<id>&month=YYYY-MM
export const GET = withErrorHandling(async (req) => {
  if ((await getSession())?.role !== "admin") throw forbidden("Admins only.");
  const q = new URL(req.url).searchParams;
  const userId = q.get("userId"), month = q.get("month");
  if (!userId || !/^\d{4}-\d{2}$/.test(month || "")) throw badRequest("Pick a counsellor and a month.");

  await connectDB();
  const user = await User.findOne({ _id: userId, role: "counsellor" }).lean();
  if (!user) throw notFound("Counsellor not found.");
  const entries = await Attendance.find({ user: userId, date: { $regex: `^${month}` } }).sort({ date: 1, timeIn: 1 }).lean();
  if (!entries.length) throw notFound("No attendance recorded for that counsellor in that month.");

  const { rows, periodFrom, periodTo } = buildScheduleRows(entries);
  const buf = await buildScheduleDoc(user, rows, periodFrom, periodTo);
  const filename = `approved-schedule-${user.name.replace(/\s+/g, "-")}-${month}.docx`;
  return new NextResponse(buf, { headers: { "Content-Type": DOCX, "Content-Disposition": `attachment; filename="${filename}"` } });
});
