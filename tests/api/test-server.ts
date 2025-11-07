import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { NextRequest } from 'next/server';

type RouteHandler = (request: NextRequest) => Promise<Response> | Response;

type HandlerMap = Record<string, RouteHandler>;

type CreateServerOptions = {
  routes: HandlerMap;
  basePath?: string;
};

const getHandlerKey = (method: string, pathname: string) =>
  `${method.toUpperCase()} ${pathname}`;

const readBody = async (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export const createRouteTestServer = ({ routes, basePath = 'http://localhost' }: CreateServerOptions) =>
  createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url || !req.method) {
      res.statusCode = 500;
      res.end('Invalid request');
      return;
    }

    const url = new URL(req.url, basePath);
    const key = getHandlerKey(req.method, url.pathname);
    const handler = routes[key];

    if (!handler) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const bodyBuffer =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await readBody(req);

    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : value ?? '',
      ])
    );
    type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

    const init: NextRequestInit = {
      method: req.method,
      headers,
    };

    if (bodyBuffer && bodyBuffer.length > 0) {
      init.body = bodyBuffer.toString();
    }

    const nextRequest = new NextRequest(url, init);

    const response = await handler(nextRequest);

    res.statusCode = response.status;
    response.headers.forEach((value, header) => {
      res.setHeader(header, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(Buffer.from(value));
        }
      }

      res.end(Buffer.concat(chunks));
    } else {
      res.end();
    }
  });
