// src/services/telegram.ts
import dotenv from "dotenv";
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory map: group name -> array of chat IDs
const subscribers: Map<string, string[]> = new Map();

// ─────────────────────────────────────────────
// REGISTER a chat ID for a group
// ─────────────────────────────────────────────
export function registerChatId(group: string, chatId: string): void {
  const list = subscribers.get(group) ?? [];
  if (!list.includes(chatId)) {
    list.push(chatId);
    subscribers.set(group, list);
  }
  console.log(`[Telegram] Registered chatId ${chatId} for group ${group}`);
}

// ─────────────────────────────────────────────
// SEND a message to one chat ID
// ─────────────────────────────────────────────
async function sendMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("[Telegram] sendMessage error:", err);
  }
}

// ─────────────────────────────────────────────
// NOTIFY all students in a group (or ALL groups)
// ─────────────────────────────────────────────
export async function notifyGroup(
  group: string,   // "MF1", "MF2", or "all"
  message: string
): Promise<void> {
  if (!BOT_TOKEN) return;

  if (group === "all") {
    // broadcast to every subscriber
    for (const chatIds of subscribers.values()) {
      for (const chatId of chatIds) await sendMessage(chatId, message);
    }
  } else {
    const chatIds = subscribers.get(group) ?? [];
    for (const chatId of chatIds) await sendMessage(chatId, message);
    // also notify subscribers registered for "all"
    const allIds = subscribers.get("all") ?? [];
    for (const chatId of allIds) await sendMessage(chatId, message);
  }
}

// ─────────────────────────────────────────────
// NOTIFY professor (single chat ID from .env)
// ─────────────────────────────────────────────
export async function notifyProfessor(message: string): Promise<void> {
  const chatId = process.env.TELEGRAM_PROFESSOR_CHAT_ID;
  if (!BOT_TOKEN || !chatId) return;
  await sendMessage(chatId, message);
}