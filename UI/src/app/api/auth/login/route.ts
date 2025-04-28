import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { cookies } from 'next/headers';
import { generateToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { email, password, role } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user role matches
    if (user.role !== role) {
      return NextResponse.json(
        { message: `You don't have access as a ${role}` },
        { status: 403 }
      );
    }

    // For employees, check if account is active
    if (user.role === 'employee' && !user.isActive) {
      return NextResponse.json(
        { message: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Return user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      isActive: user.isActive,
      isPasswordTemporary: user.isPasswordTemporary || false,
    };

    // Set a cookie with the user data
    const cookieStore = cookies();
    cookieStore.set({
      name: 'user_session',
      value: encodeURIComponent(JSON.stringify(userData)),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // Generate and set a JWT token
    const token = generateToken({ id: user._id, email: user.email });
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // In a real app, you would create a JWT token here
    return NextResponse.json({ 
      message: 'Login successful',
      user: userData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 