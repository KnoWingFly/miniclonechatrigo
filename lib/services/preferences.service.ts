import { PrismaClient } from "@prisma/client";
import { insertUserPreference, getUserPreferences } from "./vector.service";
const prisma = new PrismaClient();

// ============ Types (again and again) ===========
export interface ExtractedPreference {
  preference: string;
  source: "explicit" | "pattern_analysis";
  confidence: number;
}
export interface ConversationMessage {
  content: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
}

// ============ Explicit Pref Extraction ===========
export function extractExplicitPreferences(
  message: string,
): ExtractedPreference[] {
  const preferences: ExtractedPreference[] = [];
  // Convert to lowercase
  const lower = message.toLowerCase();
  // Pattern 1: "I prefer" / "I'd prefer"
  const preferPatterns = [
    /i\s+prefer\s+(.+?)(?:[.!?]|$)/gi,
    /i'd\s+prefer\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+would\s+prefer\s+(.+?)(?:[.!?]|$)/gi,
  ];
  for (const pattern of preferPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const pref = cleanPreference(match[1]);
      if (pref) {
        preferences.push({
          preference: `prefers ${pref}`,
          source: "explicit",
          confidence: 1.0,
        });
      }
    }
  }

  // Pattern 2: "I like..." / "I love..."
  const likePatterns = [
    /i\s+like\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+love\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+enjoy\s+(.+?)(?:[.!?]|$)/gi,
  ];
  for (const pattern of likePatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const pref = cleanPreference(match[1]);
      if (pref) {
        preferences.push({
          preference: `likes ${pref}`,
          source: "explicit",
          confidence: 1.0,
        });
      }
    }
  }

  // Pattern 3: "I like..." / "I love..."
  const dislikePatterns = [
    /i\s+don't\s+like\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+do\s+not\s+like\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+hate\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+dislike\s+(.+?)(?:[.!?]|$)/gi,
  ];
  for (const pattern of dislikePatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const pref = cleanPreference(match[1]);
      if (pref) {
        preferences.push({
          preference: `doesn't like ${pref}`,
          source: "explicit",
          confidence: 1.0,
        });
      }
    }
  }

  // Pattern 4: "I want..." / "I need..."
  const wantPatterns = [
    /i\s+want\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+need\s+(.+?)(?:[.!?]|$)/gi,
  ];
  for (const pattern of wantPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const pref = cleanPreference(match[1]);
      if (pref) {
        preferences.push({
          preference: `wants ${pref}`,
          source: "explicit",
          confidence: 0.9, // Slightly lower confidence
        });
      }
    }
  }

  // Pattern 5: "I always..." / "I usually..."
  const behaviorPatterns = [
    /i\s+always\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+usually\s+(.+?)(?:[.!?]|$)/gi,
    /i\s+typically\s+(.+?)(?:[.!?]|$)/gi,
  ];
  for (const pattern of behaviorPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const pref = cleanPreference(match[1]);
      if (pref) {
        preferences.push({
          preference: `typically ${pref}`,
          source: "explicit",
          confidence: 0.85,
        });
      }
    }
  }
  return preferences;
}

// Clean pref function
function cleanPreference(text: string): string | null {
  let cleaned = text.trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(/\s+(and|but|or|so|because|that|when|where)$/i, "");
  if (cleaned.length < 5 || cleaned.length > 200) {
    return null;
  }
  if (cleaned.match(/^(what|how|why|when|where|who|hello|hi|hey)/i)) {
    return null;
  }
  return cleaned;
}

