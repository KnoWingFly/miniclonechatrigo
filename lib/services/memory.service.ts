import {
  searchSimilarKnowledge,
  searchUserPreferences,
  insertKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getKnowledgeByCategory,
  getAllKnowledge,
  SearchResult,
  KnowledgeCategory,
  KnowledgeEntry,
} from "./vector.service";

// =================== Types ===================
export interface RAGContext {
  results: SearchResult[];
  formattedContext: string;
  totalResults: number;
  categories: {
    product_info: number;
    business_rules: number;
    instructions: number;
    user_preferences: number;
  };
}
export interface RetrievalOptions {
  topK?: number;
  includeCategories?: string[];
  minSimilarity?: number;
}

// =================== MAIN RAG FUNCTION (PLEASE WORKS) ===================

export async function retrieveContext(
  query: string,
  userId: string,
  botId: string,
  options: RetrievalOptions = {},
): Promise<RAGContext> {
  try {
    const {
      topK = 7,
      includeCategories = [
        "product_info",
        "business_rules",
        "instructions",
        "user_preferences",
      ],
      minSimilarity = 0.3,
    } = options;

    // search all (pararel = faster [hopefully])
    const searchPromises: Promise<SearchResult[]>[] = [];

    const knowledgeCategories = [
      "product_info",
      "business_rules",
      "instructions",
    ] as const;
    for (const category of knowledgeCategories) {
      if (includeCategories.includes(category)) {
        const categoryTopK = Math.ceil(topK / includeCategories.length);
        searchPromises.push(
          searchSimilarKnowledge(botId, query, category, categoryTopK),
        );
      }
    }

    if (includeCategories.includes("user_preferences")) {
      const prefTopK = Math.ceil(topK / includeCategories.length);
      searchPromises.push(searchUserPreferences(userId, query, prefTopK));
    }

    const searchResults = await Promise.all(searchPromises);

    // ======= Merge + Ranking =======
    // Flatten result
    let allResults: SearchResult[] = searchResults.flat();

    //Filter (min similarity)
    allResults = allResults.filter((r) => r.similarity >= minSimilarity);

    //Sort (high first)
    allResults.sort((a, b) => b.similarity - a.similarity);

    // Take top K
    const topResults = allResults.slice(0, topK);

    // ====== Format Context for LLM ======
    const formattedContext = formatContextForLLM(topResults);

    // ====== Calculate Category ======
    const categories = {
      product_info: topResults.filter((r) => r.category === "product_info")
        .length,
      business_rules: topResults.filter((r) => r.category === "business_rules")
        .length,
      instructions: topResults.filter((r) => r.category === "instructions")
        .length,
      user_preferences: topResults.filter((r) => r.title === "User Preference")
        .length,
    };

    return {
      results: topResults,
      formattedContext,
      totalResults: topResults.length,
      categories,
    };
  } catch (error) {
    return {
      results: [],
      formattedContext: "No relevant context found.",
      totalResults: 0,
      categories: {
        product_info: 0,
        business_rules: 0,
        instructions: 0,
        user_preferences: 0,
      },
    };
  }
}

// ========== FormatContextLLM Function =========
export function formatContextForLLM(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No relevant context found.";
  }
  // Group by category
  const byCategory = {
    product_info: results.filter((r) => r.category === "product_info"),
    business_rules: results.filter((r) => r.category === "business_rules"),
    instructions: results.filter((r) => r.category === "instructions"),
    user_preferences: results.filter((r) => r.title === "User Preference"),
  };
  let context = "";
  // Format each category
  if (byCategory.product_info.length > 0) {
    context += "PRODUCT INFORMATION:\n";
    byCategory.product_info.forEach((r, i) => {
      context += `${i + 1}. ${r.title} (${(r.similarity * 100).toFixed(0)}% relevant)\n`;
      context += `   ${r.content}\n\n`;
    });
  }
  if (byCategory.business_rules.length > 0) {
    context += "BUSINESS RULES:\n";
    byCategory.business_rules.forEach((r, i) => {
      context += `${i + 1}. ${r.title} (${(r.similarity * 100).toFixed(0)}% relevant)\n`;
      context += `   ${r.content}\n\n`;
    });
  }
  if (byCategory.instructions.length > 0) {
    context += "INSTRUCTIONS:\n";
    byCategory.instructions.forEach((r, i) => {
      context += `${i + 1}. ${r.title} (${(r.similarity * 100).toFixed(0)}% relevant)\n`;
      context += `   ${r.content}\n\n`;
    });
  }
  if (byCategory.user_preferences.length > 0) {
    context += "USER PREFERENCES:\n";
    byCategory.user_preferences.forEach((r, i) => {
      const source = r.category === ("explicit" as any) ? "stated" : "inferred";
      context += `${i + 1}. ${r.content} [${source}]\n`;
    });
    context += "\n";
  }
  return context.trim();
}

