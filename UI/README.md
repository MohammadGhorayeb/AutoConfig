# Business Management Platform with Bolt AI Integration

A full-stack web application built with Next.js for business management, featuring employee management, task assignment, and Bolt AI-powered chatbot integration.

## Features

- **Authentication**
  - Email/password sign-up and sign-in
  - Role-based authentication (admin/business vs employee)
  
- **Admin Dashboard**
  - Employee management (add, view, activate/deactivate)
  - Task creation and assignment
  - Task progress tracking
  
- **Employee Dashboard**
  - Profile information display
  - Assigned task management
  - Bolt AI chatbot integration for assistance

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT-based authentication
- **AI Integration**: Bolt AI API

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- MongoDB installation or MongoDB Atlas account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/business-management-platform.git
   cd business-management-platform
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   BOLT_AI_API_KEY=your_bolt_ai_api_key
   JWT_SECRET=your_jwt_secret
   ```

4. Run the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
UI/
├── public/            # Static assets
├── src/
│   ├── app/           # App router pages and API routes
│   │   ├── api/       # API endpoints
│   │   ├── auth/      # Authentication pages
│   │   ├── dashboard/ # Dashboard pages
│   ├── components/    # Reusable components
│   ├── lib/           # Utility functions and libraries
│   ├── models/        # MongoDB models
│   └── styles/        # Global styles
├── package.json       # Dependencies and scripts
└── README.md          # Project documentation
```

## Deploying to Production

This application can be deployed to Vercel with the following steps:

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com)
3. Import your GitHub repository
4. Add your environment variables
5. Deploy

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bolt AI for providing the AI integration capabilities
- Next.js team for the amazing framework 