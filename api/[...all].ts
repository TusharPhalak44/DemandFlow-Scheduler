import type { IncomingMessage, ServerResponse } from 'http';

let appPromise: Promise<any> | null = null;

async function getAppInstance() {
  if (!appPromise) {
    appPromise = (async () => {
      // 1. Resolve and set DATABASE_URL from individual DB_* environment variables
      let dbConfigMod: any;
      try {
        dbConfigMod = await import('../server/dist/config/dbConfig.js');
      } catch {
        dbConfigMod = await import('../server/src/config/dbConfig.js');
      }
      const dbUrl = dbConfigMod.getDatabaseUrl();
      process.env.DATABASE_URL = dbUrl;

      // 2. Import Express app
      let serverMod: any;
      try {
        serverMod = await import('../server/dist/index.js');
      } catch {
        serverMod = await import('../server/src/index.js');
      }
      return serverMod.default || serverMod;
    })();
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Normalize Vercel URL rewrite path
    if (req.url) {
      const matchedPath = req.headers['x-matched-path'] as string | undefined;
      if (matchedPath && matchedPath.startsWith('/api')) {
        req.url = matchedPath;
      } else if (req.url.startsWith('/api/[...all]')) {
        const urlObj = new URL(req.url, 'http://localhost');
        const allParam = urlObj.searchParams.get('all');
        if (allParam) {
          urlObj.searchParams.delete('all');
          const remainingQuery = urlObj.searchParams.toString();
          req.url = `/api/${allParam}${remainingQuery ? '?' + remainingQuery : ''}`;
        }
      }
    }

    const app = await getAppInstance();
    return app(req, res);
  } catch (err: any) {
    console.error('Serverless Handler Exception:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'FunctionInvocationError',
          message: err?.message || 'Serverless execution error',
          details: err?.stack || String(err),
        })
      );
    }
  }
}
