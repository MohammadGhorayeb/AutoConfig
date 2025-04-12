"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', jobTitle: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'employees' | 'tasks'>('employees');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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
    
    Promise.all([fetchEmployees(), fetchTasks()])
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

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Link href="/" className="text-primary-600 hover:text-primary-500">
            Sign Out
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 p-4 rounded-md text-red-700">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 p-4 rounded-md text-green-700">
            <p>{success}</p>
          </div>
        )}
        
        {tempPassword && (
          <div className="mb-6 bg-yellow-50 p-4 rounded-md border border-yellow-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-medium text-yellow-800">Temporary Password Created</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The employee account has been created with a temporary password. Please share this with the employee:
                </p>
                <p className="text-md font-mono bg-white p-2 mt-2 border border-yellow-200 rounded">
                  {tempPassword}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  setSuccess('Password copied to clipboard');
                }}
                className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium rounded"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-yellow-600 mt-3">
              Note: This password will only be shown once. Make sure to copy it before leaving this page.
            </p>
          </div>
        )}
        
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('employees')}
              className={`${
                activeTab === 'employees'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Employees
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`${
                activeTab === 'tasks'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Tasks
            </button>
          </nav>
        </div>

        {activeTab === 'employees' && (
          <div>
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Employee</h3>
                <form onSubmit={handleAddEmployee} className="mt-5 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                      Job Title
                    </label>
                    <input
                      type="text"
                      name="jobTitle"
                      id="jobTitle"
                      required
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee({ ...newEmployee, jobTitle: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <button
                      type="submit"
                      disabled={addingEmployee}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {addingEmployee ? 'Adding...' : 'Add Employee'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Employee List</h3>
                <div className="mt-5">
                  <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
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
                              {employees.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No employees found. Add your first employee above.
                                  </td>
                                </tr>
                              ) : (
                                employees.map((employee) => (
                                  <tr key={employee.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{employee.jobTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {employee.isActive ? 'Active' : 'Inactive'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button
                                        onClick={() => toggleEmployeeStatus(employee.id)}
                                        disabled={statusUpdating === employee.id}
                                        className="text-primary-600 hover:text-primary-900 disabled:opacity-50"
                                      >
                                        {statusUpdating === employee.id ? 'Updating...' : (employee.isActive ? 'Deactivate' : 'Activate')}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Task</h3>
                <form onSubmit={handleAddTask} className="mt-5 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">
                      Assign To
                    </label>
                    <select
                      id="assignedTo"
                      name="assignedTo"
                      required
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    >
                      <option value="">Select Employee</option>
                      {employees
                        .filter((employee) => employee.isActive)
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      required
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <button
                      type="submit"
                      disabled={addingTask}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                    >
                      {addingTask ? 'Adding...' : 'Add Task'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Task List</h3>
                <div className="mt-5">
                  <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
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
                              {tasks.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    No tasks found. Add your first task above.
                                  </td>
                                </tr>
                              ) : (
                                tasks.map((task) => {
                                  // Handle both string ID and object reference for assignedTo
                                  let assignedEmployee;
                                  if (typeof task.assignedTo === 'string') {
                                    assignedEmployee = employees.find((employee) => employee.id === task.assignedTo);
                                  } else {
                                    assignedEmployee = { 
                                      name: task.assignedTo.name, 
                                      email: task.assignedTo.email
                                    };
                                  }
                                  
                                  return (
                                    <tr key={task.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{task.title}</td>
                                      <td className="px-6 py-4 text-sm text-gray-500">{task.description}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {assignedEmployee?.name || 'Unknown'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center">
                                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${task.status === 'completed' 
                                              ? 'bg-green-100 text-green-800' 
                                              : task.status === 'in-progress' 
                                                ? 'bg-yellow-100 text-yellow-800' 
                                                : 'bg-gray-100 text-gray-800'
                                            }`}
                                          >
                                            {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                          </span>
                                          <div className="ml-4">
                                            <select
                                              value={task.status}
                                              onChange={async (e) => {
                                                const newStatus = e.target.value as 'pending' | 'in-progress' | 'completed';
                                                try {
                                                  const response = await fetch(`/api/tasks/${task.id}`, {
                                                    method: 'PATCH',
                                                    headers: {
                                                      'Content-Type': 'application/json',
                                                    },
                                                    body: JSON.stringify({ status: newStatus }),
                                                  });
                                                  
                                                  const data = await response.json();
                                                  
                                                  if (response.ok && data.success) {
                                                    // Update the task in the local state
                                                    setTasks(tasks.map(t => 
                                                      t.id === task.id ? { ...t, status: newStatus } : t
                                                    ));
                                                    setSuccess('Task status updated');
                                                  } else {
                                                    setError(data.message || 'Failed to update task');
                                                  }
                                                } catch (err) {
                                                  console.error('Error updating task:', err);
                                                  setError('Failed to update task status');
                                                }
                                              }}
                                              className="block text-sm rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1 border"
                                            >
                                              <option value="pending">Pending</option>
                                              <option value="in-progress">In Progress</option>
                                              <option value="completed">Completed</option>
                                            </select>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 