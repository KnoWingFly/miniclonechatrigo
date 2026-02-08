import { GoogleGenerativeAI } from "@google/generative-ai";

// ================ Config =================
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

if (!GOOGLE_AI_API_KEY) {
  throw new Error("Missing Google AI API Key");
}

const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
const EMBEDDING_MODEL = "gemini-embedding-001"; 

// ================ Types =================
export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  text: string[];
}

// ================ Generate Embedding =================
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const cleanedText = cleanText(text);
    const model = genAI.getGenerativeModel({
      model: EMBEDDING_MODEL,
      
    });

    const result = await model.embedContent(cleanedText);

    const embedding = result.embedding.values;

    if (!embedding || embedding.length === 0) {
      throw new Error("Failed to generate embedding");
    }

    // Truncate to 768 dimensions so its can in supabase vector
    const truncated = embedding.slice(0, 768);

    console.log(
      `Generated embedding with ${embedding.length} dimensions, truncated to ${truncated.length}`,
    );
    return truncated;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Google AI API key is invalid");
      }
      if (error.message.includes("quota")) {
        throw new Error("Google AI quota excedeed");
      }
    }
    throw error;
  }
}

// ================ Generate Batch Embedding =================
export async function generateBatchEmbeddings(
  texts: string[],
): Promise<number[][]> {
  try {
    if (!texts || texts.length === 0) {
      throw new Error("Texts array cannot be empty");
    }

    const embeddings = await Promise.all(
      texts.map((text) => generateEmbedding(text)),
    );

    return embeddings;
  } catch (error) {
    throw error;
  }
}

// ================ Generate Embedding With Retry =================
export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3,
): Promise<number[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateEmbedding(text);
    } catch (error: any) {
      lastError = error;
      console.warn(`Embedding attempt ${attempt} failed: ${error.message}`);

      if (error instanceof Error) {
        if (
          error.message.includes("quota") ||
          error.message.includes("API key") ||
          error.message.includes("invalid")
        ) {
          throw error;
        }
      }
    }
    if (attempt < maxRetries) {
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      await sleep(waitTime);
    }
  }
  throw new Error("Failed to generate embedding after multiple retries");
}

// ================== Helper Functions ==================
// Clean Text
function cleanText(text: string): string {
  let cleaned = text.replace(/\s+/g, " ").trim();

  const maxWords = 8000;
  const words = cleaned.split(" ");

  if (words.length > maxWords) {
    cleaned = words.slice(0, maxWords).join(" ") + "...";
    console.warn(`Text truncated to ${maxWords} words`);
  }

  return cleaned;
}

// Sleep
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ================== Testing Helper ==================
// AI Generated
// export async function testEmbeddingservice(): Promise<void> {
//   console.log("Test embedding service... \m");

//   try {
//     // =================== Test 1: Single embedding ===================
//     console.log("Test 1: Single embedding");
//     const vector1 = await generateEmbedding("Hello, world!");
//     console.log(`Vector dimensions: ${vector1.length}`);
//     console.log(`First 5 values: ${vector1.slice(0, 5).join(", ")}`);

//     // =================== Test 2: Batch embeddings ===================
//     console.log("\nTest 2: Batch embeddings");
//     const vectors = await generateBatchEmbeddings([
//       "I love pizza",
//       "I enjoy pasta",
//       "The weather is nice",
//     ]);
//     console.log(`Generated ${vectors.length} vectors`);

//     // =================== Test 3: Similarity check ===================
//     console.log("\nTest 3: Similarity check");
//     const pizza = await generateEmbedding("I love pizza");
//     const pasta = await generateEmbedding("I enjoy pasta");
//     const weather = await generateEmbedding("The weather is nice");
//     const pizzaPastaSimilarity = cosineSimilarity(pizza, pasta);
//     const pizzaWeatherSimilarity = cosineSimilarity(pizza, weather);
//     console.log(`Pizza ↔ Pasta similarity: ${pizzaPastaSimilarity.toFixed(4)}`);
//     console.log(
//       `Pizza ↔ Weather similarity: ${pizzaWeatherSimilarity.toFixed(4)}`,
//     );
//     console.log(
//       pizzaPastaSimilarity > pizzaWeatherSimilarity
//         ? "Pizza is more similar to pasta than weather (correct!)"
//         : "Something's wrong with embeddings",
//     );
//     console.log("\n All tests passed!\n");
//   } catch (error) {
//     console.error("\n Test failed:", error);
//     throw error;
//   }
// }

// function cosineSimilarity(a: number[], b: number[]): number {
//   if (a.length !== b.length) {
//     throw new Error("Vectors must have same length");
//   }
//   let dotProduct = 0;
//   let magnitudeA = 0;
//   let magnitudeB = 0;
//   for (let i = 0; i < a.length; i++) {
//     dotProduct += a[i] * b[i];
//     magnitudeA += a[i] * a[i];
//     magnitudeB += b[i] * b[i];
//   }
//   magnitudeA = Math.sqrt(magnitudeA);
//   magnitudeB = Math.sqrt(magnitudeB);
//   if (magnitudeA === 0 || magnitudeB === 0) {
//     return 0;
//   }
//   return dotProduct / (magnitudeA * magnitudeB);
// }
