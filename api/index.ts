import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server/src/index.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'FunctionInvocationError',
          message: err?.message || 'Serverless function execution failed.',
        })
      );
    }
  }
}
