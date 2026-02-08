import { NextRequest, NextResponse } from "next/server";
import {
  addKnowledge,
  modifyKnowledge,
  removeKnowledge,
  listKnowledge,
} from "@/lib/services/memory.service";
import type { KnowledgeCategory } from "@/lib/services/vector.service";

// ================== GET (CRUD operations)==================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as KnowledgeCategory | null;
    const botId = searchParams.get("botId");

    if (!botId) {
      return NextResponse.json(
        { error: "Bot ID is required" },
        { status: 400 },
      );
    }

    if (
      category &&
      !["product_info", "business_rules", "instructions"].includes(category)
    ) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be: product_info, business_rules, or instructions`,
        },
        { status: 400 },
      );
    }

    const knowledge = await listKnowledge(botId, category || undefined);

    return NextResponse.json({
      success: true,
      data: knowledge,
      count: knowledge.length,
    });
  } catch (error) {
    console.error("Error listing knowledge:", error);
    return NextResponse.json(
      { error: "Failed to list knowledge" },
      { status: 500 },
    );
  }
}

// ================== POST (Add new knowledge)==================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log(
      "Received POST request with body:",
      JSON.stringify(body, null, 2),
    );

    // Validate required fields
    const { botId, category, title, content, metadata } = body;
    if (!botId || !category || !title || !content) {
      console.log("Validation failed - missing fields:", {
        botId: !!botId,
        category: !!category,
        title: !!title,
        content: !!content,
      });
      return NextResponse.json(
        { error: "Missing required fields: botId, category, title, content" },
        { status: 400 },
      );
    }

    // Validate category
    if (
      !["product_info", "business_rules", "instructions"].includes(category)
    ) {
      console.log("Validation failed - invalid category:", category);
      return NextResponse.json(
        {
          error:
            "Invalid category. Must be: product_info, business_rules, or instructions",
        },
        { status: 400 },
      );
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      console.log("Validation failed - invalid title length:", title.length);
      return NextResponse.json(
        { error: "Title must be between 3 and 200 characters" },
        { status: 400 },
      );
    }

    // Validate content length
    if (content.length < 10) {
      console.log("Validation failed - content too short:", content.length);
      return NextResponse.json(
        { error: "Content must be at least 10 characters" },
        { status: 400 },
      );
    }

    // Add to knowledge base (auto generate embedding)
    const entry = await addKnowledge(
      botId,
      category as KnowledgeCategory,
      title,
      content,
      metadata || null,
    );
    return NextResponse.json(
      {
        success: true,
        data: entry,
        message: "Knowledge entry created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating knowledge:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge entry" },
      { status: 500 },
    );
  }
}

// ================== PUT (Modify existing knowledge)==================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { id, botId, title, content, metadata } = body;
    if (!id || !botId) {
      return NextResponse.json(
        { error: "Missing required fields: id, botId" },
        { status: 400 },
      );
    }

    // Must have at least one field to update
    if (!title && !content && !metadata) {
      return NextResponse.json(
        {
          error:
            "Must provide at least one field to update (title, content, or metadata)",
        },
        { status: 400 },
      );
    }

    // Build updates object
    const updates: any = {};
    if (title) updates.title = title;
    if (content) updates.content = content;
    if (metadata) updates.metadata = metadata;

    // Update knowledge
    const entry = await modifyKnowledge(id, botId, updates);
    return NextResponse.json({
      success: true,
      data: entry,
      message: "Knowledge entry updated successfully",
    });
  } catch (error) {
    console.error("Error updating knowledge:", error);

    // Check if entry not found
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Knowledge entry not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update knowledge entry" },
      { status: 500 },
    );
  }
}

// ================== DELETE (Remove knowledge)==================
export async function DELETE(request: NextRequest) {
  try {
    // Get ID and botId from query params
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const botId = searchParams.get("botId");

    if (!id || !botId) {
      return NextResponse.json(
        { error: "Missing required parameters: id and botId" },
        { status: 400 },
      );
    }

    // Delete the entry
    await removeKnowledge(id, botId);
    return NextResponse.json({
      success: true,
      message: "Knowledge entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting knowledge:", error);

    // Check if entry not found
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Knowledge entry not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete knowledge entry" },
      { status: 500 },
    );
  }
}
