import app from './app';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 3000;

// Only start the long-running HTTP + Socket.IO server when this file is
// executed directly (e.g. `node dist/server.js` or `ts-node src/server.ts`).
// When deployed to Vercel as serverless functions the entrypoints import
// `app` (see `backend/src/api/index.ts`) and must not start a listener.
if (require.main === module) {
  // Create HTTP server and attach Socket.IO
  const httpServer = createServer(app);

  const io = new IOServer(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'https://swapper-drab.vercel.app'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authenticate socket connections using the JWT sent in auth
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      // Attach user id to socket
      (socket as any).user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    if (user && user.id) {
      const room = `user:${user.id}`;
      socket.join(room);
      console.log(`Socket connected for user ${user.id} (socket id: ${socket.id})`);
    }

    socket.on('disconnect', () => {
      // cleanup if necessary
    });
  });

  // Make io available to controllers via app
  app.set('io', io);

  const server = httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('✓ API endpoints available at http://localhost:3000/api\n');
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });
}

app.get("/", (req, res) => {
  res.send("API is running successfully! 👍");
});

export default app;