import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { setupSocketIO } from './sockets/socketHandler.js';
import { ENV } from './config/env.js';

async function bootstrap() {
  console.log('--- Starting Royal Wedding Platform Backend ---');

  // Connect to Database
  await connectDB();

  // Initialize Express App
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  setupSocketIO(server, ENV.CLIENT_URL);
  console.log('[Socket.IO] Real-time engine attached');

  server.listen(ENV.PORT, () => {
    console.log(`[Server] Royal Wedding API listening on http://localhost:${ENV.PORT}`);
    console.log(`[Server] Health check: http://localhost:${ENV.PORT}/api/health`);
    console.log(`[Server] Environment: ${ENV.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err);
  process.exit(1);
});
