import { NextResponse } from "next/server";
import { database, sameOrigin, sessionUser } from "@/lib/server-auth";
import { parseTransaction } from "@/lib/transaction-input";

export async function GET(request: Request) {
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const result = await database().prepare("SELECT id, type, date, amount, category, description, note, created_at AS createdAt FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC").bind(user.id).all();
  return NextResponse.json({ transactions: result.results });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak valid." }, { status: 403 });
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data transaksi tidak valid." }, { status: 400 }); }
  const item = parseTransaction(body);
  if (!item) return NextResponse.json({ error: "Isi transaksi tidak valid." }, { status: 400 });
  const id = crypto.randomUUID(); const createdAt = Date.now();
  await database().prepare("INSERT INTO transactions (id, user_id, type, date, amount, category, description, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, user.id, item.type, item.date, item.amount, item.category, item.description, item.note, createdAt).run();
  return NextResponse.json({ transaction: { id, ...item, createdAt } }, { status: 201 });
}
