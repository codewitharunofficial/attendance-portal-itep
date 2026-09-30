import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import User from "@/models/User";
import { withErrorHandling, forbidden, badRequest } from "@/lib/apiError";

const requireAdmin = async () => { if ((await getSession())?.role !== "admin") throw forbidden("Admins only."); };

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  await connectDB();
  const [users, pending] = await Promise.all([
    User.find({ role: "counsellor", status: { $ne: "pending" } }).select("-passwordHash").sort({ name: 1 }).lean(),
    User.find({ status: "pending" }).select("-passwordHash").sort({ createdAt: 1 }).lean(),
  ]);
  return NextResponse.json({ users, pending });
});

export const POST = withErrorHandling(async (req) => {
  await requireAdmin();
  await connectDB();
  const { name, email, password, programme = "", ratePerHourMajor = 0, ratePerHourMinor = 0 } = await req.json();
  if (!name?.trim() || !email?.trim() || (password || "").length < 6)
    throw badRequest("Name, email and a password of 6+ characters are required.");
  await User.create({ name: name.trim(), email, role: "counsellor", programme: programme.trim(), passwordHash: await bcrypt.hash(password, 10),
    ratePerHourMajor: +ratePerHourMajor, ratePerHourMinor: +ratePerHourMinor });
  return NextResponse.json({ ok: true });
});

export const PATCH = withErrorHandling(async (req) => {
  await requireAdmin();
  await connectDB();
  const { id, name, programme, ratePerHourMajor, ratePerHourMinor, password } = await req.json();
  if (!id) throw badRequest("Missing counsellor id.");
  const set = {};
  if (name?.trim()) set.name = name.trim();
  if (programme !== undefined) set.programme = programme.trim();
  if (ratePerHourMajor !== undefined) set.ratePerHourMajor = +ratePerHourMajor;
  if (ratePerHourMinor !== undefined) set.ratePerHourMinor = +ratePerHourMinor;
  if (password) {
    if (password.length < 6) throw badRequest("Password needs 6+ characters.");
    set.passwordHash = await bcrypt.hash(password, 10);
  }
  const r = await User.updateOne({ _id: id, role: "counsellor" }, set);
  if (!r.matchedCount) throw badRequest("Counsellor not found.");
  return NextResponse.json({ ok: true });
});
