import { publicClient, CONTRACT_ADDRESSES, ANNOUNCEMENT_LOG_ABI } from "../src/services/blockchain.js";
import { addToStore, vectorStore } from "../src/services/rag.js";
import { getAnnouncementContent } from "../src/services/storage.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function reindex() {
  console.log("🚀 Réindexation...\n");
  
  const data = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.announcementLog,
    abi: ANNOUNCEMENT_LOG_ABI,
    functionName: "getAll",
    args: [],
  }) as any[];
  
  console.log(`📊 ${data.length} annonces trouvées`);
  console.log(`📊 Vector store avant: ${vectorStore.length}\n`);
  
  for (let i = 0; i < data.length; i++) {
    const ann = data[i];
    let content = getAnnouncementContent(i);
    
    if (!content || content === "Contenu non disponible") {
      content = `Annonce ${ann.category} #${i}`;
    }
    
    console.log(`📝 Indexation annonce ${i}: "${content.slice(0, 50)}..."`);
    await addToStore({
      id: i,
      text: content,
      group: "all",
      category: ann.category,
    });
  }
  
  console.log(`\n📊 Vector store après: ${vectorStore.length}`);
  console.log("🎉 Terminé!");
}

reindex().catch(console.error);