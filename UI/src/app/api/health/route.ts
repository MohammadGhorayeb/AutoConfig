import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';

export async function GET() {
  try {
    // Print MongoDB connection string (with password redacted)
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autoconfig';
    console.log('MongoDB URI:', dbUri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@'));
    
    // Test database connection
    await connectDB();
    
    // Get connection status
    const connectionState = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    
    return NextResponse.json({
      status: 'ok',
      message: 'API server is running and database connection is healthy',
      timestamp: new Date().toISOString(),
      database: {
        connectionState: stateMap[connectionState] || `unknown(${connectionState})`,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 