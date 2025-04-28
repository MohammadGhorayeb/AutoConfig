import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import connectDB from '@/lib/db';

interface CollectionStatus {
  count?: number;
  exists: boolean;
  error?: string;
}

interface DatabaseDebugInfo {
  status: string;
  connectionState: string;
  error: string | null;
  uri: string;
  collection_status: {
    [key: string]: CollectionStatus | { error: string };
  };
}

export async function GET(req: Request) {
  const debugInfo: {
    timestamp: string;
    environment: string | undefined;
    node_version: string;
    api_status: string;
    database: DatabaseDebugInfo;
    system: {
      memory: NodeJS.MemoryUsage;
      uptime: number;
    };
  } = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    node_version: process.version,
    api_status: 'ok',
    database: {
      status: 'unknown',
      connectionState: 'not_checked',
      error: null,
      uri: process.env.MONGODB_URI ? 'configured' : 'not_configured',
      collection_status: {}
    },
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  // Check database connection
  try {
    await connectDB();
    
    debugInfo.database.status = 'connected';
    debugInfo.database.connectionState = mongoose.connection.readyState === 1 ? 'connected' : 
      mongoose.connection.readyState === 2 ? 'connecting' : 
      mongoose.connection.readyState === 3 ? 'disconnecting' : 'disconnected';
    
    // Get database stats for different collections
    if (mongoose.connection.readyState === 1) {
      try {
        const db = mongoose.connection.db;
        
        // Check users collection
        try {
          const usersCount = await db.collection('users').countDocuments();
          debugInfo.database.collection_status['users'] = {
            count: usersCount,
            exists: true
          };
        } catch (e) {
          debugInfo.database.collection_status['users'] = {
            exists: false,
            error: 'Collection not found or error accessing'
          };
        }
        
        // Check tasks collection
        try {
          const tasksCount = await db.collection('tasks').countDocuments();
          debugInfo.database.collection_status['tasks'] = {
            count: tasksCount,
            exists: true
          };
        } catch (e) {
          debugInfo.database.collection_status['tasks'] = {
            exists: false,
            error: 'Collection not found or error accessing'
          };
        }
      } catch (dbError) {
        debugInfo.database.collection_status = {
          error: 'Could not check collections'
        } as { error: string };
      }
    }
  } catch (dbError: any) {
    debugInfo.database.status = 'error';
    debugInfo.database.error = dbError.message || 'Unknown database error';
  }
  
  return NextResponse.json(debugInfo);
} 