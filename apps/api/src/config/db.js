import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

// Disable Mongoose command buffering so operations don't freeze for 10 seconds if disconnected
mongoose.set('bufferCommands', false);

export async function connectDB() {
  if (isConnected) {
    return true;
  }

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5s check for MongoDB Atlas / remote connections
      autoIndex: true,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.log(`[Database] Notice: No live MongoDB detected at ${ENV.MONGODB_URI}.`);
    console.log('[Database] Operating seamlessly with built-in zero-config In-Memory Wedding Store.');
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[Database] MongoDB reconnected.');
});
