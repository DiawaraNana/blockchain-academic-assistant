import { Mistral } from "@mistralai/mistralai";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

// ── Simple in-memory vector store ────────────────────────────────────────────
interface VectorEntry {
  id:        number;
  text:      string;
  group:     string;
  category:  string;
  embedding: number[];
  score?:    number;
}

const vectorStore: VectorEntry[] = [];

// ── Constants ────────────────────────────────────────────────────────────────
const GROUP_ALL_BYTES = "0x" + crypto.createHash("sha256").update("all").digest("hex");

// ── Add an announcement to the RAG store ─────────────────────────────────────
export async function addToStore(entry: {
  id:       number;
  text:     string;
  group:    string;
  category: string;
}): Promise<void> {
  try {
    const embeddingRes = await mistral.embeddings.create({
      model: "mistral-embed",
      inputs: [entry.text],
    });

    const embedding: number[] = embeddingRes.data[0].embedding ?? [];

    const idx = vectorStore.findIndex((e) => e.id === entry.id);
    if (idx !== -1) vectorStore.splice(idx, 1);

    vectorStore.push({ ...entry, embedding });
    console.log(`✅ Ajouté au vector store: ID ${entry.id} - ${entry.text.slice(0, 50)}...`);
  } catch (err) {
    console.error("Erreur addToStore:", err);
  }
}

// ── Add a document to the RAG store ──────────────────────────────────────────
export async function addDocumentToStore(entry: {
  id: number;
  name: string;
  hash: string;
  group: string;
}): Promise<void> {
  try {
    const text = `Document: ${entry.name}. Hash: ${entry.hash}`;
    
    const embeddingRes = await mistral.embeddings.create({
      model: "mistral-embed",
      inputs: [text],
    });

    const embedding: number[] = embeddingRes.data[0].embedding ?? [];

    vectorStore.push({
      id: entry.id,
      text: text,
      group: entry.group,
      category: "document",
      embedding: embedding,
    });
    console.log(`✅ Document ajouté au vector store: ID ${entry.id}`);
  } catch (err) {
    console.error("Erreur addDocumentToStore:", err);
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return normA && normB ? dot / (normA * normB) : 0;
}

// ── Check if entry matches user's group ──────────────────────────────────────
function matchesGroup(entryGroup: string, userGroup: string): boolean {
  // Accepte: même groupe, ou "all", ou le bytes32 de "all"
  return entryGroup === userGroup || 
         entryGroup === "all" || 
         entryGroup === GROUP_ALL_BYTES;
}

// ── Retrieve top-k relevant entries filtered by group ────────────────────────
async function retrieve(
  query: string,
  userGroup: string,
  topK = 5
): Promise<VectorEntry[]> {
  if (vectorStore.length === 0) {
    console.log("❌ Vector store vide");
    return [];
  }

  console.log(`🔍 Recherche embedding pour: "${query}"`);

  const queryEmbRes = await mistral.embeddings.create({
    model: "mistral-embed",
    inputs: [query],
  });

  const queryEmb: number[] = queryEmbRes.data[0].embedding ?? [];

  if (queryEmb.length === 0) {
    console.log("❌ Pas d'embedding pour la requête");
    return [];
  }

  // Filtrer par groupe
  const filtered = vectorStore.filter(
    (e) => matchesGroup(e.group, userGroup)
  );

  console.log(`📊 ${filtered.length}/${vectorStore.length} annonces après filtre groupe`);

  const scored = filtered
    .map((e) => ({ ...e, score: cosineSimilarity(queryEmb, e.embedding) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);

  console.log(`🎯 ${scored.length} résultats trouvés par embedding`);
  return scored;
}

// ── Search by keywords (fallback) ────────────────────────────────────────────
async function keywordSearch(query: string, userGroup: string, topK = 5): Promise<VectorEntry[]> {
  const keywords = query.toLowerCase().split(/\s+/);
  
  // Filtrer par groupe
  const filtered = vectorStore.filter(
    (e) => matchesGroup(e.group, userGroup)
  );
  
  const scored = filtered.map(entry => {
    const text = entry.text.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (keyword.length > 2 && text.includes(keyword)) {
        score += 1;
      }
    }
    return { ...entry, score: score / Math.max(1, keywords.length) };
  });
  
  const results = scored
    .filter(e => (e.score || 0) > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, topK);
  
  console.log(`🎯 ${results.length} résultats trouvés par mots-clés`);
  return results;
}

// ── Generate answer using retrieved context ───────────────────────────────────
export async function answerQuestion(
  question: string,
  userGroup: string
): Promise<string> {
  console.log("\n🔍 ====== NOUVELLE QUESTION ======");
  console.log("📝 Question:", question);
  console.log("👤 User group:", userGroup);
  console.log("📚 Vector store size:", vectorStore.length);
  
  if (vectorStore.length === 0) {
    console.log("❌ Vector store vide - aucune annonce indexée");
    return "Aucune annonce n'a été indexée. Veuillez contacter votre professeur.";
  }
  
  // Afficher les annonces disponibles pour debug
  console.log("\n📋 Annonces disponibles dans le store:");
  vectorStore.forEach((entry, idx) => {
    console.log(`  ${idx}: [${entry.category}] group:${entry.group} - ${entry.text.slice(0, 80)}...`);
  });
  
  // D'abord essayer la recherche par mots-clés (plus simple)
  let relevant = await keywordSearch(question, userGroup);
  
  // Si pas de résultat, essayer la recherche par embedding
  if (relevant.length === 0) {
    console.log("🔄 Aucun résultat par mots-clés, essai par embedding...");
    relevant = await retrieve(question, userGroup);
  }
  
  if (relevant.length === 0) {
    console.log("❌ Aucune annonce pertinente trouvée");
    return "Je n'ai pas trouvé d'annonce correspondant à votre question.";
  }
  
  console.log(`\n📄 ${relevant.length} annonces pertinentes trouvées:`);
  relevant.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.category}] Score: ${r.score?.toFixed(3)} - ${r.text.slice(0, 80)}...`);
  });

  const context = relevant
    .map((e) => `[${e.category}] ${e.text}`)
    .join("\n\n");

  const completion = await mistral.chat.complete({
    model: "mistral-small-latest",
    messages: [
      {
        role: "system",
        content:
          "Tu es un assistant académique. Réponds uniquement en te basant sur les annonces fournies. " +
          "Si l'information n'est pas dans le contexte, dis-le clairement. Réponds en français.",
      },
      {
        role: "user",
        content: `Annonces disponibles :\n\n${context}\n\nQuestion : ${question}`,
      },
    ],
  });

  const answer = completion.choices?.[0]?.message?.content?.toString() ?? "Pas de réponse disponible.";
  console.log("✅ Réponse générée avec succès\n");
  return answer;
}

export { vectorStore };