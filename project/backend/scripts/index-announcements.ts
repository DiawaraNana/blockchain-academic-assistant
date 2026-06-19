// backend/scripts/index-announcements.ts

//npx tsx scripts/index-announcements.ts
import { publicClient, CONTRACT_ADDRESSES, ANNOUNCEMENT_LOG_ABI } from "../src/services/blockchain.js";
import { addToStore } from "../src/services/rag.js";
import { getAnnouncementContent, saveAnnouncementContent } from "../src/services/storage.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Définir GROUP_ALL
const GROUP_ALL = "0x" + crypto.createHash("sha256").update("all").digest("hex");

async function indexAllAnnouncements() {
  console.log("🚀 Début de l'indexation des annonces...\n");
  
  // Récupérer toutes les annonces de la blockchain
  const data = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.announcementLog,
    abi: ANNOUNCEMENT_LOG_ABI,
    functionName: "getAll",
    args: [],
  }) as any[];
  
  console.log(`📊 Nombre d'annonces trouvées: ${data.length}\n`);
  
  for (let i = 0; i < data.length; i++) {
    const ann = data[i];
    
    // Essayer de récupérer le contenu stocké
    let content = getAnnouncementContent(i);
    
    if (!content || content === "Contenu non disponible") {
      console.log(`⚠️ Annonce ${i} - Pas de contenu stocké`);
      
      // Ajouter un contenu par défaut
      const date = new Date(Number(ann.timestamp) * 1000).toLocaleDateString('fr-FR');
      content = `Annonce ${ann.category} du ${date}. Catégorie: ${ann.category}. Publié par ${ann.publisher.slice(0, 10)}...`;
      
      // Sauvegarder le contenu
      saveAnnouncementContent(i, content);
      console.log(`   ✅ Contenu par défaut ajouté`);
    }
    
    // Convertir le groupe pour le stockage
    const groupStr = ann.group === GROUP_ALL ? "all" : "custom";
    
    // Indexer dans le vector store
    await addToStore({
      id: i,
      text: content,
      group: groupStr,
      category: ann.category,
    });
    
    console.log(`✅ Annonce ${i} indexée: "${content.slice(0, 50)}..."`);
  }
  
  console.log(`\n🎉 Indexation terminée! ${data.length} annonces indexées.`);
  import { vectorStore } from "../src/services/rag.js";
console.log(`\n📊 Vérification finale: vectorStore contient ${vectorStore.length} éléments`);
}

indexAllAnnouncements().catch(console.error);