// ========== Knowledge Base Management (CRUD) Functions =========

// Add
export async function addKnowledge(
  botId: string,
  category: KnowledgeCategory,
  title: string,
  content: string,
  metadata?: any,
): Promise<KnowledgeEntry> {
  console.log(`Adding knowledge: ${title} (${category})`);
  return await insertKnowledge(botId, category, title, content, metadata);
}

// Update
export async function modifyKnowledge(
  id: string,
  botId: string,
  updates: {
    title?: string;
    content?: string;
    metadata?: any;
  },
): Promise<KnowledgeEntry> {
  console.log(`Updating knowledge: ${id}`);
  return await updateKnowledge(id, botId, updates);
}

// Delete
export async function removeKnowledge(
  id: string,
  botId: string,
): Promise<void> {
  console.log(`Removing knowledge: ${id}`);
  await deleteKnowledge(id, botId);
}

// Get (category)
export async function listKnowledge(
  botId: string,
  category?: KnowledgeCategory,
): Promise<KnowledgeEntry[]> {
  if (category) {
    return await getKnowledgeByCategory(botId, category);
  }
  return await getAllKnowledge(botId);
}

// Bulk Import
export async function bulkImportKnowledge(
  botId: string,
  entries: Array<{
    category: KnowledgeCategory;
    title: string;
    content: string;
    metadata?: any;
  }>,
): Promise<void> {
  console.log(`Bulk importing ${entries.length} knowledge entries...`);
  const batchSize = 10;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await Promise.all(
      batch.map((e) =>
        insertKnowledge(botId, e.category, e.title, e.content, e.metadata),
      ),
    );
    console.log(`Imported batch ${Math.floor(i / batchSize) + 1}`);
    if (i + batchSize < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log(`Bulk import complete: ${entries.length} entries`);
}

// ========== Testing Functions =========
// AI GENERATED
// export async function testRAGWorkflow(): Promise<void> {
//   console.log("\nTesting RAG Workflow...\n");
//   try {
//     // Add test knowledge
//     console.log("1. Adding test knowledge");
//     const testBotId = "test_bot_123"; 
//     await addKnowledge(
//       testBotId,
//       "product_info",
//       "Premium Subscription",
//       "Our premium plan costs $29.99/month and includes unlimited chats, priority support, and advanced AI features.",
//     );
//     await addKnowledge(
//       testBotId,
//       "business_rules",
//       "Cancellation Policy",
//       "Users can cancel their subscription anytime. No refunds for partial months, but service continues until period end.",
//     );
//     await addKnowledge(
//       testBotId,
//       "instructions",
//       "Tone Guidelines",
//       "Always be friendly, professional, and helpful. Use emojis sparingly. Explain technical concepts simply.",
//     );
//     // Test retrieval
//     console.log("\n2. Testing retrieval");
//     const context = await retrieveContext(
//       "How much is the premium plan and can I cancel?",
//       "test_user_123",
//       testBotId,
//       { topK: 5 },
//     );
//     console.log("\n3. Retrieved context:");
//     console.log(context.formattedContext);
//     console.log("\n4. Stats:");
//     console.log(`   Total results: ${context.totalResults}`);
//     console.log(`   Category breakdown:`, context.categories);
//     console.log("\nRAG workflow test passed!");
//   } catch (error) {
//     console.error("\nTest failed:", error);
//     throw error;
//   }
// }
