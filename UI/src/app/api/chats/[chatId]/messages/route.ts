import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import ChatMessage from '@/models/ChatMessage';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';

// Get messages for a specific chat
export async function GET(
  request: Request,
  { params }: { params: { chatId: string } }
) {
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
    
    const { chatId } = params;
    if (!chatId) {
      return NextResponse.json({ success: false, message: 'Chat ID is required' }, { status: 400 });
    }
    
    // Connect to DB
    await connectDB();
    
    // First verify the chat belongs to the user
    const chat = await Chat.findOne({ _id: chatId, userId: decoded.id });
    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 });
    }
    
    // Get messages for this chat
    const messages = await ChatMessage.find({ chatId }).sort({ timestamp: 1 });
    
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch messages' }, { status: 500 });
  }
}

// Add a new message to a chat
export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
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
    
    const { chatId } = params;
    if (!chatId) {
      return NextResponse.json({ success: false, message: 'Chat ID is required' }, { status: 400 });
    }
    
    // Get message data from request body
    const data = await request.json();
    const { content, sender } = data;
    
    if (!content || !sender) {
      return NextResponse.json({ success: false, message: 'Content and sender are required' }, { status: 400 });
    }
    
    // Connect to DB
    await connectDB();
    
    // First verify the chat belongs to the user
    const chat = await Chat.findOne({ _id: chatId, userId: decoded.id });
    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 });
    }
    
    // Create new message
    const message = await ChatMessage.create({
      chatId,
      content,
      sender,
      timestamp: new Date()
    });
    
    // Update the chat's lastMessage
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: content,
      updatedAt: new Date()
    });
    
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ success: false, message: 'Failed to create message' }, { status: 500 });
  }
} 