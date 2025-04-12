import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// PATCH to update employee status (active/inactive)
export async function PATCH(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    console.log('Connected to database for employee status update');
    
    const { id } = params;
    const { isActive } = await req.json();
    
    // Find and update the employee
    const employee = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!employee) {
      return NextResponse.json(
        { message: 'Employee not found' },
        { status: 404 }
      );
    }
    
    console.log('Employee status updated:', employee._id, 'isActive:', isActive);
    
    return NextResponse.json({
      message: 'Employee status updated successfully',
      employee
    });
  } catch (error) {
    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { message: 'Failed to update employee status' },
      { status: 500 }
    );
  }
} 