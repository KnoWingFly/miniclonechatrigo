import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences } from "@/lib/services/vector.service";

// ================== GET (Get user preferences)==================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params; 
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Fetch all preferences for this user
    const preferences = await getUserPreferences(userId);

    // Group by source for better organization
    const grouped = {
      explicit: preferences.filter((p) => p.source === "explicit"),
      pattern_analysis: preferences.filter(
        (p) => p.source === "pattern_analysis",
      ),
    };

    // Calculate some stats
    const stats = {
      total: preferences.length,
      explicit: grouped.explicit.length,
      inferred: grouped.pattern_analysis.length,
      avgConfidence:
        preferences.length > 0
          ? preferences.reduce((sum, p) => sum + p.confidence, 0) /
            preferences.length
          : 0,
    };
    return NextResponse.json({
      success: true,
      data: {
        all: preferences,
        bySource: grouped,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch user preferences" },
      { status: 500 },
    );
  }
}
