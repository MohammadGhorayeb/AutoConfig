import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';

// Get all chats for the current user
export async function GET() {
  try {
    // Get the session token
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    // Verify the token and get user ID
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    
    // Connect to DB
    await connectDB();
    
    // Find all chats for this user
    const chats = await Chat.find({ userId: decoded.id }).sort({ updatedAt: -1 });
    
    return NextResponse.json({ success: true, chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch chats' }, { status: 500 });
  }
}

// Create a new chat
export async function POST(request: Request) {
  try {
    // Get the session token
    const cookieStore = cookies();
    const token = cookieStore.get('session_token')?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    
    // Verify the token and get user ID
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.id) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }
    
    // Get chat data from request body
    const data = await request.json();
    const { title, lastMessage } = data;
    
    // Connect to DB
    await connectDB();
    
    // Create new chat
    const chat = await Chat.create({
      userId: decoded.id,
      title: title || 'New Conversation',
      lastMessage: lastMessage || 'How can I assist you today?',
      timestamp: new Date()
    });
    
    return NextResponse.json({ success: true, chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ success: false, message: 'Failed to create chat' }, { status: 500 });
  }
} 