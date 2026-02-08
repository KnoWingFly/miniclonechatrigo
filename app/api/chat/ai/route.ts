import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { openRouterClient } from "@/lib/openrouter";
import { chatService } from "@/lib/chat-service";
import { retrieveContext } from "@/lib/services/memory.service";
import { extractAndUpdatePreferences } from "@/lib/services/preferences.service";

// ========== POST(Trigger AI Response) ==========
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { message, chatSessionId } = body;
    if (!chatSessionId) {
      return NextResponse.json(
        { error: "Chat session ID is required" },
        { status: 400 },
      );
    }
    // Get database user
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Check session
    const session = await prisma.chatSession.findFirst({
      where: {
        id: chatSessionId,
        userId: dbUser.id,
      },
      select: {
        id: true,
        isAI: true,
        botId: true,
      },
    });
    if (!session || !session.isAI) {
      return NextResponse.json(
        { error: "Invalid session for AI" },
        { status: 400 },
      );
    }
    // Get bot info
    if (!session.botId) {
      return NextResponse.json(
        { error: "No bot associated with session" },
        { status: 400 },
      );
    }
    const bot = await prisma.bot.findUnique({
      where: { id: session.botId },
    });
    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }
    // Retrieve conversation history (including the just sended user message)
    const history = await chatService.getConversationHistory(
      chatSessionId,
      10, // limit
    );
    if (history.length === 0) {
      return NextResponse.json({ error: "No context found" }, { status: 400 });
    }
    const latestMessage = await prisma.message.findFirst({
      where: { chatSessionId, senderId: "user" },
      orderBy: { createdAt: "desc" },
    });
    if (!latestMessage) {
      return NextResponse.json(
        { error: "No user message found" },
        { status: 400 },
      );
    }
    const userMessage = latestMessage.content;

    // RAG Implementation
    const ragContext = await retrieveContext(
      userMessage,
      dbUser.id,
      session.botId,
      {
        topK: 7, // Choose top 7 most relevant results
        minSimilarity: 0.3, // ONLY include results with > 30% similarity
      },
    );

    console.log(`   - Product Info: ${ragContext.categories.product_info}`);
    console.log(`   - Business Rules: ${ragContext.categories.business_rules}`);
    console.log(`   - Instructions: ${ragContext.categories.instructions}`);
    console.log(
      `   - User Preferences: ${ragContext.categories.user_preferences}`,
    );
    const userContext = dbUser.name ? `The user's name is ${dbUser.name}.` : "";
    const enhancedSystemPrompt = `${bot.systemPrompt}
${userContext}
RELEVANT CONTEXT FROM KNOWLEDGE BASE:
${ragContext.formattedContext}
INSTRUCTIONS:
- Use the above context to provide accurate, helpful responses
- If the context contains relevant information, reference it in your answer
- If the context doesn't help with this specific question, respond based on your general knowledge
- Be conversational and personalized based on user preferences shown above`;

    // Get conversation history for LLM
    const dbMessages = await prisma.message.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "desc" },
      take: 11, // 10 history + 1 latest
    });
    const chronological = dbMessages.reverse();
    const formattedMessages: any[] = [
      { role: "system", content: enhancedSystemPrompt },
      ...chronological.map((msg) => ({
        role: msg.senderId === "user" ? "user" : "assistant",
        content: msg.content,
      })),
    ];

    const aiResponse = await openRouterClient.getCompletion(formattedMessages);

    // Save AI response to database
    const aiMessage = await prisma.message.create({
      data: {
        chatSessionId,
        senderId: "ai-assistant",
        senderName: bot.name,
        content: aiResponse,
        isRead: true,
        isDelivered: true,
      },
    });

    // Mark the user's last message as read (Blue Ticks)
    if (latestMessage) {
      await prisma.message.update({
        where: { id: latestMessage.id },
        data: { isRead: true },
      });
    }

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: chatSessionId },
      data: { updatedAt: new Date() },
    });
    // Update user Preferences
    extractAndUpdatePreferences(dbUser.id, userMessage, aiResponse)
      .then(() => {
        console.log("User preferences updated");
      })
      .catch((err) => {
        console.error("Error updating preferences (non-critical):", err);
      });
    return NextResponse.json({ aiMessage }, { status: 201 });
  } catch (error: any) {
    console.error("AI trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
