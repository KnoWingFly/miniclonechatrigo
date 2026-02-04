import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// =============== GET (Fetch messages) ===============
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("GET messages - No user authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatSessionId = searchParams.get("chatSessionId");

    console.log("GET messages - Request for sessionId:", chatSessionId);

    if (!chatSessionId) {
      return NextResponse.json(
        { error: "Chat session ID is required" },
        { status: 400 },
      );
    }

    // Find or create user
    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      console.log("GET messages - Creating new user:", user.id);
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0],
        },
      });
    }

    console.log("GET messages - Current user ID:", dbUser.id);

    // Check if session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: chatSessionId },
    });

    console.log(
      "GET messages - Session found:",
      !!session,
      "Session userId:",
      session?.userId,
    );

    if (!session) {
      console.log("GET messages - Session not found, returning empty messages");
      return NextResponse.json({ messages: [] });
    }

    if (session.userId !== dbUser.id) {
      console.log(
        "GET messages - User mismatch! Session user:",
        session.userId,
        "Current user:",
        dbUser.id,
      );
      return NextResponse.json({ messages: [] });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "asc" },
    });

    console.log("GET messages - Found", messages.length, "messages");

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET messages - Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        messages: [],
      },
      { status: 500 },
    );
  }
}

// =============== POST (Send a new message) ===============
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("POST message - No user authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chatSessionId, senderId, senderName, content } = body;

    console.log("POST message - Request:", {
      chatSessionId,
      senderId,
      senderName,
    });

    if (!chatSessionId || !senderId || !senderName || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Find or create user
    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      console.log("POST message - Creating new user:", user.id);
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0],
        },
      });
    }

    console.log("POST message - Current user ID:", dbUser.id);

    // Check if session exists
    const session = await prisma.chatSession.findUnique({
      where: { id: chatSessionId },
    });

    console.log(
      "POST message - Session found:",
      !!session,
      "Session userId:",
      session?.userId,
    );

    if (!session) {
      console.log("POST message - Session not found!");
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 },
      );
    }

    if (session.userId !== dbUser.id) {
      console.log("POST message - User mismatch!");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chatSessionId,
        senderId,
        senderName,
        content,
        isDelivered: true,
        isRead: false,
      },
    });

    console.log("POST message - Message created:", message.id);

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: chatSessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("POST message - Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============== PATCH (Mark messages as read) ===============
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.log("PATCH - Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chatSessionId } = body;

    console.log(`PATCH - Marking read for Session: ${chatSessionId}`);

    if (!chatSessionId) {
      return NextResponse.json(
        { error: "Chat session ID is required" },
        { status: 400 },
      );
    }

    // 1. Verify User
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      console.log("PATCH - DB User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Perform Update
    // We explicitly check for messages where senderId is NOT 'user'
    const updateResult = await prisma.message.updateMany({
      where: {
        chatSessionId: chatSessionId,
        senderId: { not: "user" }, // Ensure we don't mark our own messages as "read by us"
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    console.log(`PATCH - Updated ${updateResult.count} messages to Read`);

    return NextResponse.json(
      { success: true, updated: updateResult.count },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH message - Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
