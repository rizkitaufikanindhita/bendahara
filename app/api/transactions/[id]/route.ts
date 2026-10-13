import { NextResponse } from "next/server";
import { database, sameOrigin, sessionUser } from "@/lib/server-auth";
import { parseTransaction } from "@/lib/transaction-input";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak valid." }, { status: 403 });
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Data transaksi tidak valid." }, { status: 400 }); }
  const item = parseTransaction(body);
  if (!item) return NextResponse.json({ error: "Isi transaksi tidak valid." }, { status: 400 });
  const result = await database().prepare("UPDATE transactions SET type = ?, date = ?, amount = ?, category = ?, description = ?, note = ? WHERE id = ? AND user_id = ?").bind(item.type, item.date, item.amount, item.category, item.description, item.note, id, user.id).run();
  if (!result.meta.changes) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ transaction: { id, ...item } });
}

export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Asal permintaan tidak valid." }, { status: 403 });
  const user = await sessionUser(request);
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const { id } = await context.params;
  const result = await database().prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  if (!result.meta.changes) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
