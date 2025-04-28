"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from './components/Header';

interface Task {
  _id?: string;
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdBy?: any;
}

interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  jobTitle: string;
  isPasswordTemporary?: boolean;
  profilePic?: string;
  department?: string;
  joinDate?: string;
  phoneNumber?: string;
}

interface ChatMessage {
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    jobTitle: '',
    profilePic: '/avatars/default.png',
    department: 'AI Development',
    joinDate: '2023-01-15',
    phoneNumber: '(555) 123-4567'
  });
  const [currentChat, setCurrentChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'password' | 'preferences'>('profile');
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'tasks'>('chats');
  const [inputValue, setInputValue] = useState('');
  const router = useRouter();

  // Fetch user profile and data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Try to fetch from API first
        const profileResponse = await fetch('/api/user/profile');
        let userData;
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          userData = profileData.user;
          setProfile({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            jobTitle: userData.jobTitle || '',
            isPasswordTemporary: userData.isPasswordTemporary,
            profilePic: userData.profilePic || '/avatars/default.png',
            department: userData.department || 'AI Development',
            joinDate: userData.joinDate || '2023-01-15',
            phoneNumber: userData.phoneNumber || '(555) 123-4567'
          });
          
          if (userData.isPasswordTemporary) {
            setShowChangePassword(true);
          }
        } else {
          // Handle account deactivation
          if (profileResponse.status === 403) {
            const data = await profileResponse.json();
            if (data.isDeactivated) {
              // Clear local user data
              localStorage.removeItem('user_data');
              
              // Redirect to login with message
              router.push('/auth/login?deactivated=true');
              return;
            }
          }
          
          // If API fails for other reasons, try localStorage as fallback
          const localUserData = localStorage.getItem('user_data');
          if (localUserData) {
            userData = JSON.parse(localUserData);
            setProfile({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              jobTitle: userData.jobTitle || '',
              isPasswordTemporary: userData.isPasswordTemporary,
              profilePic: userData.profilePic || '/avatars/default.png',
              department: userData.department || 'AI Development',
              joinDate: userData.joinDate || '2023-01-15',
              phoneNumber: userData.phoneNumber || '(555) 123-4567'
            });
            
            if (userData.isPasswordTemporary) {
              setShowChangePassword(true);
            }
          } else {
            throw new Error('User data not found');
          }
        }

        // Fetch tasks assigned to this employee
        if (userData && userData.id) {
          const tasksResponse = await fetch(`/api/tasks?assignedTo=${userData.id}`);
          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            if (tasksData.success) {
              const formattedTasks = tasksData.tasks.map((task: any) => ({
                id: task._id,
                _id: task._id,
                title: task.title,
                description: task.description,
                status: task.status,
                createdBy: task.createdBy
              }));
              setTasks(formattedTasks);
            }
          }
        }

        // Fetch chats for this user from the API
        try {
          const chatsResponse = await fetch('/api/chats');
          if (chatsResponse.ok) {
            const chatsData = await chatsResponse.json();
            if (chatsData.success && chatsData.chats.length > 0) {
              // Format the chats for our frontend
              const formattedChats = chatsData.chats.map((chat: any) => ({
                id: chat._id,
                title: chat.title,
                lastMessage: chat.lastMessage,
                timestamp: chat.timestamp || chat.updatedAt || chat.createdAt
              }));
              setChats(formattedChats);
            }
          } else {
            console.log('Falling back to mock chat data');
            // If the API fails, fall back to mock data
            setChats([
              { id: '1', title: 'Project Planning', lastMessage: 'Let me help you with the project plan', timestamp: '2023-12-10T14:30:00' },
              { id: '2', title: 'Code Optimization', lastMessage: 'Here are some suggestions for optimizing your code', timestamp: '2023-12-09T10:15:00' },
            ]);
          }
        } catch (err) {
          console.error('Error fetching chats:', err);
          // Fall back to mock data if chat fetch fails
          setChats([
            { id: '1', title: 'Project Planning', lastMessage: 'Let me help you with the project plan', timestamp: '2023-12-10T14:30:00' },
            { id: '2', title: 'Code Optimization', lastMessage: 'Here are some suggestions for optimizing your code', timestamp: '2023-12-09T10:15:00' },
          ]);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    
    // Set up a periodic check for account status
    const statusCheckInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          const data = await response.json();
          if (response.status === 403 && data.isDeactivated) {
            clearInterval(statusCheckInterval);
            localStorage.removeItem('user_data');
            router.push('/auth/login?deactivated=true');
          }
        }
      } catch (err) {
        console.error('Error checking user status:', err);
      }
    }, 60000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(statusCheckInterval);
  }, [router]);

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
    setSuccess('Password updated successfully! You can now use your new password for future logins.');
    
    // Update the profile state to reflect the change
    setProfile({
      ...profile,
      isPasswordTemporary: false
    });
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      setSuccess('');
    }, 5000);
  };

  const selectChat = async (chatId: string) => {
    setCurrentChat(chatId);
    
    try {
      // Fetch messages for this chat from the API
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages) {
          setChatMessages(data.messages);
        } else {
          // If no messages yet, set an empty array with initial greeting
          setChatMessages([
            { content: 'Hi, how can I help you today?', sender: 'ai', timestamp: new Date().toISOString() }
          ]);
        }
      } else {
        // If API fails, use mock data
        setChatMessages([
          { content: 'Hi, how can I help you today?', sender: 'ai', timestamp: '2023-12-10T14:30:00' },
          { content: 'I need help with planning my project.', sender: 'user', timestamp: '2023-12-10T14:31:00' },
          { content: 'I\'d be happy to help with your project planning. Let\'s break it down into steps. First, what are the main objectives of your project?', sender: 'ai', timestamp: '2023-12-10T14:32:00' },
        ]);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      // Fall back to mock data
      setChatMessages([
        { content: 'Hi, how can I help you today?', sender: 'ai', timestamp: '2023-12-10T14:30:00' },
        { content: 'I need help with planning my project.', sender: 'user', timestamp: '2023-12-10T14:31:00' },
        { content: 'I\'d be happy to help with your project planning. Let\'s break it down into steps. First, what are the main objectives of your project?', sender: 'ai', timestamp: '2023-12-10T14:32:00' },
      ]);
    }
  };

  const startNewChat = async () => {
    try {
      // Create a new chat on the server
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Conversation',
          lastMessage: 'How can I assist you today?'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.chat) {
          const newChat = {
            id: data.chat._id,
            title: data.chat.title,
            lastMessage: data.chat.lastMessage,
            timestamp: data.chat.timestamp || new Date().toISOString()
          };
          
          setChats([newChat, ...chats]);
          setCurrentChat(newChat.id);
          
          // Create initial AI message
          const welcomeMessage = {
            content: 'Good day! How may I assist you today?',
            sender: 'ai' as const,
            timestamp: new Date().toISOString()
          };
          
          // Save the initial message to the API
          try {
            await fetch(`/api/chats/${newChat.id}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(welcomeMessage),
            });
          } catch (err) {
            console.error('Error saving welcome message:', err);
          }
          
          setChatMessages([welcomeMessage]);
        } else {
          throw new Error('Failed to create chat');
        }
      } else {
        throw new Error('Failed to create chat');
      }
    } catch (err) {
      console.error('Error creating new chat:', err);
      
      // Fallback to client-side only if API fails
      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: 'New Conversation',
        lastMessage: 'How can I assist you today?',
        timestamp: new Date().toISOString()
      };
      
      setChats([newChat, ...chats]);
      setCurrentChat(newChatId);
      setChatMessages([
        { content: 'Good day! How may I assist you today?', sender: 'ai', timestamp: new Date().toISOString() }
      ]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentChat) return;

    // Add user message to UI immediately for responsiveness
    const userMessage = {
      content: inputValue,
      sender: 'user' as const,
      timestamp: new Date().toISOString()
    };
    setChatMessages([...chatMessages, userMessage]);
    setInputValue('');

    // Update chat title if this is a new chat
    let updatedChats = [...chats];
    if (currentChat && chats.find(c => c.id === currentChat)?.title === 'New Conversation') {
      const truncatedTitle = inputValue.length > 25 ? `${inputValue.substring(0, 25)}...` : inputValue;
      updatedChats = chats.map(chat => 
        chat.id === currentChat ? { ...chat, title: truncatedTitle, lastMessage: inputValue } : chat
      );
      setChats(updatedChats);
      
      // Update chat title on the server
      try {
        await fetch(`/api/chats/${currentChat}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: truncatedTitle }),
        });
      } catch (err) {
        console.error('Error updating chat title:', err);
      }
    } else if (currentChat) {
      // Update the last message of the current chat
      updatedChats = chats.map(chat => 
        chat.id === currentChat ? { ...chat, lastMessage: inputValue } : chat
      );
      setChats(updatedChats);
    }

    try {
      // Save user message to API
      await fetch(`/api/chats/${currentChat}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userMessage),
      });

      // Simulate AI response
      try {
        const llmResponse = await fetch('/api/llm/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputValue }),
        });
        
        const llmData = await llmResponse.json();
        
        if (llmResponse.ok && llmData.success) {
          const aiMessage = {
            content: llmData.response,
            sender: 'ai' as const,
            timestamp: new Date().toISOString()
          };
          
          setChatMessages(prev => [...prev, aiMessage]);
          
          // Also save AI message to API
          try {
            await fetch(`/api/chats/${currentChat}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(aiMessage),
            });
          } catch (err) {
            console.error('Error saving AI message:', err);
          }
        } else {
          throw new Error(llmData.message || 'Failed to get response from LLM');
        }
      } catch (err) {
        console.error('Error getting LLM response:', err);
        
        // Fallback to a generic message if LLM call fails
        const fallbackMessage = {
          content: 'I apologize, but I encountered an issue while processing your request. Please try again later.',
          sender: 'ai' as const,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => [...prev, fallbackMessage]);
        
        // Save fallback message to API
        try {
          await fetch(`/api/chats/${currentChat}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fallbackMessage),
          });
        } catch (saveErr) {
          console.error('Error saving fallback message:', saveErr);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the task in the state
        setTasks(
          tasks.map((task) => 
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
        setSuccess('Task status updated successfully');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update task status');
        
        // Clear error message after 3 seconds
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('An error occurred while updating task status');
      
      // Clear error message after 3 seconds
      setTimeout(() => setError(''), 3000);
    }
  };

  // Help response examples
  const handleCapabilityClick = (capability: string) => {
    let aiResponse = '';
    
    switch(capability) {
      case 'explain':
        aiResponse = 'I can explain complex concepts in simple terms. What would you like me to explain about local LLMs?';
        break;
      case 'howto':
        aiResponse = 'I can provide step-by-step instructions for various tasks. What would you like to learn how to do?';
        break;
      case 'remember':
        aiResponse = 'I can remember information from our conversation to provide context-aware assistance. What would you like me to remember?';
        break;
      case 'allows':
        aiResponse = 'I can provide guidance on what AutoConfig allows you to do with local LLMs, such as configuring parameters, optimizing performance, and setting up custom prompts.';
        break;
      case 'may':
        aiResponse = 'I may have limitations when answering questions about very recent events or specialized domain knowledge not covered in my training data.';
        break;
      case 'limited':
        aiResponse = 'My knowledge about world events and information is limited to my last update. For the most current information, please consult other sources.';
        break;
      default:
        aiResponse = 'I can assist you with various tasks. How can I help you today?';
    }
    
    if (!currentChat) {
      startNewChat();
    }
    
    setTimeout(() => {
      const newMessage = {
        content: aiResponse,
        sender: 'ai' as const,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, newMessage]);
    }, 500);
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (!showSettings) {
      setShowChangePassword(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-slate-600 font-medium">Loading your workspace...</p>
      </div>
    </div>
  );

  if (showChangePassword && profile.isPasswordTemporary) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4">
        <div className="max-w-md w-full">
          <ChangePasswordForm 
            isTemporary={profile.isPasswordTemporary} 
            onSuccess={handlePasswordChanged} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Use the new Header component */}
      <Header 
        profileName={profile.name} 
        profilePic={profile.profilePic} 
      />

      {/* Status messages */}
      {(error || success) && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          {error && (
            <div className="m-4 bg-red-50 p-4 rounded-xl shadow-lg text-red-700 border border-red-100 animate-enter">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {success && (
            <div className="m-4 bg-green-50 p-4 rounded-xl shadow-lg text-green-700 border border-green-100 animate-enter">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{success}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 bg-white shadow-sm flex flex-col border-r border-slate-200">
          {/* New chat button */}
          <div className="p-4">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center space-x-2 rounded-lg py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-150"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>New chat</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button 
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors duration-150 ${
                sidebarTab === 'chats' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setSidebarTab('chats')}
            >
              Your conversations
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors duration-150 ${
                sidebarTab === 'tasks' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setSidebarTab('tasks')}
            >
              Your Tasks
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'chats' && (
              <ul className="divide-y divide-slate-200">
                {chats.length === 0 ? (
                  <li className="p-4 text-center text-slate-500 text-sm">
                    No conversations yet. Start a new chat!
                  </li>
                ) : (
                  chats.map((chat) => (
                    <li 
                      key={chat.id} 
                      className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors duration-150 ${
                        currentChat === chat.id ? 'bg-blue-50/70' : ''
                      }`}
                      onClick={() => selectChat(chat.id)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600">
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{chat.title}</p>
                          <p className="text-xs text-slate-500 truncate">{chat.lastMessage}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(chat.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
            
            {sidebarTab === 'tasks' && (
              <ul className="divide-y divide-slate-200 p-2">
                {tasks.length === 0 ? (
                  <li className="p-4 text-center text-slate-500 text-sm">
                    No tasks assigned yet.
                  </li>
                ) : (
                  tasks.map((task) => (
                    <li key={task.id} className="p-3 hover:bg-slate-50 rounded-lg transition-colors duration-150 my-1 shadow-sm border border-slate-100">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-medium text-slate-900">{task.title}</h4>
                          <span className={`text-xs px-2.5 py-1 rounded-full ${
                            task.status === 'completed' 
                              ? 'bg-green-100 text-green-800 border border-green-200' : 
                            task.status === 'in-progress' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                              'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{task.description}</p>
                        <div className="mt-3 flex justify-between items-center">
                          <select
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value as 'pending' | 'in-progress' | 'completed')}
                            className="text-xs rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1 border"
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          
                          <span className="text-xs text-slate-400">
                            {task.createdBy?.name ? `By ${task.createdBy.name}` : ''}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* User settings */}
          <div className="p-4 border-t border-slate-200">
            <button 
              onClick={toggleSettings}
              className="text-xs text-slate-600 hover:text-blue-600 flex items-center transition-colors duration-150"
            >
              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col bg-white">
          {showSettings ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Account Settings</h2>
                
                {/* Settings tabs */}
                <div className="flex border-b border-slate-200 mb-6">
                  <button 
                    className={`px-4 py-2 text-sm font-medium ${activeSettingsTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setActiveSettingsTab('profile')}
                  >
                    Profile
                  </button>
                  <button 
                    className={`px-4 py-2 text-sm font-medium ${activeSettingsTab === 'password' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setActiveSettingsTab('password')}
                  >
                    Password
                  </button>
                  <button 
                    className={`px-4 py-2 text-sm font-medium ${activeSettingsTab === 'preferences' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setActiveSettingsTab('preferences')}
                  >
                    Preferences
                  </button>
                  
                  <div className="ml-auto">
                    <button 
                      onClick={toggleSettings}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
                
                {/* Profile tab content */}
                {activeSettingsTab === 'profile' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center">
                        <div className="mb-6 md:mb-0 md:mr-8 flex flex-col items-center">
                          <div className="relative mb-4">
                            <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-blue-100 bg-gradient-to-br from-blue-100 to-indigo-100">
                              {profile.profilePic ? (
                                <img 
                                  src={profile.profilePic} 
                                  alt={profile.name} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500 text-2xl font-medium">
                                  {profile.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors duration-150">
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          </div>
                          <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors duration-150">
                            Change Photo
                          </button>
                        </div>
                        
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                              <input 
                                id="name" 
                                type="text" 
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" 
                                value={profile.name}
                                readOnly
                              />
                            </div>
                            <div>
                              <label htmlFor="email" className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                              <input 
                                id="email" 
                                type="email" 
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" 
                                value={profile.email}
                                readOnly
                              />
                            </div>
                            <div>
                              <label htmlFor="jobTitle" className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
                              <input 
                                id="jobTitle" 
                                type="text" 
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" 
                                value={profile.jobTitle}
                                readOnly
                              />
                            </div>
                            <div>
                              <label htmlFor="department" className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                              <input 
                                id="department" 
                                type="text" 
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" 
                                value={profile.department}
                                readOnly
                              />
                            </div>
                            <div>
                              <label htmlFor="phoneNumber" className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                              <input 
                                id="phoneNumber" 
                                type="text" 
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" 
                                value={profile.phoneNumber}
                                readOnly
                              />
                            </div>
                            <div>
                              <label htmlFor="joinDate" className="block text-xs font-medium text-slate-700 mb-1">Join Date</label>
                              <input 
                                id="joinDate" 
                                type="text" 
                                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" 
                                value={new Date(profile.joinDate || '').toLocaleDateString()}
                                readOnly
                              />
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Skills & Access</h4>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Local LLM Administration
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                AI Development
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Workflow Creation
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Model Training
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                      <button 
                        onClick={toggleSettings}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Password tab content */}
                {activeSettingsTab === 'password' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                      <ChangePasswordForm 
                        isTemporary={false}
                        onSuccess={handlePasswordChanged}
                        onCancel={toggleSettings}
                      />
                    </div>
                  </div>
                )}
                
                {/* Preferences tab content */}
                {activeSettingsTab === 'preferences' && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-medium text-slate-900 mb-4">Application Preferences</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-700">Dark Mode</h4>
                            <p className="text-xs text-slate-500">Enable dark mode for the application interface</p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input type="checkbox" id="darkMode" className="sr-only" />
                            <div className="w-10 h-5 bg-slate-200 rounded-full shadow-inner"></div>
                            <div className="absolute w-5 h-5 bg-white rounded-full shadow -left-1 -top-0 transition"></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-700">Email Notifications</h4>
                            <p className="text-xs text-slate-500">Receive email notifications for new tasks and messages</p>
                          </div>
                          <div className="relative inline-block w-10 mr-2 align-middle select-none">
                            <input type="checkbox" id="emailNotifications" className="sr-only" defaultChecked />
                            <div className="w-10 h-5 bg-slate-200 rounded-full shadow-inner"></div>
                            <div className="absolute w-5 h-5 bg-white rounded-full shadow -left-1 -top-0 transition transform translate-x-full bg-blue-600"></div>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Default Chat Model</h4>
                          <select className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                            <option>AutoConfig Default (1.3B)</option>
                            <option>AutoConfig Enhanced (7B)</option>
                            <option>AutoConfig Pro (13B)</option>
                            <option>Custom (Local)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                      <button 
                        onClick={toggleSettings}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : showChangePassword ? (
            <div className="flex-1 p-6">
              <ChangePasswordForm 
                isTemporary={false}
                onSuccess={handlePasswordChanged}
                onCancel={() => setShowChangePassword(false)}
              />
            </div>
          ) : currentChat ? (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="text-lg font-medium text-slate-900">
                  {chats.find(c => c.id === currentChat)?.title || 'Chat'}
                </h2>
              </div>
              
              {/* Chat messages */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm">
                          <span className="text-xs font-medium text-white">A.I</span>
                        </div>
                      )}
                      <div 
                        className={`rounded-2xl p-4 shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-auto' 
                            : 'bg-white text-slate-800 border border-slate-200'
                        } max-w-[85%]`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                      {msg.sender === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center ml-3 flex-shrink-0 shadow-sm">
                          <span className="text-xs font-medium text-slate-600">
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Message input */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <form onSubmit={sendMessage} className="flex items-end space-x-2 max-w-3xl mx-auto">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="What's in your mind..."
                      className="block w-full rounded-2xl border-0 py-3 pl-4 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 text-sm"
                    />
                    <div className="absolute right-3 bottom-3">
                      <button
                        type="submit"
                        className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 p-2 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50/30">
              <div className="text-center max-w-xl">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-xl font-bold text-blue-600 mb-2">AUTOCONFIG A.I+</h1>
                <h2 className="text-3xl font-bold text-slate-800 mb-8 tracking-tight">
                  Good day! How may I assist you today?
                </h2>
                
                {/* Capability cards - first row */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Explore capability */}
                  <div className="flex bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="w-16 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium">Explore</span>
                      <div className="text-xs text-slate-300 mt-1 text-center">Learn how to use models</div>
                    </div>
                    <div className="flex-1 p-3">
                      <button 
                        className="text-left w-full"
                        onClick={() => handleCapabilityClick('explain')}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-purple-600 text-xs font-medium">Ex</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">"Explain"</p>
                            <p className="text-xs text-slate-500">Local LLM concepts</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="w-8 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* How-to capability */}
                  <div className="flex bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="w-16 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium">How to</span>
                      <div className="text-xs text-slate-300 mt-1 text-center">Step by step guides</div>
                    </div>
                    <div className="flex-1 p-3">
                      <button 
                        className="text-left w-full"
                        onClick={() => handleCapabilityClick('howto')}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-blue-600 text-xs font-medium">H</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">"How to"</p>
                            <p className="text-xs text-slate-500">Configure local LLMs</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="w-8 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Capability cards - second row */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Remember capability */}
                  <div className="flex bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="w-16 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium">Memory</span>
                      <div className="text-xs text-slate-300 mt-1 text-center">Contextual assistance</div>
                    </div>
                    <div className="flex-1 p-3">
                      <button 
                        className="text-left w-full"
                        onClick={() => handleCapabilityClick('remember')}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-orange-600 text-xs font-medium">R</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">"Remember"</p>
                            <p className="text-xs text-slate-500">Settings preferences</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="w-8 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Allows capability */}
                  <div className="flex bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="w-16 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium">Features</span>
                      <div className="text-xs text-slate-300 mt-1 text-center">System capabilities</div>
                    </div>
                    <div className="flex-1 p-3">
                      <button 
                        className="text-left w-full"
                        onClick={() => handleCapabilityClick('allows')}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-slate-600 text-xs font-medium">A</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">"Allows"</p>
                            <p className="text-xs text-slate-500">LLM configurations</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="w-8 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Capability cards - third row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* May capability */}
                  <div className="flex bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="w-16 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium">Limits</span>
                      <div className="text-xs text-slate-300 mt-1 text-center">Cautions to use</div>
                    </div>
                    <div className="flex-1 p-3">
                      <button 
                        className="text-left w-full"
                        onClick={() => handleCapabilityClick('may')}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-red-600 text-xs font-medium">M</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">"May"</p>
                            <p className="text-xs text-slate-500">Knowledge limitations</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="w-8 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Limited capability */}
                  <div className="flex bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="w-16 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-sm font-medium">Knowledge</span>
                      <div className="text-xs text-slate-300 mt-1 text-center">Date awareness</div>
                    </div>
                    <div className="flex-1 p-3">
                      <button 
                        className="text-left w-full"
                        onClick={() => handleCapabilityClick('limited')}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full flex items-center justify-center mr-3 shadow-sm">
                            <span className="text-teal-600 text-xs font-medium">L</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">"Limited"</p>
                            <p className="text-xs text-slate-500">System version info</p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="w-8 flex items-center justify-center text-slate-400">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 