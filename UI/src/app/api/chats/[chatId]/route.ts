import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import Chat from '@/models/Chat';
import { verifyToken } from '@/lib/auth';

// Get a specific chat
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
    
    // Find the chat
    const chat = await Chat.findOne({ _id: chatId, userId: decoded.id });
    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch chat' }, { status: 500 });
  }
}

// Update chat details (title, etc.)
export async function PATCH(
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
    
    // Get data from request body
    const data = await request.json();
    
    // Connect to DB
    await connectDB();
    
    // Find and update the chat
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId: decoded.id },
      { 
        ...data,
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, chat });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ success: false, message: 'Failed to update chat' }, { status: 500 });
  }
}

// Delete a chat
export async function DELETE(
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
    
    // Delete the chat
    const result = await Chat.deleteOne({ _id: chatId, userId: decoded.id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete chat' }, { status: 500 });
  }
} 