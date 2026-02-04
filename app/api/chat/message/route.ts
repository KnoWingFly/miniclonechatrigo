import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// =============== GET (Fetch messages) =============== 
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const chatSessionId = searchParams.get('chatSessionId')
    if (!chatSessionId) {
      return NextResponse.json({ error: 'Chat session ID is required' }, { status: 400 })
    }
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const session = await prisma.chatSession.findFirst({
      where: {
        id: chatSessionId,
        userId: dbUser.id,
      },
    })
    if (!session) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }
    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =============== POST (Send a new message) =============== 
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { chatSessionId, senderId, senderName, content } = body
    if (!chatSessionId || !senderId || !senderName || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const session = await prisma.chatSession.findFirst({
      where: {
        id: chatSessionId,
        userId: dbUser.id,
      },
    })
    if (!session) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
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
    })
    // Update session's updatedAt timestamp
    await prisma.chatSession.update({
      where: { id: chatSessionId },
      data: { updatedAt: new Date() },
    })
    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}