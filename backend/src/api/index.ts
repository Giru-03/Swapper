import app from '../server';
import serverless from 'serverless-http';

// Wrap the Express app with serverless-http for Vercel.
// The long-running Socket.IO server is started only when `server.ts` is run directly.
const handler = serverless(app as any);

export default async function (req: any, res: any) {
  return handler(req, res);
}
