import mongoose from 'mongoose';

// Get MongoDB URI from environment variables with fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autoconfig';

let cachedConnection: typeof mongoose | null = null;

async function connectDB() {
  // If we already have a connection, return it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using existing MongoDB connection');
    return cachedConnection;
  }

  // Reset cached connection if it exists but is not connected
  if (cachedConnection && mongoose.connection.readyState !== 1) {
    console.log('Previous connection is no longer active, reconnecting...');
    cachedConnection = null;
  }

  try {
    // Log connection attempt
    console.log('Attempting to connect to MongoDB at:', MONGODB_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@'));
    console.log('MongoDB connection state:', mongoose.connection.readyState);
    
    // Set connection options with timeouts
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds for server selection timeout
      connectTimeoutMS: 15000, // 15 seconds connection timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    };
    
    // Connect to MongoDB
    const connection = await mongoose.connect(MONGODB_URI, options);
    
    // Cache the connection
    cachedConnection = connection;
    console.log('MongoDB connected successfully!');
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.name);
    
    // Setup connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error after initial connection:', err);
      cachedConnection = null;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, will try to reconnect on next request');
      cachedConnection = null;
    });
    
    // Return the connection
    return connection;
  } catch (error) {
    // Log error and reset cached connection
    console.error('MongoDB connection error:', error);
    cachedConnection = null;
    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default connectDB; 