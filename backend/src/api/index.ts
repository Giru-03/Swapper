import serverless from 'serverless-http';

// Dynamic import of the Express app so import-time errors (DB init, env
// problems, etc.) can be caught and logged instead of immediately blowing up
// the serverless invocation. Re-creating the handler per invocation is fine in
// serverless environments and gives better error visibility in logs.
export default async function (req: any, res: any) {
  try {
    console.log(`[serverless] ${req.method} ${req.url}`);

    // Import the app dynamically to catch any errors raised during module
    // initialization (for example: database connection attempts, schema init)
    const mod = await import('../server');
    const app = mod.default;
    if (!app) {
      console.error('Imported module did not export an Express app');
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Server misconfigured' }));
      return;
    }

    const handler = serverless(app as any);

    // serverless-http may return a promise or use callback semantics; await to
    // surface any thrown errors here.
    const result = handler(req, res);
    if (result && typeof (result as any).then === 'function') {
      await result;
    }
    return;
  } catch (err: any) {
    // Log full stack for Vercel logs and return JSON so clients see a readable
    // error instead of the generic FUNCTION_INVOCATION_FAILED message.
    console.error('Serverless handler error:', err?.stack || err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error', detail: err?.message }));
  }
}
