import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  return NextResponse.json({ user });
}
