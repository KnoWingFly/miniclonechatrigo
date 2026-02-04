import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// =============== GET (Fetch all chat sessions) ===============
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await prisma.chatSession.findMany({
      where: {
        user: { supabaseId: user.id },
      },
      select: {
        id: true,
        contactName: true,
        contactAvatar: true,
        isAI: true,
        isOnline: true,
        updatedAt: true,
        _count: {
          select: {
            messages: { where: { isRead: false, senderId: { not: "user" } } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, 
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("GET sessions - Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============== POST (Create new chat session) ===============
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { contactName, contactAvatar, isAI } = body;
    if (!contactName) {
      return NextResponse.json(
        { error: "Contact name is required" },
        { status: 400 },
      );
    }
    // Find user
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Create chat session
    const session = await prisma.chatSession.create({
      data: {
        userId: dbUser.id,
        contactName,
        contactAvatar: contactAvatar || null,
        isAI: isAI || false,
      },
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// =============== DELETE (Delete entire session) ===============
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (!sessionId)
      return NextResponse.json(
        { error: "Session ID missing" },
        { status: 400 },
      );

    await prisma.chatSession.delete({
      where: { id: sessionId, user: { supabaseId: user.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
