import React, { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { UserType, EmployeeRole } from '../types/auth';

interface AuthFormsProps {
  selectedType: UserType;
  selectedRole: EmployeeRole | null;
  onSuccess: () => void;
}

export function AuthForms({ selectedType, selectedRole, onSuccess }: AuthFormsProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (selectedType === 'employee' && !selectedRole) {
        toast.error('Please select your role before continuing');
        setIsLoading(false);
        return;
      }

      if (isSignUp) {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (existingUser) {
          toast.error('An account with this email already exists. Please sign in instead.');
          setIsSignUp(false);
          setIsLoading(false);
          return;
        }

        // Create new user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: selectedType,
              employee_role: selectedRole
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          toast.success('Account created successfully! Please sign in.');
          setIsSignUp(false);
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          toast.error('Invalid email or password. Please try again.');
          setIsLoading(false);
          return;
        }

        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) throw profileError;

          // Verify user type matches selected type
          if (profile.user_type !== selectedType) {
            toast.error(`This account is registered as a ${profile.user_type}. Please select the correct type.`);
            await supabase.auth.signOut();
            return;
          }

          toast.success('Successfully signed in!');
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || (selectedType === 'employee' && !selectedRole)}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSignUp ? (
            <UserPlus className="h-5 w-5" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          {isLoading
            ? 'Processing...'
            : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      <div className="text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}