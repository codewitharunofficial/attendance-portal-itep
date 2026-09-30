import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { withErrorHandling, badRequest, conflict } from "@/lib/apiError";

// Sign-up creates a PENDING account that an existing admin must approve.
// Bootstrap: if the database has no admin yet, a sign-up as admin is activated immediately.
export const POST = withErrorHandling(async (req) => {
  const { name, email, password, programme = "", role } = await req.json();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || (password || "").length < 6 || !["counsellor", "admin"].includes(role))
    throw badRequest("Enter your name, a valid email, a role and a password of 6+ characters.");

  await connectDB();
  const adminExists = await User.exists({ role: "admin", status: { $ne: "pending" } });
  const status = !adminExists && role === "admin" ? "active" : "pending";
  try {
    await User.create({ name: name.trim(), email, role, status, programme: programme.trim(), passwordHash: await bcrypt.hash(password, 10) });
  } catch (e) {
    if (e.code === 11000) throw conflict("That email is already registered.");
    throw e;
  }
  return NextResponse.json({ ok: true, status });
});
