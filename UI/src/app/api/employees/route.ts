import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// GET all employees
export async function GET() {
  try {
    await connectDB();
    console.log('Connected to database for employee listing');
    
    // Find all users with role 'employee'
    const employees = await User.find({ role: 'employee' }).select('-password');
    
    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { message: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST new employee
export async function POST(req: Request) {
  try {
    await connectDB();
    console.log('Connected to database for employee creation');
    
    const { name, email, jobTitle } = await req.json();
    
    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    // Generate a temporary password (in a real app, you might want to send this via email)
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create new employee
    const employee = await User.create({
      name,
      email,
      password: tempPassword, // Will be hashed by pre-save hook
      role: 'employee',
      jobTitle: jobTitle || '',
      isActive: true,
      isPasswordTemporary: true, // This is a temporary password that needs to be changed
    });
    
    console.log('Employee created successfully:', employee._id);
    
    return NextResponse.json({
      message: 'Employee added successfully',
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        jobTitle: employee.jobTitle,
        isActive: employee.isActive,
      },
      tempPassword: tempPassword // Include the temporary password in the response
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { message: 'Failed to add employee' },
      { status: 500 }
    );
  }
} 