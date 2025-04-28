import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db';
import User from '@/models/User';

// This is an implementation that will check the database for current user status
export async function GET() {
  try {
    await connectDB();
    
    // Get the user's session or token from cookies
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user_session');
    
    let userData;
    
    if (userCookie) {
      try {
        // Parse the user data from the cookie
        userData = JSON.parse(decodeURIComponent(userCookie.value));
        
        // If we have user data and an ID, verify the user's current status in the database
        if (userData && userData.id) {
          // Check if the user still exists and is active
          const currentUser = await User.findById(userData.id).select('-password');
          
          if (!currentUser) {
            // User no longer exists
            return NextResponse.json(
              { message: 'User not found', isDeactivated: true },
              { status: 404 }
            );
          }
          
          // For employees, check if they're still active
          if (userData.role === 'employee' && !currentUser.isActive) {
            return NextResponse.json(
              { message: 'Your account has been deactivated', isDeactivated: true },
              { status: 403 }
            );
          }
          
          // Update user data with the latest from the database
          userData = {
            id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            jobTitle: currentUser.jobTitle,
            isActive: currentUser.isActive,
            isPasswordTemporary: currentUser.isPasswordTemporary
          };
        }
      } catch (e) {
        console.error('Error parsing user cookie or fetching user:', e);
      }
    }
    
    if (!userData) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Return the user data
    return NextResponse.json({ 
      message: 'Profile retrieved successfully',
      user: userData
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve user profile' },
      { status: 500 }
    );
  }
} 