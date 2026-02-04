import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// =============== GET (Fetch all chat sessions) =============== 
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Find/create user 
    let dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })
    
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0],
        },
      })
    }
    
    // Fetch all chat sessions (Last message + Unread Count)
    const sessions = await prisma.chatSession.findMany({
      where: { userId: dbUser.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // fetch the last message for preview
        },
        // Count unread messages
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: 'user' } 
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })
    
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching chat sessions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============== POST (Create new chat session) =============== 
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { contactName, contactAvatar, isAI } = body
    if (!contactName) {
      return NextResponse.json({ error: 'Contact name is required' }, { status: 400 })
    }
    // Find user
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    // Create chat session
    const session = await prisma.chatSession.create({
      data: {
        userId: dbUser.id,
        contactName,
        contactAvatar: contactAvatar || null,
        isAI: isAI || false,
      },
    })
    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Error creating chat session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}