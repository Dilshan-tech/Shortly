import mongoose from 'mongoose';
import { config, maskMongoUri, normalizeMongoUri } from './env.js';

let isConnecting = false;

/**
 * Diagnostic helper to format clear troubleshooting guidance based on error type
 */
export function getMongoErrorDetails(error) {
  const msg = error?.message || String(error);
  
  if (msg.includes('bad auth') || msg.includes('Authentication failed') || msg.includes('auth error')) {
    return {
      type: 'AUTHENTICATION_FAILED',
      reason: 'Database authentication failed. The username or password in MONGODB_URI is incorrect.',
      suggestion: 'Verify the Atlas database username and password. If your password contains special characters (e.g. @, #, $, %), ensure they are URL-encoded.'
    };
  }

  if (msg.includes('ETIMEDOUT') || msg.includes('Server selection timed out') || msg.includes('ECONNREFUSED') || msg.includes('whitelist')) {
    return {
      type: 'NETWORK_TIMEOUT',
      reason: 'Could not connect to MongoDB Atlas cluster within timeout window.',
      suggestion: 'Check your MongoDB Atlas "Network Access" settings. Ensure your current public IPv4 address is added, or add 0.0.0.0/0 for broad development access.'
    };
  }

  if (msg.includes('Invalid connection string') || msg.includes('URI does not start with')) {
    return {
      type: 'INVALID_URI',
      reason: 'The connection string format is invalid.',
      suggestion: 'Ensure your MONGODB_URI begins with "mongodb+srv://" (Atlas) or "mongodb://" and contains no stray spaces or unescaped characters.'
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    reason: msg,
    suggestion: 'Verify your internet connection and MongoDB Atlas cluster status.'
  };
}

/**
 * Connect to MongoDB using Mongoose
 */
export async function connectDatabase(uriOverride = null) {
  const targetUri = normalizeMongoUri(uriOverride || config.mongodbUri);

  if (!targetUri || targetUri === 'PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE') {
    const errorMsg = 'MONGODB_URI is not configured in backend/.env. Please paste your MongoDB Atlas connection string.';
    return {
      success: false,
      error: errorMsg,
      details: {
        type: 'MISSING_URI',
        reason: errorMsg,
        suggestion: 'Open backend/.env and replace PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE with your Atlas connection string.'
      }
    };
  }

  // If already connected
  if (mongoose.connection.readyState === 1) {
    return {
      success: true,
      alreadyConnected: true,
      database: mongoose.connection.name,
      host: mongoose.connection.host
    };
  }

  if (isConnecting) {
    return { success: false, error: 'Database connection attempt already in progress.' };
  }

  isConnecting = true;
  const masked = maskMongoUri(targetUri);

  try {
    const conn = await mongoose.connect(targetUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000
    });

    isConnecting = false;
    const dbName = conn.connection.name;
    const host = conn.connection.host;

    console.log(`🍃 [MONGODB] Connected successfully to database: "${dbName}" via ${masked}`);

    return {
      success: true,
      database: dbName,
      host,
      maskedUri: masked
    };
  } catch (err) {
    isConnecting = false;
    const details = getMongoErrorDetails(err);
    console.error(`❌ [MONGODB] Connection failed (${details.type}): ${details.reason}`);
    console.error(`💡 [MONGODB] Troubleshooting tip: ${details.suggestion}`);

    return {
      success: false,
      error: err.message,
      details
    };
  }
}

/**
 * Disconnect from MongoDB gracefully
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🍃 [MONGODB] Disconnected from MongoDB');
  }
}

/**
 * Check active connection state
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Get current database status summary
 */
export function getDatabaseStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] || 'unknown';
  return {
    state,
    isConnected: mongoose.connection.readyState === 1,
    database: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    maskedUri: maskMongoUri(config.mongodbUri)
  };
}

// Global connection event loggers
mongoose.connection.on('disconnected', () => {
  if (!config.isTest) {
    console.warn('⚠️ [MONGODB] Database disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  if (!config.isTest) {
    console.error('❌ [MONGODB] Runtime connection error:', err.message);
  }
});
