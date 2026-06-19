// backend/src/routes/documents.ts
import { Router } from "express";
import { publicClient, CONTRACT_ADDRESSES, DOCUMENT_REGISTRY_ABI } from "../services/blockchain";

const router = Router();

// Get document by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    const doc = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.documentRegistry,
      abi: DOCUMENT_REGISTRY_ABI,
      functionName: "get",
      args: [BigInt(id)],
    }) as any;

    const serializedDoc = {
      hash: doc.hash,
      group: doc.group,
      name: doc.name,
      timestamp: doc.timestamp ? Number(doc.timestamp) : 0,
      registrant: doc.registrant,
    };

    res.json(serializedDoc);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(404).json({ error: "Document not found" });
  }
});

// Get document count
router.get("/count", async (req, res) => {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.documentRegistry,
      abi: DOCUMENT_REGISTRY_ABI,
      functionName: "count",
      args: [],
    });
    res.json({ count: Number(count) });
  } catch (error) {
    console.error("Error getting document count:", error);
    res.status(500).json({ error: "Failed to get count" });
  }
});

// ADD THIS - Get all documents (Main fix!)
router.get("/", async (req, res) => {
  try {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.documentRegistry,
      abi: DOCUMENT_REGISTRY_ABI,
      functionName: "count",
      args: [],
    }) as bigint;
    
    const documents = [];
    for (let i = 0; i < Number(count); i++) {
      try {
        const doc = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.documentRegistry,
          abi: DOCUMENT_REGISTRY_ABI,
          functionName: "get",
          args: [BigInt(i)],
        }) as any;
        
        documents.push({
          id: i,
          hash: doc.hash,
          group: doc.group,
          name: doc.name,
          timestamp: doc.timestamp ? Number(doc.timestamp) : 0,
          registrant: doc.registrant,
        });
      } catch (err) {
        console.error(`Error fetching document ${i}:`, err);
      }
    }
    
    console.log(`Returning ${documents.length} documents`); // Debug log
    res.json(documents);
  } catch (error) {
    console.error("Error fetching all documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

export default router;