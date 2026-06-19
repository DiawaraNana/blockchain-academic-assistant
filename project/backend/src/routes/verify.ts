import { Router, Request, Response } from "express";
import {
  publicClient,
  CONTRACT_ADDRESSES,
  ANNOUNCEMENT_LOG_ABI,
  DOCUMENT_REGISTRY_ABI,
} from "../services/blockchain";
import { hashContent } from "../services/hash";

const router = Router();

// ── VERIFY ANNOUNCEMENT ─────────────────────────────
router.get(
  "/announcement/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const content = req.query.content;

      if (!Number.isInteger(id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      if (typeof content !== "string") {
        res.status(400).json({ error: "Missing content" });
        return;
      }

      const contentHash = hashContent(content) as `0x${string}`;

      const isValid = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.announcementLog,
        abi: ANNOUNCEMENT_LOG_ABI,
        functionName: "verify",
        args: [BigInt(id), contentHash],
      });

      res.json({
        id,
        valid: isValid,
        hash: contentHash,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Verification failed" });
    }
  }
);

// ── VERIFY DOCUMENT ─────────────────────────────
router.get(
  "/document/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const hash = req.query.hash;

      if (!Number.isInteger(id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      if (typeof hash !== "string" || !hash.startsWith("0x")) {
        res.status(400).json({ error: "Invalid hash" });
        return;
      }

      const isValid = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.documentRegistry,
        abi: DOCUMENT_REGISTRY_ABI,
        functionName: "verify",
        args: [BigInt(id), hash as `0x${string}`],
      });

      res.json({
        id,
        valid: isValid,
        hash,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Verification failed" });
    }
  }
);

export default router;