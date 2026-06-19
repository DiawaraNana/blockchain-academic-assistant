// src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import telegram from "./routes/telegram.js";
import announcements from "./routes/announcements";
import documents from "./routes/documents";
import chat from "./routes/chat";
import verify from "./routes/verify";
import acknowledge from "./routes/acknowledge";
import publish from "./routes/publish";
import transactions from "./routes/transactions";

// Imports pour l'initialisation du vector store
import { publicClient, CONTRACT_ADDRESSES, ANNOUNCEMENT_LOG_ABI } from "./services/blockchain.js";
import { addToStore, vectorStore } from "./services/rag.js";
import { getAnnouncementContent } from "./services/storage.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/announcements", announcements);
app.use("/api/documents", documents);
app.use("/api/chat", chat);
app.use("/api/verify", verify);
app.use("/api/acknowledge", acknowledge);
app.use("/api/publish", publish);
app.use("/api/transactions", transactions);
app.use("/api/telegram", telegram);
// ─────────────────────────────────────────────
// INITIALISATION DU VECTOR STORE AU DÉMARRAGE
// ─────────────────────────────────────────────
async function initVectorStore() {
  console.log("\n🚀 Initialisation du vector store...");
  
  try {
    // Récupérer toutes les annonces de la blockchain
    const data = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.announcementLog,
      abi: ANNOUNCEMENT_LOG_ABI,
      functionName: "getAll",
      args: [],
    }) as any[];
    
    console.log(`📊 ${data.length} annonces trouvées sur la blockchain`);
    
    if (data.length === 0) {
      console.log("⚠️ Aucune annonce à indexer");
      return;
    }
    
    // Vider le vector store avant de le remplir
    while (vectorStore.length > 0) {
      vectorStore.pop();
    }
    
    // Indexer chaque annonce
    for (let i = 0; i < data.length; i++) {
      const ann = data[i];
      let content = getAnnouncementContent(i);
      
      if (!content || content === "Contenu non disponible") {
        const date = new Date(Number(ann.timestamp) * 1000).toLocaleDateString('fr-FR');
        content = `Annonce ${ann.category} du ${date}. Catégorie: ${ann.category}.`;
      }
      
      await addToStore({
        id: i,
        text: content,
        group: "all",
        category: ann.category,
      });
      
      console.log(`  ✅ Annonce ${i} indexée: "${content.slice(0, 50)}..."`);
    }
    
    console.log(`\n✅ Vector store initialisé avec ${vectorStore.length} annonces !\n`);
    
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation du vector store:", error);
  }
}

// Démarrer le serveur APRÈS l'initialisation
async function startServer() {
  await initVectorStore();
  
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer();