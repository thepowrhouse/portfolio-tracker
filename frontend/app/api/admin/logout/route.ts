import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  cookies().delete("admin_token");
  const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return NextResponse.redirect(new URL("/admin/login", origin));
}
