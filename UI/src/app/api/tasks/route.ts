import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import { cookies } from 'next/headers';

// GET all tasks (with optional filtering)
export async function GET(req: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get('assignedTo');
    const createdBy = searchParams.get('createdBy');
    
    // Build query based on params
    const query: any = {};
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;
    
    // Get tasks based on query
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST new task
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { title, description, assignedTo, dueDate } = await req.json();
    
    // Validate input
    if (!title || !description || !assignedTo) {
      return NextResponse.json(
        { success: false, message: 'Please provide title, description, and assignedTo' },
        { status: 400 }
      );
    }
    
    // Get current user from cookie
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user_session');
    
    if (!userCookie) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Parse user data from cookie
    const userData = JSON.parse(decodeURIComponent(userCookie.value));
    
    // Create task
    const task = await Task.create({
      title,
      description,
      assignedTo,
      createdBy: userData.id,
      status: 'pending',
      dueDate: dueDate || undefined,
    });
    
    // Populate assignedTo field
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');
    
    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create task' },
      { status: 500 }
    );
  }
} 