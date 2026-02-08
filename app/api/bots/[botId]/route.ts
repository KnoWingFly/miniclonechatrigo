import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// ========== PATCH (Update Bot) ==========
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const { botId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { systemPrompt } = body;

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "System prompt is required" },
        { status: 400 },
      );
    }

    // Update bot
    const updatedBot = await prisma.bot.update({
      where: { id: botId },
      data: { systemPrompt },
    });

    return NextResponse.json({ bot: updatedBot });
  } catch (error) {
    console.error("PATCH bot error:", error);
    return NextResponse.json(
      { error: "Failed to update bot" },
      { status: 500 },
    );
  }
}

// ========== GET (Get Bot) ==========
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> },
) {
  try {
    const { botId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    return NextResponse.json({ bot });
  } catch (error) {
    console.error("GET bot error:", error);
    return NextResponse.json({ error: "Failed to fetch bot" }, { status: 500 });
  }
}
