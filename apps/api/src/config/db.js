import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

// Disable Mongoose command buffering so operations don't freeze for 10 seconds if disconnected
mongoose.set('bufferCommands', false);

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    const connectPromise = mongoose.connect(ENV.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      autoIndex: true,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection attempt timed out after 8s')), 8000)
    );

    const conn = await Promise.race([connectPromise, timeoutPromise]);
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (Pooled: min 2, max 10)`);
    return true;
  } catch (err) {
    isConnected = false;
    console.log(`[Database] Notice: Remote DB unavailable (${err.message}).`);
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
