// routes/acknowledge.ts
import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/auth";
import { notifyProfessor } from "../services/telegram.js";
import {
  publicClient,
  CONTRACT_ADDRESSES,
  ACKNOWLEDGMENT_LOG_ABI,
} from "../services/blockchain";

const router = Router();

// ─────────────────────────────────────────────
// CHECK ACKNOWLEDGEMENT STATUS
// ─────────────────────────────────────────────
router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const wallet = req.headers["x-wallet-address"];

    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    if (typeof wallet !== "string" || !wallet.startsWith("0x")) {
      res.status(400).json({ error: "Invalid wallet" });
      return;
    }

    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.acknowledgmentLog,
      abi: ACKNOWLEDGMENT_LOG_ABI,
      functionName: "hasAcknowledged",
      args: [BigInt(id), wallet as `0x${string}`],
    });

    res.json({ acknowledged: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed check" });
  }
});

// ─────────────────────────────────────────────
// CONFIRM TRANSACTION (MetaMask signed on frontend)
// ─────────────────────────────────────────────
router.post(
  "/:id",
  requireRole("STUDENT"),
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { txHash } = req.body;
      const wallet = req.headers["x-wallet-address"] as string;

      if (!Number.isInteger(id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      if (typeof txHash !== "string" || !txHash.startsWith("0x")) {
        res.status(400).json({ error: "Missing txHash" });
        return;
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      // Notify professor BEFORE sending response
      await notifyProfessor(
        `✅ *Acknowledgment received*\nAnnouncement ID: ${id}\nStudent: \`${wallet}\``
      );

      res.json({
        success: true,
        txHash,
        block: Number(receipt.blockNumber),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Tx failed" });
    }
  }
);

// ─────────────────────────────────────────────
// LIST ALL ACKNOWLEDGEMENTS
// ─────────────────────────────────────────────
router.get("/:id/list", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const list = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.acknowledgmentLog,
      abi: ACKNOWLEDGMENT_LOG_ABI,
      functionName: "getAcknowledgers",
      args: [BigInt(id)],
    });

    res.json({ list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
