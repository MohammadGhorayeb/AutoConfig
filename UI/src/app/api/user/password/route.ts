import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { currentPassword, newPassword } = await req.json();
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long' },
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
    
    // Find user in database
    const user = await User.findById(userData.id);
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Update password and reset temporary flag
    user.password = newPassword;
    user.isPasswordTemporary = false;
    await user.save();
    
    // Update the cookie with the new user data
    const updatedUserData = {
      ...userData,
      isPasswordTemporary: false
    };
    
    cookieStore.set({
      name: 'user_session',
      value: encodeURIComponent(JSON.stringify(updatedUserData)),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update password' },
      { status: 500 }
    );
  }
} 