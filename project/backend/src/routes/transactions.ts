// routes/transactions.ts
import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { encodeFunctionData } from "viem";
import { 
  CONTRACT_ADDRESSES, 
  ANNOUNCEMENT_LOG_ABI,
  ACKNOWLEDGMENT_LOG_ABI,
  DOCUMENT_REGISTRY_ABI,
  stringToBytes32
} from "../services/blockchain";
import { hashContent } from "../services/hash";

const router = Router();

// Prepare acknowledge transaction (frontend will sign and send)
router.post(
  "/prepare/acknowledge/:id",
  requireRole("STUDENT"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      if (isNaN(id) || id < 0) {
        return res.status(400).json({ error: "Invalid announcement ID" });
      }
      
      const announcementId = BigInt(id);
      
      const data = encodeFunctionData({
        abi: ACKNOWLEDGMENT_LOG_ABI,
        functionName: "acknowledge",
        args: [announcementId],
      });

      res.json({
        to: CONTRACT_ADDRESSES.acknowledgmentLog,
        data: data,
        value: "0x0",
      });
    } catch (error) {
      console.error("Error preparing acknowledge:", error);
      // Correction: Utiliser String(error) pour capturer le message
      res.status(500).json({ error: String(error) || "Failed to prepare transaction" });
    }
  }
);

// Prepare publish announcement transaction
router.post(
  "/prepare/publish",
  requireRole("PROFESSOR"),
  async (req, res) => {
    try {
      const { content, group, category } = req.body;
      
      if (!content || !group || !category) {
        return res.status(400).json({ error: "Missing content, group, or category" });
      }
      
      const contentHash = hashContent(content);
      const groupBytes32 = stringToBytes32(group);
      
      const data = encodeFunctionData({
        abi: ANNOUNCEMENT_LOG_ABI,
        functionName: "publish",
        args: [contentHash, groupBytes32, category],
      });

      res.json({
        to: CONTRACT_ADDRESSES.announcementLog,
        data: data,
        value: "0x0",
        metadata: {
          content,
          group,
          category,
          contentHash
        }
      });
    } catch (error) {
      console.error("Error preparing publish:", error);
      res.status(500).json({ error: String(error) || "Failed to prepare transaction" });
    }
  }
);

// Prepare document registration transaction
router.post(
  "/prepare/document",
  requireRole("PROFESSOR"),
  async (req, res) => {
    try {
      const { fileHash, group, name } = req.body;
      
      if (!fileHash || !group || !name) {
        return res.status(400).json({ error: "Missing fileHash, group, or name" });
      }
      
      const groupBytes32 = stringToBytes32(group);
      
      const data = encodeFunctionData({
        abi: DOCUMENT_REGISTRY_ABI,
        functionName: "register",
        args: [fileHash, groupBytes32, name],
      });

      res.json({
        to: CONTRACT_ADDRESSES.documentRegistry,
        data: data,
        value: "0x0",
      });
    } catch (error) {
      console.error("Error preparing document:", error);
      res.status(500).json({ error: String(error) || "Failed to prepare transaction" });
    }
  }
);

export default router;