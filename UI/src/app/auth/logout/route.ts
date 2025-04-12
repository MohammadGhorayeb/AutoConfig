import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get the cookie store
    const cookieStore = cookies();
    
    // Delete the session token cookie
    cookieStore.delete('session_token');
    
    // Also delete the user session cookie
    cookieStore.delete('user_session');
    
    // Redirect to login page
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}

export async function POST() {
  // Handle POST logout requests as well
  return GET();
} 