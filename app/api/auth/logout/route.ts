import { NextResponse } from "next/server";
import { clearSessionCookie, sameOrigin } from "@/lib/server-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak valid." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie(request));
  return response;
}
