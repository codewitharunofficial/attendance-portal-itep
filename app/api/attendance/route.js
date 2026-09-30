import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { distanceM, todayIST, monthIST } from "@/lib/geo";
import Attendance from "@/models/Attendance";
import { withErrorHandling, unauthorized, badRequest, forbidden } from "@/lib/apiError";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const GET = withErrorHandling(async (req) => {
  const s = await getSession();
  if (!s) throw unauthorized();
  await connectDB();
  const month = new URL(req.url).searchParams.get("month") || monthIST();
  const rows = await Attendance.find({ user: s.id, date: { $regex: `^${month}` } }).sort({ date: -1, timeIn: -1 }).lean();
  return NextResponse.json({ rows, name: s.name, role: s.role });
});

export const POST = withErrorHandling(async (req) => {
  const s = await getSession();
  if (!s) throw unauthorized();
  const { courseCode, timeIn, timeOut, type, lat, lng, accuracy, topic, studentsAssigned, studentsAttended, km } = await req.json();
  const num = (v) => (v === "" || v == null ? undefined : Math.max(0, Number(v) || 0));

  if (!courseCode?.trim() || !["Major", "Minor"].includes(type) || !TIME.test(timeIn) || !TIME.test(timeOut))
    throw badRequest("Fill in course code, times and Major/Minor.");
  if (timeOut <= timeIn) throw badRequest("Time out must be after time in.");
  if (typeof lat !== "number" || typeof lng !== "number") throw badRequest("Location is required to mark attendance.");
  if (accuracy > 100) throw badRequest("GPS signal is too weak. Move near a window and retry.");

  if (!process.env.OFFICE_LAT || !process.env.OFFICE_LNG) throw new Error("OFFICE_LAT/OFFICE_LNG are not configured.");
  const d = distanceM(lat, lng, +process.env.OFFICE_LAT, +process.env.OFFICE_LNG);
  const limit = +process.env.RADIUS_M || 200;
  if (d > limit) throw forbidden(`You are ${Math.round(d)} m from the office. Attendance works within ${limit} m.`);

  await connectDB();
  const doc = await Attendance.create({ user: s.id, date: todayIST(), courseCode, timeIn, timeOut, type, lat, lng, distanceM: Math.round(d),
    topic: (topic || "").trim(), studentsAssigned: num(studentsAssigned), studentsAttended: num(studentsAttended), km: num(km) || 0 });
  return NextResponse.json({ ok: true, id: doc._id });
});
