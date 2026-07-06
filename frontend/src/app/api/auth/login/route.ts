import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch("http://localhost:8000/api/v1/auth/login/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Login proxy error:", err);
    return NextResponse.json(
      { detail: "Cannot reach backend. Make sure the backend is running on port 8000." },
      { status: 503 }
    );
  }
}
