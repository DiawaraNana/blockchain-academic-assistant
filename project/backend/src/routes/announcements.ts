// backend/src/routes/announcements.ts
import { Router } from "express";
import { publicClient, CONTRACT_ADDRESSES, ANNOUNCEMENT_LOG_ABI, getWalletRole, getWalletGroup, GROUP_ALL } from "../services/blockchain";
import { getAnnouncementContent } from "../services/storage";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const wallet = req.headers["x-wallet-address"] as `0x${string}`;
    
    // Récupérer toutes les annonces de la blockchain
    const data = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.announcementLog,
      abi: ANNOUNCEMENT_LOG_ABI,
      functionName: "getAll",
      args: [],
    }) as any[];
    
    // Ajouter les IDs et le contenu stocké
    const serializedData = await Promise.all(data.map(async (announcement, index) => {
      const content = getAnnouncementContent(index);
      return {
        id: index,
        contentHash: announcement.contentHash,
        group: announcement.group,
        category: announcement.category,
        timestamp: announcement.timestamp ? Number(announcement.timestamp) : 0,
        publisher: announcement.publisher,
        content: content || "Contenu non disponible"
      };
    }));
    
    // Obtenir le rôle et le groupe du wallet
    let userRole = "NONE";
    let userGroup = GROUP_ALL;
    
    if (wallet && wallet !== "0x0000000000000000000000000000000000000000") {
      userRole = await getWalletRole(wallet);
      userGroup = await getWalletGroup(wallet);
    }
    
    // FILTRAGE PAR GROUPE
    let filteredData = serializedData;
    
    if (userRole === "STUDENT") {
      // 🔒 STUDENT : voit seulement son groupe ou "all"
      filteredData = serializedData.filter(
        (ann) => ann.group === userGroup || ann.group === GROUP_ALL
      );
      console.log(`📚 Student ${wallet?.slice(0, 10)}... - Group: ${userGroup.slice(0, 10)}... - Shows: ${filteredData.length}/${serializedData.length} announcements`);
    } else {
      // 👨‍🏫 PROFESSOR / ADMIN : voit TOUTES les annonces
      console.log(`👨‍🏫 Professor/Admin ${wallet?.slice(0, 10)}... - Shows ALL: ${serializedData.length} announcements`);
    }
    
    res.json({
      announcements: filteredData,
      role: userRole,
      group: userGroup,
      totalCount: serializedData.length,
      filteredCount: filteredData.length
    });
    
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

export default router;