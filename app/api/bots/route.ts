import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// =============== GET (List all bots) ===============
export async function GET() {
  try {
    const bots = await prisma.bot.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ bots });
  } catch (error) {
    console.error("GET bots error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bots" },
      { status: 500 },
    );
  }
}

// =============== POST (Create a new bot (for seeding/admin)) ===============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, avatar, systemPrompt } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json(
        { error: "Name and system prompt are required" },
        { status: 400 },
      );
    }

    const bot = await prisma.bot.create({
      data: {
        name,
        description: description || "",
        avatar,
        systemPrompt,
      },
    });

    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    console.error("POST bot error:", error);
    return NextResponse.json(
      { error: "Failed to create bot" },
      { status: 500 },
    );
  }
}
