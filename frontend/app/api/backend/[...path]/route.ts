import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.API_URL || "http://backend:8000";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${BACKEND_URL.replace(/\/+$/, "")}/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  let userEmail = "anonymous";

  // CRITICAL SECURITY: Verify session server-side for non-admin routes
  if (!path.startsWith("admin/")) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userEmail = session.user.email;
  }

  req.headers.forEach((value, key) => {
    // Strip user-injected email or authorization headers to prevent spoofing
    if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection" && key.toLowerCase() !== "x-user-email" && key.toLowerCase() !== "authorization") {
      headers.set(key, value);
    }
  });
  
  // Inject the cryptographically verified JWT token
  const secret = process.env.JWT_SECRET || "fallback_secret_123";
  const token = jwt.sign({ email: userEmail }, secret, { algorithm: "HS256" });
  headers.set("Authorization", `Bearer ${token}`);

  try {
    const init: RequestInit = {
      method: req.method,
      headers,
      cache: "no-store",
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.body;
      // @ts-ignore - duplex is required for Node.js fetch with ReadableStream body
      init.duplex = "half";
    }

    const response = await fetch(url, init);
    
    // Copy response headers
    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
        resHeaders.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (error) {
    console.error("Proxy error for URL", url, error);
    return NextResponse.json({ error: "Proxy failed to reach backend" }, { status: 502 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
