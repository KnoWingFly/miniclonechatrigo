import { PrismaClient } from "@prisma/client";
import { generateEmbedding } from "./embedding.service";

const prisma = new PrismaClient();

// =================== Types ===================

export type KnowledgeCategory =
  | "product_info"
  | "business_rules"
  | "instructions";

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResult {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  metadata?: any;
  similarity: number;
}

export interface UserPreferenceEntry {
  id: string;
  userId: string;
  preference: string;
  source: "explicit" | "pattern_analysis";
  confidence: number;
  createdAt: Date;
}

// =================== Knowledge Base Management ===================

// Insert Knowledge
export async function insertKnowledge(
  botId: string,
  category: KnowledgeCategory,
  title: string,
  content: string,
  metadata?: any,
): Promise<KnowledgeEntry> {
  try {
    const embedding = await generateEmbedding(content);
    const result = await prisma.$executeRawUnsafe(
      `
      INSERT INTO "KnowledgeBase" (id, "botId", category, title, content, embedding, metadata, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6::vector, $7, NOW(), NOW())
      RETURNING *
      `,
      generateId(),
      botId,
      category,
      title,
      content,
      `[${embedding.join(",")}]`,
      metadata ? JSON.stringify(metadata) : null,
    );

    return (await prisma.knowledgeBase.findFirstOrThrow({
      where: { title, category, botId },
    })) as any;
  } catch (error) {
    console.error("Error inserting knowledge:", error);
    throw error;
  }
}

// Update Knowledge
export async function updateKnowledge(
  id: string,
  botId: string,
  updates: {
    title?: string;
    content?: string;
    metadata?: any;
  },
): Promise<KnowledgeEntry> {
  try {
    const existing = await prisma.knowledgeBase.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Knowledge entry not found");
    }

    // Verify ownership
    if ((existing as any).botId !== botId) {
      throw new Error("Unauthorized: Knowledge belongs to different bot");
    }

    // Generate new embedding if content is being updated
    let embedding: number[] | undefined;
    if (updates.content) {
      embedding = await generateEmbedding(updates.content);
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.content) updateData.content = updates.content;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    // Update using raw SQL if embedding changed, otherwise use Prisma
    if (embedding) {
      await prisma.$executeRawUnsafe(
        `
        UPDATE "KnowledgeBase"
        SET title = $2,
            content = $3,
            embedding = $4::vector,
            metadata = $5,
            "updatedAt" = NOW()
        WHERE id = $1
        `,
        id,
        updates.title ?? existing.title,
        updates.content,
        `[${embedding.join(",")}]`,
        updates.metadata !== undefined
          ? JSON.stringify(updates.metadata)
          : existing.metadata,
      );
    } else {
      await prisma.knowledgeBase.update({
        where: { id },
        data: updateData,
      });
    }

    return (await prisma.knowledgeBase.findFirstOrThrow({
      where: { id },
    })) as any;
  } catch (error) {
    console.error("Error updating knowledge:", error);
    throw error;
  }
}

// Delete Knowledge
export async function deleteKnowledge(
  id: string,
  botId: string,
): Promise<void> {
  try {
    // Verify ownership before deleting
    const existing = await prisma.knowledgeBase.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Knowledge entry not found");
    }
    if ((existing as any).botId !== botId) {
      throw new Error("Unauthorized: Knowledge belongs to different bot");
    }

    await prisma.knowledgeBase.delete({
      where: { id },
    });
    console.log(`Knowledge deleted: ${id}`);
  } catch (error) {
    console.error("Error deleting knowledge:", error);
    throw error;
  }
}

// Get Knowledge by category
export async function getKnowledgeByCategory(
  botId: string,
  category: KnowledgeCategory,
): Promise<KnowledgeEntry[]> {
  return (await prisma.knowledgeBase.findMany({
    where: { botId, category },
    orderBy: { createdAt: "desc" },
  })) as any;
}

// Get all knowledge for a bot
export async function getAllKnowledge(
  botId: string,
): Promise<KnowledgeEntry[]> {
  return (await prisma.knowledgeBase.findMany({
    where: { botId },
    orderBy: { createdAt: "desc" },
  })) as any;
}

