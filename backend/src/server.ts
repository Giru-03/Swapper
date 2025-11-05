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
// Use a permissive CORS policy that echoes the request origin. This is
// convenient for debugging across Vercel deployments (preview URLs, etc.).
// For production lock this down to a fixed allowlist.
app.use(cors({
  origin: true, // echo back request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Ensure CORS headers are present on all responses and handle OPTIONS early.
// Some serverless platforms or proxies may not forward preflight correctly, so
// this explicit middleware helps guarantee the browser receives the expected
// Access-Control-Allow-* headers.
app.use((req: any, res: any, next: any) => {
  const origin = req.get('origin') || req.get('referer') || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    // short-circuit preflight
    return res.status(200).end();
  }
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Root endpoint - must be defined before other routes to work properly
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Swapper API is running successfully! 👍',
    timestamp: new Date().toISOString() 
  });
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

// Debug echo endpoint: returns request metadata for troubleshooting CORS and routing.
app.all('/api/debug/echo', (req: any, res: any) => {
  const origin = req.get('origin') || req.get('referer') || null;
  // Ensure CORS headers are present on the response
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  res.json({
    method: req.method,
    path: req.originalUrl || req.url,
    origin,
    headers: req.headers,
    body: req.body,
  });
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

// Respond to CORS preflight requests for any route (helps serverless environments)
app.options('*', cors());

// 404 handler - log and return JSON so deployed functions clearly show missing routes
app.use((req: Request, res: Response) => {
  const path = req.originalUrl || req.url;
  console.warn(`No route matched for ${req.method} ${path}`);
  res.status(404).json({ error: 'Not found', path });
});

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);

const io = new IOServer(httpServer, {
  cors: {
    origin: true, // Allow all origins for Heroku deployment
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
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log('✓ Socket.IO enabled for real-time notifications\n');
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

export default app;