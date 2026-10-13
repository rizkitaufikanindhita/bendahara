import { env } from "cloudflare:workers";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "bendahara_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export function database(): D1Database {
  if (!env.DB) throw new Error("Binding SQLite DB belum tersedia.");
  return env.DB;
}

function secret(): string {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET belum dikonfigurasi.");
  return env.SESSION_SECRET;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

async function signingKey() {
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSession(userId: string): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ id: userId, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(payload)));
  return `${payload}.${base64url(signature)}`;
}

export async function sessionUser(request: Request): Promise<{ id: string; username: string } | null> {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const valid = await crypto.subtle.verify("HMAC", await signingKey(), fromBase64url(signature), encoder.encode(payload));
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
    if (typeof parsed.id !== "string" || !Number.isSafeInteger(parsed.exp) || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    const user = await database().prepare("SELECT id, username FROM users WHERE id = ?").bind(parsed.id).first<{ id: string; username: string }>();
    return user ?? null;
  } catch { return null; }
}

export function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export async function verifyLogin(username: string, password: string): Promise<{ id: string; username: string } | null> {
  const db = database();
  let user = await db.prepare("SELECT id, username, password_hash AS passwordHash FROM users WHERE username = ?").bind(username).first<{ id: string; username: string; passwordHash: string }>();
  if (!user && username === "admin") {
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
    if (count?.total === 0) {
      const passwordHash = await bcrypt.hash("admin", 12);
      await db.prepare("INSERT OR IGNORE INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), "admin", passwordHash, Date.now()).run();
      user = await db.prepare("SELECT id, username, password_hash AS passwordHash FROM users WHERE username = ?").bind("admin").first<{ id: string; username: string; passwordHash: string }>();
    }
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { id: user.id, username: user.username };
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
