import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    await connectDB();
    console.log('Connected to database for registration');
    
    const { name, email, password, role, jobTitle } = await req.json();
    console.log('Registration attempt:', { name, email, role, jobTitle });

    // Validate input
    if (!name || !email || !password) {
      console.log('Validation failed: Missing required fields');
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists with email:', email);
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    try {
      const user = await User.create({
        name,
        email,
        password, // Password will be hashed by the pre-save hook in the User model
        role: role || 'employee',
        jobTitle: jobTitle || '',
        isActive: true,
      });

      console.log('User created successfully:', user._id);

      // Return success response (excluding password)
      return NextResponse.json({
        message: 'Registration successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          jobTitle: user.jobTitle,
          isActive: user.isActive,
        }
      });
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { message: `Failed to create user: ${createError.message}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: `Registration failed: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 