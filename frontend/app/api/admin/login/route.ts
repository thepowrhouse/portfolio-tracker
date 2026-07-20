import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "secret123";

    if (password === adminPassword) {
      console.log("Login successful, setting admin_token cookie...");
      cookies().set("admin_token", adminPassword, {
        httpOnly: true,
        secure: request.headers.get("x-forwarded-proto") === "https" || request.url.startsWith("https://"),
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });
      return NextResponse.json({ success: true });
    }
    
    console.log("Login failed: password mismatch");

    return NextResponse.json({ success: false, message: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
