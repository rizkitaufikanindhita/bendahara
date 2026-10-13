import { NextResponse } from "next/server";
import { createSession, sameOrigin, sessionCookie, verifyLogin } from "@/lib/server-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak valid." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data login tidak valid." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Data login tidak valid." }, { status: 400 });
  const { username, password } = body as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string" || username.length > 50 || password.length > 200) return NextResponse.json({ error: "Data login tidak valid." }, { status: 400 });
  const user = await verifyLogin(username.trim(), password);
  if (!user) return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  const response = NextResponse.json({ user });
  response.headers.set("Set-Cookie", sessionCookie(await createSession(user.id), request));
  return response;
}
