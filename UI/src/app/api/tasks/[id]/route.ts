import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';

// GET single task
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const task = await Task.findById(params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');
    
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PATCH update task
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const { status, title, description, dueDate } = await req.json();
    
    // Check if task exists
    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Update the task
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    
    const updatedTask = await Task.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).populate('assignedTo', 'name email').populate('createdBy', 'name');
    
    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const task = await Task.findByIdAndDelete(params.id);
    
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete task' },
      { status: 500 }
    );
  }
} 