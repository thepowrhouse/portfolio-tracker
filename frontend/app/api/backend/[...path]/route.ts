import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.API_URL || "http://backend:8000";

async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${BACKEND_URL.replace(/\/+$/, "")}/${path}${req.nextUrl.search}`;
  
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host" && key.toLowerCase() !== "connection") {
      headers.set(key, value);
    }
  });

  try {
    const init: RequestInit = {
      method: req.method,
      headers,
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
