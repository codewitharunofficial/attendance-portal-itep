import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { distanceM, todayIST, monthIST } from "@/lib/geo";
import { hoursBetween } from "@/lib/time";
import { MAX_SESSION_HOURS, MAX_SESSIONS_PER_DAY, MAX_HOURS_PER_DAY } from "@/lib/constants";
import Attendance from "@/models/Attendance";
import { withErrorHandling, unauthorized, badRequest, forbidden } from "@/lib/apiError";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EPS = 0.001; // float slack for the 2h/6h checks

export const GET = withErrorHandling(async (req) => {
  const s = await getSession();
  if (!s) throw unauthorized();
  await connectDB();
  const month = new URL(req.url).searchParams.get("month") || monthIST();
  const rows = await Attendance.find({ user: s.id, date: { $regex: `^${month}` } }).sort({ date: -1, timeIn: -1 }).lean();
  return NextResponse.json({ rows, name: s.name, role: s.role });
});

// Body: { sessions: [{courseCode,timeIn,timeOut,type,topic?,studentsAssigned?,studentsAttended?,km?}, ...], lat, lng, accuracy }
// A counsellor can log up to MAX_SESSIONS_PER_DAY sessions (MAX_HOURS_PER_DAY hours total) per day,
// checked against sessions in THIS request plus any already saved earlier today.
export const POST = withErrorHandling(async (req) => {
  const s = await getSession();
  if (!s) throw unauthorized();
  const { sessions, km, lat, lng, accuracy } = await req.json();
  const num = (v) => (v === "" || v == null ? undefined : Math.max(0, Number(v) || 0));

  if (!Array.isArray(sessions) || !sessions.length) throw badRequest("Add at least one session.");
  if (sessions.length > MAX_SESSIONS_PER_DAY) throw badRequest(`You can log at most ${MAX_SESSIONS_PER_DAY} sessions a day.`);

  let newHours = 0;
  const clean = sessions.map((sess, i) => {
    const { courseCode, timeIn, timeOut, type, topic, studentsAssigned, studentsAttended } = sess || {};
    const n = i + 1;
    if (!courseCode?.trim() || !["Major", "Minor"].includes(type) || !TIME.test(timeIn) || !TIME.test(timeOut))
      throw badRequest(`Session ${n}: fill in course code, times and Major/Minor.`);
    if (timeOut <= timeIn) throw badRequest(`Session ${n}: time out must be after time in.`);
    const hrs = hoursBetween(timeIn, timeOut);
    if (hrs > MAX_SESSION_HOURS + EPS) throw badRequest(`Session ${n}: a single session can be at most ${MAX_SESSION_HOURS} hours.`);
    newHours += hrs;
    return { courseCode: courseCode.trim(), timeIn, timeOut, type, topic: (topic || "").trim(),
      studentsAssigned: num(studentsAssigned), studentsAttended: num(studentsAttended) };
  });

  const sorted = [...clean].sort((a, b) => a.timeIn.localeCompare(b.timeIn));
  for (let i = 1; i < sorted.length; i++) if (sorted[i].timeIn < sorted[i - 1].timeOut) throw badRequest("Sessions can't overlap each other.");

  if (typeof lat !== "number" || typeof lng !== "number") throw badRequest("Location is required to mark attendance.");
  if (accuracy > 100) throw badRequest("GPS signal is too weak. Move near a window and retry.");
  if (!process.env.OFFICE_LAT || !process.env.OFFICE_LNG) throw new Error("OFFICE_LAT/OFFICE_LNG are not configured.");
  const d = distanceM(lat, lng, +process.env.OFFICE_LAT, +process.env.OFFICE_LNG);
  const limit = +process.env.RADIUS_M || 200;
  if (d > limit) throw forbidden(`You are ${Math.round(d)} m from the office. Attendance works within ${limit} m.`);

  await connectDB();
  const date = todayIST();
  const existing = await Attendance.find({ user: s.id, date }).lean();
  if (existing.length + clean.length > MAX_SESSIONS_PER_DAY)
    throw badRequest(`You've already logged ${existing.length} session(s) today. Up to ${MAX_SESSIONS_PER_DAY} a day are allowed.`);
  const existingHours = existing.reduce((sum, e) => sum + hoursBetween(e.timeIn, e.timeOut), 0);
  if (existingHours + newHours > MAX_HOURS_PER_DAY + EPS)
    throw badRequest(`That would put you over the ${MAX_HOURS_PER_DAY}-hour daily limit (you've logged ${existingHours.toFixed(1)}h today).`);
  for (const e of existing) for (const n of clean)
    if (n.timeIn < e.timeOut && e.timeIn < n.timeOut) throw badRequest("One of these sessions overlaps with one you already logged today.");

  // km is entered once for the whole day (conveyance is one trip, not per session) — the same
  // value is stamped on every session saved in this request; lib/bill.js takes the max per date
  // as a safety net in case older data or a separate same-day submission has a different value.
  const dayKm = num(km) || 0;
  const docs = await Attendance.insertMany(clean.map((c) => ({ ...c, km: dayKm, user: s.id, date, lat, lng, distanceM: Math.round(d) })));
  return NextResponse.json({ ok: true, count: docs.length });
});
