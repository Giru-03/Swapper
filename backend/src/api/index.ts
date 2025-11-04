import app from '../server';
import serverless from 'serverless-http';

// Wrap the Express app with serverless-http for Vercel.
// The long-running Socket.IO server is started only when `server.ts` is run directly.
const handler = serverless(app as any);

// Lightweight wrapper to log method and path and forward to serverless-http.
export default async function (req: any, res: any) {
  try {
    console.log(`[serverless] ${req.method} ${req.url}`);
    // Let Express handle CORS preflight/OPTIONS via the cors middleware.
    return handler(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    res.statusCode = 500;
    res.end('Internal server error');
  }
}
