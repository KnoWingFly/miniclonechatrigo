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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatSessionId = searchParams.get("chatSessionId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!chatSessionId) {
      return NextResponse.json(
        { error: "Chat session ID is required" },
        { status: 400 },
      );
    }

    // Verification
    const session = await prisma.chatSession.findFirst({
      where: {
        id: chatSessionId,
        user: { supabaseId: user.id }, 
      },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch messages with pagination and specific fields
    const messages = await prisma.message.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        senderId: true,
        senderName: true,
        isRead: true,
        isDelivered: true,
        createdAt: true,
      },
    });

    // Reverse to show in chronological order
    return NextResponse.json({ messages: messages.reverse() });
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
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { chatSessionId, content, senderName } = await request.json();

    const [newMessage] = await prisma.$transaction([
      prisma.message.create({
        data: {
          chatSessionId,
          content,
          senderId: "user",
          senderName,
        },
      }),
      prisma.chatSession.update({
        where: { id: chatSessionId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
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

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      console.log("PATCH - DB User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateResult = await prisma.message.updateMany({
      where: {
        chatSessionId: chatSessionId,
        senderId: { not: "user" },
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

// =============== DELETE (Clear all messages in a session) ===============
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const chatSessionId = searchParams.get("chatSessionId");

    if (!chatSessionId)
      return NextResponse.json(
        { error: "Required ID missing" },
        { status: 400 },
      );

    const session = await prisma.chatSession.findFirst({
      where: { id: chatSessionId, user: { supabaseId: user.id } },
    });

    if (!session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    await prisma.message.deleteMany({ where: { chatSessionId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear chat" },
      { status: 500 },
    );
  }
}
