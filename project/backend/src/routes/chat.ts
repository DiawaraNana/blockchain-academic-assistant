import { Router } from "express";
import { answerQuestion } from "../services/rag";
import { getWalletGroup } from "../services/blockchain";

const router = Router();

router.post("/", async (req, res) => {
  const { question } = req.body;
  const wallet = req.headers["x-wallet-address"] as `0x${string}`;

  const group = await getWalletGroup(wallet);

  const answer = await answerQuestion(question, group);

  res.json({ answer });
});

export default router;