// ============ Pattern Analysis ===========
export async function analyzeConversationPatterns(
  userId: string,
  recentMessages: ConversationMessage[],
): Promise<ExtractedPreference[]> {
  const preferences: ExtractedPreference[] = [];
  // Need at least 10 messages for patterns
  if (recentMessages.length < 10) {
    return preferences;
  }
  // Filter only user messages
  const userMessages = recentMessages.filter((m) => m.senderId === userId);
  if (userMessages.length < 5) {
    return preferences;
  }
  // Pattern 1: Msg length preference
  const avgLength =
    userMessages.reduce((sum, m) => sum + m.content.length, 0) /
    userMessages.length;
  if (avgLength < 50) {
    preferences.push({
      preference: "prefers brief, concise responses",
      source: "pattern_analysis",
      confidence: 0.7,
    });
  } else if (avgLength > 150) {
    preferences.push({
      preference: "prefers detailed, comprehensive responses",
      source: "pattern_analysis",
      confidence: 0.7,
    });
  }
  // Pattern 2: Question-asking frequency
  const questionCount = userMessages.filter(
    (m) =>
      m.content.includes("?") ||
      /^(what|how|why|when|where|who|can|could|would|should)/i.test(m.content),
  ).length;
  const questionRatio = questionCount / userMessages.length;
  if (questionRatio > 0.7) {
    preferences.push({
      preference: "likes to ask many questions and learn details",
      source: "pattern_analysis",
      confidence: 0.75,
    });
  }
  // Pattern 3: Formality level
  const casualWords = [
    "yeah",
    "yep",
    "yup",
    "gonna",
    "wanna",
    "kinda",
    "lol",
    "haha",
  ];
  const casualCount = userMessages.filter((m) =>
    casualWords.some((word) => m.content.toLowerCase().includes(word)),
  ).length;
  const casualRatio = casualCount / userMessages.length;
  if (casualRatio > 0.4) {
    preferences.push({
      preference: "prefers casual, friendly conversation style",
      source: "pattern_analysis",
      confidence: 0.65,
    });
  } else if (casualRatio < 0.1 && avgLength > 80) {
    preferences.push({
      preference: "prefers formal, professional communication",
      source: "pattern_analysis",
      confidence: 0.65,
    });
  }
  // Pattern 4: Response time expectation
  const timeDiffs: number[] = [];
  for (let i = 1; i < userMessages.length; i++) {
    const diff =
      userMessages[i].createdAt.getTime() -
      userMessages[i - 1].createdAt.getTime();
    timeDiffs.push(diff / 1000); // Convert to seconds
  }
  if (timeDiffs.length > 0) {
    const avgTimeDiff =
      timeDiffs.reduce((sum, t) => sum + t, 0) / timeDiffs.length;
    if (avgTimeDiff < 30) {
      preferences.push({
        preference: "expects quick responses, values speed",
        source: "pattern_analysis",
        confidence: 0.6,
      });
    }
  }
  return preferences;
}

// ============ Pref Management ===========
export async function extractAndUpdatePreferences(
  userId: string,
  userMessage: string,
  botResponse: string,
): Promise<void> {
  try {
    const explicit = extractExplicitPreferences(userMessage);
    if (explicit.length > 0) {
      console.log(`Found ${explicit.length} explicit preferences`);
      for (const pref of explicit) {
        await savePreference(userId, pref);
      }
    }
    const messageCount = await prisma.message.count({
      where: { senderId: userId },
    });
    if (messageCount % 10 === 0) {
      console.log("Running pattern analysis...");
      const recent = await getRecentMessages(userId, 30);
      const patterns = await analyzeConversationPatterns(userId, recent);
      if (patterns.length > 0) {
        console.log(`Found ${patterns.length} pattern-based preferences`);
        for (const pref of patterns) {
          await savePreference(userId, pref);
        }
      }
    }
  } catch (error) {
    console.error("Error extracting preferences:", error);
  }
}

// Save a preference, avoiding duplicates
async function savePreference(
  userId: string,
  extracted: ExtractedPreference,
): Promise<void> {
  const existing = await getUserPreferences(userId);
  const isDuplicate = existing.some(
    (e) =>
      e.preference.toLowerCase() === extracted.preference.toLowerCase() ||
      similarity(e.preference, extracted.preference) > 0.9,
  );
  if (isDuplicate) {
    console.log(
      `Skipping duplicate: ${extracted.preference.substring(0, 50)}...`,
    );
    return;
  }
  await insertUserPreference(
    userId,
    extracted.preference,
    extracted.source,
    extracted.confidence,
  );
  console.log(`Saved: ${extracted.preference.substring(0, 50)}...`);
}

// Get recent msg for pattern analysis
async function getRecentMessages(
  userId: string,
  limit: number = 30,
): Promise<ConversationMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      chatSession: {
        userId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      content: true,
      senderId: true,
      senderName: true,
      createdAt: true,
    },
  });
  return messages.reverse();
}

// Simple text similarity (Jaccard similarity); Returns 0-1 (higher = more similar)
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

// ============ Testing ===========
// AI Generated
export function testPreferenceExtraction(): void {
  console.log("\nTesting Preference Extraction...\n");
  const testCases = [
    "I prefer detailed explanations with examples",
    "I like getting quick answers but I don't like long paragraphs",
    "I always ask follow-up questions when I don't understand",
    "Hey, what's up? I wanna know about your product",
    "This is just a normal message without preferences",
  ];
  testCases.forEach((msg, i) => {
    console.log(`Test ${i + 1}: "${msg}"`);
    const prefs = extractExplicitPreferences(msg);
    if (prefs.length > 0) {
      prefs.forEach((p) => {
        console.log(`${p.preference} (${p.confidence * 100}% confidence)`);
      });
    } else {
      console.log(`No preferences found`);
    }
    console.log();
  });
  console.log("Test complete!\n");
}
