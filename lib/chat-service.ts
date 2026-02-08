// lib/chat-service.ts

import { PrismaClient } from "@prisma/client";
import { ChatMessage } from "@/types/chat";

const prisma = new PrismaClient();

export class ChatService {
  async getConversationHistory(
    chatSessionId: string,
    limit: number = 10,
  ): Promise<ChatMessage[]> {
    try {
      const messages = await prisma.message.findMany({
        where: {
          chatSessionId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        select: {
          senderId: true,
          senderName: true,
          content: true,
          createdAt: true,
        },
      });

      const chronologicalMessages = messages.reverse();

      return chronologicalMessages.map((msg) => ({
        role: msg.senderName === "AI Assistant" ? "assistant" : "user",
        content: msg.content,
      }));
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      return [];
    }
  }

  async saveUserMessage(
    chatSessionId: string,
    userId: string,
    userName: string,
    content: string,
  ) {
    try {
      const message = await prisma.message.create({
        data: {
          chatSessionId,
          senderId: userId,
          senderName: userName,
          content,
          isRead: false,
          isDelivered: true,
        },
      });

      await prisma.chatSession.update({
        where: { id: chatSessionId },
        data: { updatedAt: new Date() },
      });

      return message;
    } catch (error) {
      console.error("Error saving user message:", error);
      throw new Error("Failed to save user message");
    }
  }

  async saveAIMessage(chatSessionId: string, content: string) {
    try {
      const message = await prisma.message.create({
        data: {
          chatSessionId,
          senderId: "ai-assistant",
          senderName: "AI Assistant",
          content,
          isRead: true,
          isDelivered: true,
        },
      });

      await prisma.chatSession.update({
        where: { id: chatSessionId },
        data: { updatedAt: new Date() },
      });

      return message;
    } catch (error) {
      console.error("Error saving AI message:", error);
      throw new Error("Failed to save AI message");
    }
  }

  async verifyChatSession(
    chatSessionId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: chatSessionId,
          userId,
        },
      });

      return !!session;
    } catch (error) {
      console.error("Error verifying chat session:", error);
      return false;
    }
  }

  buildMessageArray(
    systemPrompt: string,
    history: ChatMessage[],
    userMessage: string,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    messages.push({
      role: "system",
      content: systemPrompt,
    });

    messages.push(...history);

    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }
}

export const chatService = new ChatService();
