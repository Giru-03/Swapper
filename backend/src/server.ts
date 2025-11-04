import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import swapRoutes from './routes/swaps';
import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

const PORT = process.env.PORT || 3000;

const app = express();

// CORS configuration (allows local dev + deployed frontend)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'https://swapper-drab.vercel.app', 'https://swapper-api.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', swapRoutes);  // Swaps under /api for simplicity

// Debug endpoint to emit a socket event to a specific user (useful for testing connections)
app.post('/api/debug/emit', (req: any, res: any) => {
  try {
    const { userId, event, payload } = req.body || {};
    if (!userId || !event) return res.status(400).json({ error: 'userId and event are required' });
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ error: 'Socket server not initialized' });
    const room = `user:${userId}`;
    io.to(room).emit(event, payload ?? {});
    console.log(`Debug emit: event='${event}' to ${room} payload=`, payload);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Debug emit error', err);
    return res.status(500).json({ error: 'Failed to emit' });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

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