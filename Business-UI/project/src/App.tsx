import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { RoleSelection } from './components/RoleSelection';
import { AuthForms } from './components/AuthForms';
import { BusinessDashboard } from './pages/BusinessDashboard';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import type { UserProfile, UserType, EmployeeRole } from './types/auth';

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleAuthChange('SIGNED_IN', session);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

  const handleAuthChange = async (event: string, session: any) => {
    if (session?.user) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) throw error;

        setSelectedType(profile.user_type);
        setSelectedRole(profile.employee_role);
        setIsSignedIn(true);
        setUserProfile(profile);

        if (profile.user_type === 'business') {
          await Promise.all([fetchEmployees(), fetchProjects()]);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        await handleSignOut();
      }
    } else {
      clearAppState();
    }
  };

  const clearAppState = () => {
    setIsSignedIn(false);
    setUserProfile(null);
    setEmployees([]);
    setProjects([]);
    setShowAuthForm(false);
    setSelectedType(null);
    setSelectedRole(null);
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearAppState();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthForm(false);
    setIsSignedIn(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <Toaster position="top-right" />
      {!isSignedIn ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <div className="flex items-center justify-center mb-8">
              <Building2 className="h-12 w-12 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">
              {showAuthForm ? (
                `${selectedType === 'business' ? 'Business' : 'Employee'} Portal`
              ) : (
                'Welcome'
              )}
            </h1>
            
            {!showAuthForm ? (
              <RoleSelection
                selectedType={selectedType}
                selectedRole={selectedRole}
                onTypeSelect={setSelectedType}
                onRoleSelect={setSelectedRole}
                onSubmit={() => setShowAuthForm(true)}
              />
            ) : (
              <>
                <AuthForms
                  selectedType={selectedType!}
                  selectedRole={selectedRole}
                  onSuccess={handleAuthSuccess}
                />
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      setShowAuthForm(false);
                      setSelectedType(null);
                      setSelectedRole(null);
                    }}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Back to Type Selection
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        userProfile?.user_type === 'business' ? (
          <BusinessDashboard
            userProfile={userProfile}
            employees={employees}
            projects={projects}
            onSignOut={handleSignOut}
            fetchEmployees={fetchEmployees}
            fetchProjects={fetchProjects}
          />
        ) : (
          <EmployeeDashboard
            userProfile={userProfile}
            onSignOut={handleSignOut}
          />
        )
      )}
    </div>
  );
}

export default App;