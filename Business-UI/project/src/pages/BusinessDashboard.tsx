import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Circle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/auth';
import type { Employee, Project } from '../types/database';

interface BusinessDashboardProps {
  userProfile: UserProfile;
  employees: Employee[];
  projects: Project[];
  onSignOut: () => Promise<void>;
  fetchEmployees: () => Promise<void>;
  fetchProjects: () => Promise<void>;
}

export function BusinessDashboard({ 
  userProfile, 
  employees, 
  projects,
  onSignOut,
  fetchEmployees,
  fetchProjects
}: BusinessDashboardProps) {
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      Promise.all([fetchEmployees(), fetchProjects()]).catch(error => {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      });
    }
  }, [userProfile?.id]);

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error('You must be signed in to add employees');
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const employeeData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        role: formData.get('role') as string,
        department: formData.get('department') as string,
        status: 'offline',
        created_by: userProfile.id
      };

      const { error } = await supabase
        .from('employees')
        .insert([employeeData]);

      if (error) {
        if (error.code === '23505') {
          toast.error('An employee with this email already exists');
        } else {
          console.error('Error adding employee:', error);
          toast.error('Failed to add employee: ' + error.message);
        }
        return;
      }

      toast.success('Employee added successfully');
      setShowEmployeeForm(false);
      fetchEmployees();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error in handleAddEmployee:', error);
      toast.error('An unexpected error occurred while adding the employee');
    }
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error('You must be signed in to add projects');
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);
      const projectData = {
        name: formData.get('name') as string,
        budget: parseFloat(formData.get('budget') as string),
        status: formData.get('status') as 'Working' | 'Done' | 'Cancelled',
        completion: parseInt(formData.get('completion') as string, 10),
        created_by: userProfile.id
      };

      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (error) {
        console.error('Error adding project:', error);
        toast.error('Failed to add project: ' + error.message);
        return;
      }

      toast.success('Project added successfully');
      setShowProjectForm(false);
      fetchProjects();
      e.currentTarget.reset();
    } catch (error) {
      console.error('Error in handleAddProject:', error);
      toast.error('An unexpected error occurred while adding the project');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting employee:', error);
        toast.error('Failed to delete employee: ' + error.message);
        return;
      }

      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Error in handleDeleteEmployee:', error);
      toast.error('An unexpected error occurred while deleting the employee');
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project: ' + error.message);
        return;
      }

      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      console.error('Error in handleDeleteProject:', error);
      toast.error('An unexpected error occurred while deleting the project');
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900">Loading Dashboard...</h2>
          <p className="text-gray-500">Please wait while we load your information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="h-10 w-10 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Signed in as: {userProfile.email}
                </p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              disabled={isLoading}
              className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </header>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Employees</h2>
            <button
              onClick={() => setShowEmployeeForm(!showEmployeeForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Employee
            </button>
          </div>

          {showEmployeeForm && (
            <form onSubmit={handleAddEmployee} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmployeeForm(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save Employee
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Join Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          employee.status === 'online'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.join_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No employees found. Add your first employee to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Project
            </button>
          </div>

          {showProjectForm && (
            <form onSubmit={handleAddProject} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    name="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget
                  </label>
                  <input
                    type="number"
                    id="budget"
                    name="budget"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="Working">Working</option>
                    <option value="Done">Done</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="completion" className="block text-sm font-medium text-gray-700 mb-2">
                    Completion (%)
                  </label>
                  <input
                    type="number"
                    id="completion"
                    name="completion"
                    required
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProjectForm(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Save Project
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-medium">
                      ${project.budget.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {project.status === 'Working' && (
                      <Circle className="h-4 w-4 text-blue-500" />
                    )}
                    {project.status === 'Done' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {project.status === 'Cancelled' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        project.status === 'Working'
                          ? 'text-blue-500'
                          : project.status === 'Done'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            project.status === 'Working'
                              ? 'bg-blue-500'
                              : project.status === 'Done'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${project.completion}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {project.completion}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No projects found. Add your first project to get started!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}