// =================== Vector Search ====================
// WELCOME TO THE HELL

export async function searchSimilarKnowledge(
  botId: string,
  query: string,
  category?: KnowledgeCategory,
  topK: number = 5,
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const categoryFilter = category ? `AND category = '${category}'` : "";

    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        id,
        category,
        title,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM "KnowledgeBase"
      WHERE embedding IS NOT NULL
      AND "botId" = $3
      ${categoryFilter}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      `[${queryEmbedding.join(",")}]`,
      topK,
      botId,
    );

    const formatted = results.map((r) => ({
      ...r,
      similarity: Number(r.similarity),
      metadata: r.metadata ? r.metadata : undefined,
    }));

    return formatted;
  } catch (error) {
    console.error("Error searching: ", error);
    throw error;
  }
}

// =================== User Preference ===================

// Insert User Preference
export async function insertUserPreference(
  userId: string,
  preference: string,
  source: "explicit" | "pattern_analysis",
  confidence: number = 1.0,
): Promise<UserPreferenceEntry> {
  try {
    const embedding = await generateEmbedding(preference);
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "UserPreference" (id, "userId", preference, embedding, source, confidence, "createdAt")
      VALUES ($1, $2, $3, $4::vector, $5, $6, NOW())
      `,
      generateId(),
      userId,
      preference,
      `[${embedding.join(",")}]`,
      source,
      confidence,
    );
    return (await prisma.userPreference.findFirstOrThrow({
      where: { userId, preference },
    })) as any;
  } catch (error) {
    console.error("Error inserting user preference:", error);
    throw error;
  }
}

// Search User Preferences
export async function searchUserPreferences(
  userId: string,
  query: string,
  topK: number = 3,
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        id,
        preference as content,
        source as category,
        confidence,
        1 - (embedding <=> $1::vector) as similarity
      FROM "UserPreference"
      WHERE "userId" = $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      `[${queryEmbedding.join(",")}]`,
      userId,
      topK,
    );
    return results.map((r) => ({
      id: r.id,
      category: r.category,
      title: "User Preference",
      content: r.content,
      similarity: Number(r.similarity),
      metadata: { confidence: r.confidence },
    }));
  } catch (error) {
    console.error("Error searching user preferences:", error);
    throw error;
  }
}

// Get all preferences
export async function getUserPreferences(
  userId: string,
): Promise<UserPreferenceEntry[]> {
  return (await prisma.userPreference.findMany({
    where: { userId },
    orderBy: { confidence: "desc" },
  })) as any;
}

// Delete user preference
export async function deleteUserPreference(id: string): Promise<void> {
  await prisma.userPreference.delete({ where: { id } });
}

// =================== Utility Functions ===================

// ID
function generateId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;
}

// Test (AI Generated)
// export async function testVectorSearch(): Promise<void> {
//   console.log("Testing Vector Search");
//   try {
//     console.log("Inserting test knowledge...");
//     await insertKnowledge(
//       "product_info",
//       "iPhone 15",
//       "The iPhone 15 features a 6.1-inch display with A16 Bionic chip and 48MP camera",
//     );
//     await insertKnowledge(
//       "product_info",
//       "MacBook Pro",
//       "The MacBook Pro has M3 chip, 14-inch Retina display, and 18-hour battery life",
//     );
//     await insertKnowledge(
//       "business_rules",
//       "Refund Policy",
//       "Customers can request refunds within 30 days of purchase with proof of receipt",
//     );
//     // Test search
//     console.log("\nSearching for: 'phone camera specs'");
//     const results = await searchSimilarKnowledge(
//       "phone camera specs",
//       undefined,
//       3,
//     );
//     console.log("\nResults:");
//     results.forEach((r, i) => {
//       console.log(`${i + 1}. ${r.title} (${(r.similarity * 100).toFixed(1)}%)`);
//       console.log(`   ${r.content.substring(0, 60)}...`);
//     });
//     console.log("\nVector search test passed!\n");
//   } catch (error) {
//     console.error("\nTest failed:", error);
//     throw error;
//   }
// }