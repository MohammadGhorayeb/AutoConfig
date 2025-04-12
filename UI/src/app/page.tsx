import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-100 to-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-5xl font-bold mb-8 text-primary-700">Business Management Platform</h1>
        <p className="text-xl mb-8 text-gray-600">
          Streamline your business operations with our integrated platform featuring employee management, 
          task assignment, and AI-powered assistance.
        </p>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 text-left">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">How it works:</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-600">
            <li><span className="font-medium">Business owners register</span> an account to access the admin dashboard</li>
            <li><span className="font-medium">Admins add employees</span> to their organization with appropriate job roles</li>
            <li><span className="font-medium">Employees receive credentials</span> to access their personalized dashboard</li>
            <li><span className="font-medium">Admins assign tasks</span> to employees and track their progress</li>
            <li><span className="font-medium">Employees manage tasks</span> and get AI assistance through the built-in chatbot</li>
          </ol>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Link 
            href="/auth/login" 
            className="rounded-md bg-primary-600 px-8 py-3 text-lg font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Sign In
          </Link>
          <Link 
            href="/auth/register" 
            className="rounded-md bg-white px-8 py-3 text-lg font-semibold text-primary-600 shadow-sm ring-1 ring-inset ring-primary-600 hover:bg-gray-50"
          >
            Register Business
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Employees: Please contact your manager for account access.
        </p>
      </div>
    </main>
  );
} 