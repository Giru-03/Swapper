import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import swapRoutes from './routes/swaps';

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173' , 'https://swapper-drab.vercel.app'],
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

export default app;