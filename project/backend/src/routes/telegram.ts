// src/routes/telegram.ts
import { Router, Request, Response } from "express";
import { registerChatId } from "../services/telegram.js";

const router = Router();

// POST /api/telegram/register
// Body: { chatId: "123456789", group: "MF1" }
router.post("/register", (req: Request, res: Response) => {
  const { chatId, group } = req.body;

  if (!chatId || !group) {
    res.status(400).json({ error: "Missing chatId or group" });
    return;
  }

  registerChatId(group, String(chatId));
  res.json({ success: true, message: `Registered for group ${group}` });
});

export default router;