import React, { useState, useEffect } from 'react';
import { UserCircle2, Calendar, CheckCircle2, Clock, MessageSquare, BellRing, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Chat } from '../components/Chat';
import type { UserProfile } from '../types/auth';
import type { Task, EmployeeProfile, EmployeeAttendance } from '../types/database';

interface EmployeeDashboardProps {
  userProfile: UserProfile;
  onSignOut: () => Promise<void>;
}

export function EmployeeDashboard({ userProfile, onSignOut }: EmployeeDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeEmployee = async () => {
      try {
        await fetchEmployeeProfile();
        await Promise.all([
          fetchTasks(),
          fetchAttendance(),
          checkAttendanceStatus()
        ]);
      } catch (error) {
        console.error('Error initializing employee dashboard:', error);
        toast.error('Failed to initialize dashboard');
      } finally {
        setIsInitializing(false);
      }
    };

    if (userProfile?.id) {
      initializeEmployee();
    }
  }, [userProfile?.id]);

  const fetchEmployeeProfile = async () => {
    try {
      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid PGRST116 error

      if (!existingProfile && !fetchError) {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('employee_profiles')
          .insert([{
            user_id: userProfile.id,
            full_name: userProfile.email.split('@')[0],
            position: userProfile.employee_role || 'New Employee',
            department: 'General',
            salary: 0,
            hire_date: new Date().toISOString().split('T')[0],
            status: 'active'
          }])
          .select()
          .single();

        if (createError) throw createError;
        setEmployeeProfile(newProfile);
      } else if (fetchError) {
        throw fetchError;
      } else {
        setEmployeeProfile(existingProfile);
      }
    } catch (error) {
      console.error('Error handling employee profile:', error);
      toast.error('Failed to load employee profile');
      throw error;
    }
  };

  const fetchTasks = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userProfile.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
    }
  };

  const fetchAttendance = async () => {
    if (!employeeProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('employee_id', employeeProfile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance records');
    }
  };

  const checkAttendanceStatus = async () => {
    if (!employeeProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('employee_id', employeeProfile.id)
        .is('check_out', null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsCheckedIn(!!data);
    } catch (error) {
      console.error('Error checking attendance status:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!employeeProfile?.id) return;

    try {
      const { error } = await supabase
        .from('employee_attendance')
        .insert([{
          employee_id: employeeProfile.id,
          status: 'present'
        }]);

      if (error) throw error;
      toast.success('Successfully checked in');
      await Promise.all([fetchAttendance(), checkAttendanceStatus()]);
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    if (!employeeProfile?.id) return;

    try {
      const { error } = await supabase
        .from('employee_attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('employee_id', employeeProfile.id)
        .is('check_out', null);

      if (error) throw error;
      toast.success('Successfully checked out');
      await Promise.all([fetchAttendance(), checkAttendanceStatus()]);
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out');
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task marked as complete');
      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const taskData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        due_date: formData.get('due_date') as string,
        priority: formData.get('priority') as 'low' | 'medium' | 'high',
        assigned_to: userProfile.id,
        status: 'pending'
      };

      const { error } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (error) throw error;

      toast.success('Task added successfully');
      setShowTaskForm(false);
      e.currentTarget.reset();
      await fetchTasks();
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing || !employeeProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Profile...</h2>
          <p className="text-gray-500">Please wait while we load your information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <UserCircle2 className="h-8 w-8 text-indigo-600" />
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome, {employeeProfile.full_name}
                </h1>
                <p className="text-sm text-gray-500">
                  {employeeProfile.position}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isCheckedIn
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Clock className="h-5 w-5" />
                {isCheckedIn ? 'Check Out' : 'Check In'}
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <BellRing className="h-6 w-6" />
              </button>
              <button
                onClick={onSignOut}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 bg-indigo-100 rounded-full flex items-center justify-center">
                  <UserCircle2 className="h-16 w-16 text-indigo-600" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {employeeProfile.full_name}
                </h2>
                <p className="text-gray-500">{employeeProfile.position}</p>
                <div className="mt-4 w-full">
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeProfile.department}
                    </p>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-gray-500">Joined</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(employeeProfile.hire_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Attendance
              </h3>
              <div className="space-y-4">
                {attendance.map((record) => (
                  <div key={record.id} className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(record.check_in).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          In: {new Date(record.check_in).toLocaleTimeString()}
                        </p>
                        {record.check_out && (
                          <p className="text-xs text-gray-500">
                            Out: {new Date(record.check_out).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="md:col-span-5">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Your Tasks</h2>
                  <button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Add Task
                  </button>
                </div>

                {showTaskForm && (
                  <form onSubmit={handleAddTask} className="mb-6 space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                          Due Date
                        </label>
                        <input
                          type="date"
                          id="due_date"
                          name="due_date"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                          Priority
                        </label>
                        <select
                          id="priority"
                          name="priority"
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTaskForm(false)}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Adding...' : 'Add Task'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                          <p className="mt-1 text-sm text-gray-500">{task.description}</p>
                          <div className="mt-2 flex items-center gap-4">
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <div
                                className={`h-2 w-2 rounded-full mr-2 ${
                                  task.priority === 'high'
                                    ? 'bg-red-500'
                                    : task.priority === 'medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                              />
                              <span className="text-sm text-gray-500 capitalize">{task.priority}</span>
                            </div>
                          </div>
                        </div>
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleTaskComplete(task.id)}
                            className="ml-4 flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                            Complete
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <div className="ml-4 flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No tasks found. Add a new task to get started!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          <div className="md:col-span-4">
            <div className="bg-white rounded-lg shadow h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Team Chat</h2>
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <Chat userProfile={userProfile} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}