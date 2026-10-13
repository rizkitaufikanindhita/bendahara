export type TransactionInput = { type: "income" | "expense"; date: string; amount: number; category: string; description: string; note: string };

const categories = {
  income: ["Iuran", "Donasi", "Penjualan", "Bantuan", "Lainnya"],
  expense: ["Operasional", "Perlengkapan", "Konsumsi", "Transportasi", "Kegiatan", "Lainnya"],
};

export function parseTransaction(value: unknown): TransactionInput | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.type !== "income" && item.type !== "expense") return null;
  if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return null;
  const date = new Date(`${item.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== item.date) return null;
  if (!Number.isSafeInteger(item.amount) || (item.amount as number) <= 0) return null;
  if (typeof item.category !== "string" || !categories[item.type].includes(item.category)) return null;
  if (typeof item.description !== "string" || !item.description.trim() || item.description.trim().length > 100) return null;
  if (typeof item.note !== "string" || item.note.length > 300) return null;
  return { type: item.type, date: item.date, amount: item.amount as number, category: item.category, description: item.description.trim(), note: item.note.trim() };
}
