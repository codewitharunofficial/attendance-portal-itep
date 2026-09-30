import { prevMonth } from "./geo";
import { buildWorkbook } from "./report";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Report from "@/models/Report";

export async function generateMonthly(month = prevMonth()) {
  const users = await User.find({ role: "counsellor", status: { $ne: "pending" } }).lean();
  for (const u of users) {
    const entries = await Attendance.find({ user: u._id, date: { $regex: `^${month}` } }).sort({ date: 1, timeIn: 1 }).lean();
    await Report.findOneAndUpdate({ user: u._id, month }, { file: await buildWorkbook(u, month, entries) }, { upsert: true });
  }
  return { month, generated: users.length };
}
