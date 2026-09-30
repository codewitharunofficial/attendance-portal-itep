import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/auth";
import User from "@/models/User";
import { withErrorHandling, unauthorized, forbidden, badRequest } from "@/lib/apiError";

export const POST = withErrorHandling(async (req) => {
  const { email, password } = await req.json();
  if (!email || !password) throw badRequest("Enter your email and password.");

  await connectDB();
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw unauthorized("Wrong email or password.");
  if ((user.status || "active") === "pending") throw forbidden("Your request is still waiting for admin approval.");

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set("token", await signToken({ id: String(user._id), name: user.name, role: user.role }),
    { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
  return res;
});
