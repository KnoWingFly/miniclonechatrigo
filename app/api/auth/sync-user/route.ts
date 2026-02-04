// app/api/auth/sync-user/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "User already exists",
        user: existingUser,
      });
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        supabaseId: user.id,
        email: user.email!,
        name:
          user.user_metadata?.username ||
          user.user_metadata?.name ||
          user.email?.split("@")[0],
      },
    });

    return NextResponse.json({
      success: true,
      message: "User synced successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
