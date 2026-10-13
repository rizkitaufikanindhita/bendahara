import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  date: text("date").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("transactions_user_date_idx").on(table.userId, table.date)]);
