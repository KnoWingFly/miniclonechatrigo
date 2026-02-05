import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { openRouterClient } from "@/lib/openrouter";
import { chatService } from "@/lib/chat-service";

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
    const { chatSessionId } = body;

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

    // Retrieve conversation history (including the just-saved user message)
    const history = await chatService.getConversationHistory(
      chatSessionId,
      10, // limit
    );

    if (history.length === 0) {
      return NextResponse.json({ error: "No context found" }, { status: 400 });
    }

    // The last message in history should be the user's latest message if getConversationHistory returns chrono order
    // But getConversationHistory returns mapped objects {role, content}.
    // We need the raw content of the LAST user message to pass as 'userMessage' to buildMessageArray?
    // Actually buildMessageArray takes (systemPrompt, history[-1], userMessage).
    // Let's look at how it was used before:
    // const messages = chatService.buildMessageArray(sys, history, content);
    // 'content' was passed successfully in previous route because we had it in body.
    // Here we don't have 'content' in body, we just trigger.
    // So we should probably fetch the latest message from DB or expect it in history.

    // Let's reuse the logic but we need the latest 'content'.
    // We can fetch the latest message for this session.
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

    // We need history BEFORE the latest message roughly?
    // Actually chatService.getConversationHistory returns ALL messages including the latest one potentially if we just query.
    // Let's check chatService.buildMessageArray implementation in previous turns.
    // It pushes system, then ...history, then userMessage.
    // So 'history' passed to it should NOT include the latest userMessage if we pass it as 3rd arg.

    // Let's adjust: fetch history skipping the latest 1 if it matches?
    // Or simpler: just re-implement prompt building here carefully.

    // Determine system prompt and bot name
    let effectiveSystemPrompt = "";
    let aiName = "";

    if (session.botId) {
      const bot = await prisma.bot.findUnique({ where: { id: session.botId } });
      if (bot) {
        effectiveSystemPrompt = bot.systemPrompt;
        aiName = bot.name;
      }
    }

    const userContext = dbUser.name ? `The user's name is ${dbUser.name}.` : "";
    const finalSystemPrompt = `${effectiveSystemPrompt}\n${userContext}`;

    // Reconstruct messages for OpenRouter
    // We'll use the service but we need to match arguments.
    // history array from service is [{role, content}].
    // If we pass the latest message as 'content' arg, we should exclude it from 'history' arg.

    // Let's just manually build the array here for clarity and robust control
    const dbMessages = await prisma.message.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "desc" },
      take: 11, // 10 history + 1 latest
    });

    const chronological = dbMessages.reverse();
    const formattedMessages: any[] = [
      { role: "system", content: finalSystemPrompt },
      ...chronological.map((msg) => ({
        role: msg.senderId === "user" ? "user" : "assistant",
        content: msg.content,
      })),
    ];

    // Call OpenRouter API
    const aiResponse = await openRouterClient.getCompletion(formattedMessages);

    // Save AI response to database
    const aiMessage = await prisma.message.create({
      data: {
        chatSessionId,
        senderId: "ai-assistant",
        senderName: aiName,
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

    return NextResponse.json({ aiMessage }, { status: 201 });
  } catch (error: any) {
    console.error("AI trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
