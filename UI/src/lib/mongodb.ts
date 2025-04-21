import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autoconfig';
const MONGODB_DB = process.env.MONGODB_DB || 'autoconfig';

// Cache the MongoDB connection
let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (!MONGODB_DB) {
  throw new Error('Please define the MONGODB_DB environment variable');
}

/**
 * Connect to MongoDB and return the client and database
 */
export async function connectToDatabase() {
  // If we already have a connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Create a new connection
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  // Cache the connection
  cachedClient = client;
  cachedDb = db;

  return { client, db };
} 