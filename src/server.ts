import { APP_BASE_HREF } from '@angular/common';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import bootstrap from './main.server';

// Allow self-signed certificates for development
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.html');

  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req: express.Request, res: express.Response) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    bootstrap()
      .then(html => res.send(html))
      .catch(err => {
        console.error('Error:', err);
        res.sendFile(indexHtml);
      });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const serverInstance = serverRef ?? app();
  serverInstance.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Check if this is the main module
const mainModule = require.main;
const moduleFilename = mainModule?.filename || '';

if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export default bootstrap;

// Expose a request handler for platforms that expect a single exported handler
// Create a lazy reference so we only build the express app once
let serverRef: express.Express | null = null;

export const reqHandler = (req: express.Request, res: express.Response) => {
  if (!serverRef) {
    serverRef = app();
  }
  // Express app is also a request handler function
  return serverRef(req, res);
};
