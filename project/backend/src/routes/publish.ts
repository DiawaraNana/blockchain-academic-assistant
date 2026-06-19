// routes/publish.ts
import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { saveAnnouncementContent } from "../services/storage";
import { notifyGroup } from "../services/telegram.js";
import { 
  publicClient, 
  CONTRACT_ADDRESSES, 
  ANNOUNCEMENT_LOG_ABI,
  DOCUMENT_REGISTRY_ABI,
  encodePublishTransaction,
  encodeDocumentRegistrationTransaction,
  GROUP_ALL
} from "../services/blockchain";
import { hashContent, hashBuffer } from "../services/hash";
import { addToStore, addDocumentToStore } from "../services/rag";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─────────────────────────────────────────────
// STEP 1: PREPARE ANNOUNCEMENT TRANSACTION
// ─────────────────────────────────────────────
router.post(
  "/prepare/announcement",
  requireRole("PROFESSOR"),
  async (req, res) => {
    try {
      const { content, category, group } = req.body;

      if (!content || !category || !group) {
        return res.status(400).json({ error: "Missing fields: content, category, group" });
      }

      const contentHash = hashContent(content);
      const data = encodePublishTransaction(contentHash, group, category);

      res.json({
        to: CONTRACT_ADDRESSES.announcementLog,
        data: data,
        value: "0x0",
        metadata: { content, category, group, contentHash }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to prepare announcement" });
    }
  }
);

// ─────────────────────────────────────────────
// STEP 2: CONFIRM ANNOUNCEMENT
// ─────────────────────────────────────────────
router.post(
  "/confirm/announcement",
  requireRole("PROFESSOR"),
  async (req, res) => {
    try {
      const { txHash, content, category, group } = req.body;

      if (!txHash || !content) {
        return res.status(400).json({ error: "Missing txHash or content" });
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });

      const logs = await publicClient.getContractEvents({
        address: CONTRACT_ADDRESSES.announcementLog,
        abi: ANNOUNCEMENT_LOG_ABI,
        eventName: "AnnouncementPublished",
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      let announcementId = 0;
      if (logs && logs.length > 0) {
        announcementId = Number((logs[0] as any).args.id);
      } else {
        const count = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.announcementLog,
          abi: ANNOUNCEMENT_LOG_ABI,
          functionName: "count",
          args: [],
        }) as bigint;
        announcementId = Number(count) - 1;
      }

      // ALWAYS save content
      saveAnnouncementContent(announcementId, content);

      // Index in RAG
      await addToStore({
        id: announcementId,
        text: content,
        group: group || GROUP_ALL,
        category: category || "general",
      });

      // Notify students via Telegram
      await notifyGroup(
        group || "all",
        `📢 *New announcement*\n*Category:* ${category}\n*Group:* ${group || "all"}\n\n${content.slice(0, 200)}`
      );

      res.json({
        success: true,
        announcementId: announcementId,
        txHash: txHash,
        blockNumber: Number(receipt.blockNumber)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to confirm announcement" });
    }
  }
);

// ─────────────────────────────────────────────
// STEP 1: PREPARE DOCUMENT TRANSACTION
// ─────────────────────────────────────────────
router.post(
  "/prepare/document",
  requireRole("PROFESSOR"),
  upload.single("file"),
  async (req, res) => {
    try {
      const { group, name } = req.body;
      const file = req.file;

      if (!file || !group || !name) {
        return res.status(400).json({ error: "Missing file or metadata" });
      }

      const fileHash = hashBuffer(file.buffer);
      const data = encodeDocumentRegistrationTransaction(fileHash, group, name);

      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, `${fileHash}.pdf`);
      fs.writeFileSync(tempPath, file.buffer);

      res.json({
        to: CONTRACT_ADDRESSES.documentRegistry,
        data: data,
        value: "0x0",
        metadata: { name, group, fileHash, tempPath }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to prepare document" });
    }
  }
);

// ─────────────────────────────────────────────
// STEP 2: CONFIRM DOCUMENT
// ─────────────────────────────────────────────
router.post(
  "/confirm/document",
  requireRole("PROFESSOR"),
  async (req, res) => {
    try {
      const { txHash, fileHash, name, group } = req.body;

      if (!txHash) {
        return res.status(400).json({ error: "Missing txHash" });
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });

      const count = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.documentRegistry,
        abi: DOCUMENT_REGISTRY_ABI,
        functionName: "count",
        args: [],
      }) as bigint;

      const documentId = Number(count) - 1;

      await addDocumentToStore({
        id: documentId,
        name: name,
        hash: fileHash,
        group: group,
      });

      const tempDir = path.join(__dirname, '../../temp');
      const tempPath = path.join(tempDir, `${fileHash}.pdf`);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      res.json({
        success: true,
        documentId: documentId,
        txHash: txHash,
        blockNumber: Number(receipt.blockNumber)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to confirm document" });
    }
  }
);

// ─────────────────────────────────────────────
// GET ALL ANNOUNCEMENTS
// ─────────────────────────────────────────────
router.get("/announcements", async (req, res) => {
  try {
    const wallet = req.headers["x-wallet-address"] as `0x${string}`;

    if (!wallet) {
      return res.status(401).json({ error: "Missing wallet" });
    }

    const { getWalletRole, getWalletGroup, getAnnouncementsForGroup } = await import("../services/blockchain");

    const role = await getWalletRole(wallet);
    const group = await getWalletGroup(wallet);

    let announcements = await getAnnouncementsForGroup(group);

    if (role === "PROFESSOR") {
      const allAnnouncements = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.announcementLog,
        abi: ANNOUNCEMENT_LOG_ABI,
        functionName: "getAll",
        args: [],
      }) as any[];
      announcements = allAnnouncements;
    }

    res.json({ announcements, role, group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// ─────────────────────────────────────────────
// GET SINGLE ANNOUNCEMENT
// ─────────────────────────────────────────────
router.get("/announcement/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const announcement = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.announcementLog,
      abi: ANNOUNCEMENT_LOG_ABI,
      functionName: "get",
      args: [BigInt(id)],
    });

    res.json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch announcement" });
  }
});

// ─────────────────────────────────────────────
// GET ALL DOCUMENTS
// ─────────────────────────────────────────────
router.get("/documents", async (req, res) => {
  try {
    const wallet = req.headers["x-wallet-address"] as `0x${string}`;
    const { getWalletGroup } = await import("../services/blockchain");
    const group = await getWalletGroup(wallet);

    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.documentRegistry,
      abi: DOCUMENT_REGISTRY_ABI,
      functionName: "count",
      args: [],
    }) as bigint;

    const documents = [];
    for (let i = 0; i < Number(count); i++) {
      const doc = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.documentRegistry,
        abi: DOCUMENT_REGISTRY_ABI,
        functionName: "get",
        args: [BigInt(i)],
      }) as any;
      documents.push(doc);
    }

    const filtered = documents.filter(doc => doc.group === group || doc.group === GROUP_ALL);

    res.json({ documents: filtered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

export default router;
