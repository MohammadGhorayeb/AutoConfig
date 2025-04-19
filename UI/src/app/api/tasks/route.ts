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
    console.log('Connected to database for task creation');
    
    // Parse body
    let body;
    try {
      body = await req.json();
      console.log('Received task data:', body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid request body', error: String(parseError) },
        { status: 400 }
      );
    }
    
    const { title, description, assignedTo, dueDate } = body;
    
    // Validate input
    if (!title || !description || !assignedTo) {
      console.warn('Missing required task fields');
      return NextResponse.json(
        { success: false, message: 'Please provide title, description, and assignedTo' },
        { status: 400 }
      );
    }
    
    console.log('Creating new task for employee:', assignedTo);
    
    // For admin dashboard, use a default creator instead of requiring authentication
    const creatorId = '000000000000000000000000'; // Default admin ID or placeholder
    
    try {
      // Create task
      const task = await Task.create({
        title,
        description,
        assignedTo,
        createdBy: creatorId,
        status: 'pending',
        dueDate: dueDate || undefined,
      });
      
      console.log('Task created successfully:', task._id);
      
      return NextResponse.json({
        success: true,
        message: 'Task created successfully',
        task: task
      });
    } catch (createError) {
      console.error('Error creating task in database:', createError);
      return NextResponse.json(
        { success: false, message: 'Failed to create task in database', error: String(createError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create task', error: String(error) },
      { status: 500 }
    );
  }
} 