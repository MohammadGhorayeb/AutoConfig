"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Employee {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  isActive: boolean;
  _id?: string; // Added for MongoDB compatibility
}

interface Task {
  _id?: string;
  id: string;
  title: string;
  description: string;
  assignedTo: string | { _id: string; name: string; email: string };
  status: 'pending' | 'in-progress' | 'completed';
  createdBy?: string | { _id: string; name: string };
}

interface BusinessSettings {
  name: string;
  logoUrl: string;
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', jobTitle: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState<'summary' | 'employees' | 'tasks' | 'settings'>('summary');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({ 
    name: 'Business Dashboard', 
    logoUrl: '' 
  });
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Fetch employees from the database
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        const data = await response.json();
        
        if (response.ok) {
          // Map the data to our Employee interface format
          const formattedEmployees = data.employees.map((emp: any) => ({
            id: emp._id,
            _id: emp._id,
            name: emp.name,
            email: emp.email,
            jobTitle: emp.jobTitle || '',
            isActive: emp.isActive
          }));
          setEmployees(formattedEmployees);
        } else {
          console.error('Failed to fetch employees:', data.message);
          setError('Failed to load employees');
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Error loading employees');
      }
    };
    
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Format the task data
          const formattedTasks = data.tasks.map((task: any) => ({
            id: task._id,
            _id: task._id,
            title: task.title,
            description: task.description,
            assignedTo: task.assignedTo,
            status: task.status,
            createdBy: task.createdBy
          }));
          setTasks(formattedTasks);
        } else {
          console.error('Failed to fetch tasks:', data.message);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };
    
    const fetchBusinessSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (response.ok && data.settings) {
          setBusinessSettings(data.settings);
        }
      } catch (err) {
        console.error('Error fetching business settings:', err);
      }
    };
    
    Promise.all([fetchEmployees(), fetchTasks(), fetchBusinessSettings()])
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingEmployee(true);
    setTempPassword(null);
    setSuccess('');
    setError('');
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEmployee),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Add the new employee to the list
        setEmployees([...employees, {
          id: data.employee.id,
          _id: data.employee.id,
          name: data.employee.name,
          email: data.employee.email,
          jobTitle: data.employee.jobTitle,
          isActive: data.employee.isActive
        }]);
        setNewEmployee({ name: '', email: '', jobTitle: '' });
        setError('');
        setSuccess('Employee added successfully');
        
        // Store the temporary password
        if (data.tempPassword) {
          setTempPassword(data.tempPassword);
        }
      } else {
        setError(data.message || 'Failed to add employee');
      }
    } catch (err: any) {
      console.error('Error adding employee:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingTask(true);
    setSuccess('');
    setError('');
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Add the new task to the list
        const newTaskData = {
          id: data.task._id,
          _id: data.task._id,
          title: data.task.title,
          description: data.task.description,
          assignedTo: data.task.assignedTo,
          status: data.task.status,
          createdBy: data.task.createdBy
        };
        
        setTasks([...tasks, newTaskData]);
        setNewTask({ title: '', description: '', assignedTo: '' });
        setSuccess('Task added successfully');
      } else {
        setError(data.message || 'Failed to add task');
      }
    } catch (err: any) {
      console.error('Error adding task:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setAddingTask(false);
    }
  };

  const toggleEmployeeStatus = async (id: string) => {
    setStatusUpdating(id);
    
    try {
      // Find the employee to toggle
      const employee = employees.find((emp) => emp.id === id);
      if (!employee) {
        setError('Employee not found');
        setStatusUpdating(null);
        return;
      }
      
      const newStatus = !employee.isActive;
      
      // Call the API to update the status
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update the employee in the state
        setEmployees(
          employees.map((emp) => 
            emp.id === id ? { ...emp, isActive: newStatus } : emp
          )
        );
      } else {
        setError(data.message || 'Failed to update employee status');
      }
    } catch (err: any) {
      console.error('Error toggling employee status:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLogo(file);
      
      // Create a preview of the selected image
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);
    setSuccess('');
    setError('');
    
    try {
      // Create a FormData object to handle file upload
      const formData = new FormData();
      formData.append('name', businessSettings.name);
      
      if (selectedLogo) {
        formData.append('logo', selectedLogo);
      }
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setBusinessSettings({
          name: data.settings.name,
          logoUrl: data.settings.logoUrl
        });
        setSelectedLogo(null);
        setSuccess('Business settings updated successfully');
      } else {
        setError(data.message || 'Failed to update business settings');
      }
    } catch (err: any) {
      console.error('Error updating business settings:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Get counts for summary metrics
  const activeEmployeesCount = employees.filter(emp => emp.isActive).length;
  const pendingTasksCount = tasks.filter(task => task.status === 'pending').length;
  const completedTasksCount = tasks.filter(task => task.status === 'completed').length;

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  const renderDashboardContent = () => {
    switch (activeSection) {
      case 'summary':
        return (
          <div className="space-y-8">
            {/* Top metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-purple-700 text-white p-6 rounded-lg shadow-md">
                <h3 className="font-medium text-lg mb-2">Employees</h3>
                <p className="text-3xl font-bold">{activeEmployeesCount}</p>
              </div>
              <div className="bg-purple-700 text-white p-6 rounded-lg shadow-md">
                <h3 className="font-medium text-lg mb-2">Pending Tasks</h3>
                <p className="text-3xl font-bold">${pendingTasksCount}</p>
              </div>
              <div className="bg-purple-700 text-white p-6 rounded-lg shadow-md">
                <h3 className="font-medium text-lg mb-2">Completed Tasks</h3>
                <p className="text-3xl font-bold">{completedTasksCount}</p>
              </div>
            </div>

            {/* Activity section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Management Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Team Analytics</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 mb-2">See how your team is performing and manage resources effectively.</p>
                      <button onClick={() => setActiveSection('employees')} className="text-purple-600 font-medium">View Team →</button>
                    </div>
                    <div className="rounded-full h-24 w-24 flex items-center justify-center border-4 border-purple-200 border-t-purple-600">
                      <span className="text-sm font-medium">VIEW</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Task Progress</h3>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="text-sm font-medium">{Math.round(completedTasksCount / (tasks.length || 1) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${Math.round(completedTasksCount / (tasks.length || 1) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <button onClick={() => setActiveSection('tasks')} className="text-purple-600 font-medium">Manage Tasks →</button>
                </div>
              </div>
            </div>

            {/* Recent tasks section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Recent Tasks</h2>
                <button onClick={() => setActiveSection('tasks')} className="text-sm text-gray-600">SEE ALL</button>
              </div>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.slice(0, 5).map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {typeof task.assignedTo === 'object' ? task.assignedTo.name : 
                              employees.find(emp => emp.id === task.assignedTo)?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'employees':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Employee Management</h2>
              <button
                onClick={() => setAddingEmployee(!addingEmployee)}
                className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {addingEmployee ? 'Cancel' : 'Add Employee'}
              </button>
            </div>

            {tempPassword && (
              <div className="mb-6 bg-green-50 p-4 rounded-md border border-green-200">
                <h3 className="text-green-800 font-medium mb-2">Employee added successfully!</h3>
                <p className="text-green-700 mb-1">Temporary password: <span className="font-mono bg-green-100 px-1 py-0.5 rounded">{tempPassword}</span></p>
                <p className="text-sm text-green-600">Please share this with the employee. They will be prompted to change it on first login.</p>
              </div>
            )}

            {addingEmployee && (
              <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium mb-4">Add New Employee</h3>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      id="name"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2 border"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2 border"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">Job Title</label>
                    <input
                      type="text"
                      id="jobTitle"
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee({ ...newEmployee, jobTitle: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2 border"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={addingEmployee}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {addingEmployee ? 'Adding...' : 'Add Employee'}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{employee.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => toggleEmployeeStatus(employee.id)}
                          disabled={statusUpdating === employee.id}
                          className={`text-purple-600 hover:text-purple-900 ${
                            statusUpdating === employee.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {employee.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Task Management</h2>
              <button
                onClick={() => setAddingTask(!addingTask)}
                className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {addingTask ? 'Cancel' : 'Add Task'}
              </button>
            </div>

            {addingTask && (
              <div className="mb-6 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-medium mb-4">Add New Task</h3>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2 border"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Assign To</label>
                    <select
                      id="assignedTo"
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md border"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.filter(e => e.isActive).map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    {addingTask ? 'Adding...' : 'Add Task'}
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {typeof task.assignedTo === 'object' ? task.assignedTo.name : 
                            employees.find(emp => emp.id === task.assignedTo)?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Business Settings</h2>
              <p className="text-gray-600 mt-1">Customize your business profile and appearance</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    id="businessName"
                    value={businessSettings.name}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-3 py-2 border"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">This name will appear in the dashboard sidebar and browser title</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Logo</label>
                  
                  <div className="mt-2 flex items-center space-x-6">
                    <div className="flex-shrink-0 h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                      {(logoPreview || businessSettings.logoUrl) ? (
                        <Image 
                          src={logoPreview || businessSettings.logoUrl}
                          alt="Business logo preview"
                          width={64}
                          height={64}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="logo-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Upload Logo
                      </label>
                      <input
                        id="logo-upload"
                        name="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="sr-only"
                      />
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={updatingSettings}
                  className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {updatingSettings ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b border-gray-200">
          {businessSettings.logoUrl ? (
            <div className="flex items-center">
              <div className="w-10 h-10 overflow-hidden rounded-md mr-3">
                <Image 
                  src={businessSettings.logoUrl}
                  alt="Business logo"
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </div>
              <h2 className="text-xl font-bold truncate">{businessSettings.name}</h2>
            </div>
          ) : (
            <h2 className="text-xl font-bold">{businessSettings.name}</h2>
          )}
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveSection('summary')}
                className={`flex items-center w-full p-3 rounded-md ${
                  activeSection === 'summary' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Summary
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection('employees')}
                className={`flex items-center w-full p-3 rounded-md ${
                  activeSection === 'employees' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Employees
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection('tasks')}
                className={`flex items-center w-full p-3 rounded-md ${
                  activeSection === 'tasks' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Tasks
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection('settings')}
                className={`flex items-center w-full p-3 rounded-md ${
                  activeSection === 'settings' ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
              A
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Admin</p>
              <Link href="/" className="text-xs text-gray-500 hover:text-gray-700">
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-6">
        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-md text-red-700">
            <p>{error}</p>
          </div>
        )}
        
        {success && !tempPassword && (
          <div className="mb-6 bg-green-50 p-4 rounded-md text-green-700 border border-green-200">
            <p>{success}</p>
          </div>
        )}
        
        {renderDashboardContent()}
      </div>
    </div>
  );
} 