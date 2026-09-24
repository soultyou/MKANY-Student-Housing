import app from "../artifacts/api-server/src/app";
import { setRuntimeDatabaseUrl } from "../lib/db/src/index";

export interface Env {
  ASSETS: Fetcher;
  HYPERDRIVE?: {
    connectionString: string;
  };
  DATABASE_URL?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Propagate runtime secrets and configurations to process.env for Node/Express modules
    if (env.CLERK_SECRET_KEY) process.env.CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
    if (env.CLERK_PUBLISHABLE_KEY) process.env.CLERK_PUBLISHABLE_KEY = env.CLERK_PUBLISHABLE_KEY;
    if (env.VITE_CLERK_PUBLISHABLE_KEY) process.env.VITE_CLERK_PUBLISHABLE_KEY = env.VITE_CLERK_PUBLISHABLE_KEY;
    if (env.CLERK_WEBHOOK_SECRET) process.env.CLERK_WEBHOOK_SECRET = env.CLERK_WEBHOOK_SECRET;
    if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    // Set DATABASE_URL and initialize runtime connection
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
      setRuntimeDatabaseUrl(env.DATABASE_URL);
    }

    if (url.pathname.startsWith("/api")) {
      return new Promise<Response>((resolve) => {
        handleExpressRequest(app, request, env, ctx).then(resolve);
      });
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleExpressRequest(app: any, request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  const body = request.body ? await request.arrayBuffer() : null;

  return new Promise((resolve) => {
    let resHeaders = new Headers();
    let statusCode = 200;
    const chunks: Uint8Array[] = [];

    const mockReq: any = {
      method: request.method,
      url: url.pathname + url.search,
      headers: Object.fromEntries(headers.entries()),
      socket: { encrypted: url.protocol === "https:" },
      on: (event: string, cb: any) => {
        if (event === "data" && body) {
          cb(Buffer.from(body));
        }
        if (event === "end") {
          cb();
        }
      },
      once: () => {},
      pause: () => {},
      resume: () => {},
      pipe: (res: any) => res,
    };

    const mockRes: any = {
      statusCode: 200,
      setHeader: (name: string, value: string | string[]) => {
        if (Array.isArray(value)) {
          value.forEach(v => resHeaders.append(name, v));
        } else {
          resHeaders.set(name, value);
        }
      },
      getHeader: (name: string) => resHeaders.get(name),
      removeHeader: (name: string) => resHeaders.delete(name),
      headersSent: false,
      writeHead: (code: number, hdrs?: any) => {
        statusCode = code;
        if (hdrs) {
          if (Array.isArray(hdrs)) {
            for (const [k, v] of hdrs) resHeaders.set(k, v);
          } else {
            for (const [k, v] of Object.entries(hdrs)) resHeaders.set(k, String(v));
          }
        }
      },
      write: (chunk: any) => {
        if (chunk) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
      },
      end: (chunk: any) => {
        if (chunk) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const resultBuffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const c of chunks) {
          resultBuffer.set(c, offset);
          offset += c.length;
        }
        resolve(new Response(resultBuffer, { status: statusCode, headers: resHeaders }));
      },
      json: (data: any) => {
        const bodyStr = JSON.stringify(data);
        resHeaders.set("Content-Type", "application/json; charset=utf-8");
        resolve(new Response(bodyStr, { status: statusCode, headers: resHeaders }));
      },
      send: (bodyContent: any) => {
        if (typeof bodyContent === "object" && bodyContent !== null) {
          return mockRes.json(bodyContent);
        }
        const bodyStr = String(bodyContent ?? "");
        if (!resHeaders.has("Content-Type")) {
          resHeaders.set("Content-Type", "text/html; charset=utf-8");
        }
        resolve(new Response(bodyStr, { status: statusCode, headers: resHeaders }));
      },
      sendStatus: (code: number) => {
        statusCode = code;
        resolve(new Response(null, { status: statusCode, headers: resHeaders }));
      },
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      type: (contentType: string) => {
        resHeaders.set("Content-Type", contentType);
        return mockRes;
      },
    };

    try {
      app(mockReq, mockRes);
    } catch (err: any) {
      console.error("[Worker Express Error]", err);
      resolve(new Response(JSON.stringify({ error: "Internal Worker Error", message: err?.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }));
    }
  });
}
