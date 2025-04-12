import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface HeaderProps {
  profileName?: string;
  profilePic?: string;
}

export default function Header({ profileName, profilePic }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Clear any local storage data
        localStorage.removeItem('user_data');
        
        // Redirect to login page
        router.push('/auth/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            <span className="text-blue-600">Auto</span>Config A.I+
          </h1>
        </div>
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-2">
            {profilePic ? (
              <div className="relative h-8 w-8 rounded-full overflow-hidden border-2 border-blue-100">
                <img 
                  src={profilePic} 
                  alt={profileName || 'User'} 
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <span className="text-sm font-medium text-slate-700">{profileName || 'User'}</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="text-slate-600 hover:text-blue-600 transition-colors duration-150 text-sm font-medium"
          >
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </header>
  );
} 