// Simple MongoDB connection test script
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autoconfig';

console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
})
.then(() => {
  console.log('Successfully connected to MongoDB!');
  console.log('Connection state:', mongoose.connection.readyState);
  console.log('Database name:', mongoose.connection.name);
  console.log('Database host:', mongoose.connection.host);
  return mongoose.connection.close();
})
.then(() => {
  console.log('Connection closed');
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
})
.finally(() => {
  process.exit(0);
}); 