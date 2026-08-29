import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// www.whypals.com currently serves the exact same site as whypals.com with
// no redirect, which lets Google crawl and index both hostnames as separate
// pages — each with its own crawl schedule/cache, which is very likely why
// a fix (favicon, meta description) can show as live on one but stale on
// the other for a long time after deploying. Canonicalize on the bare
// domain so there's only ever one URL for Google (and browsers) to index.
app.use((req, res, next) => {
  const host = req.headers.host || "";
  if (host === "www.whypals.com" || host === "www.whypals.com:443") {
    return res.redirect(301, `https://whypals.com${req.originalUrl}`);
  }
  next();
});

app.use(cookieParser());
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const stories = await storage.getPublishedStories();
      const games = await storage.getAllGames();

      const baseUrl = "https://whypals.com";

      const staticRoutes = [
        { url: "/", priority: 1.0 },
        { url: "/login", priority: 0.9 },
        { url: "/games", priority: 0.9 },
        { url: "/about", priority: 0.7 },
        { url: "/contact", priority: 0.6 }
      ];

      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      // Static routes
      staticRoutes.forEach(route => {
        sitemap += `
  <url>
    <loc>${baseUrl}${route.url}</loc>
    <changefreq>daily</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
      });

      // Stories
      stories.forEach(story => {
        sitemap += `
  <url>
    <loc>${baseUrl}/story/${story.id}</loc>
    <lastmod>${new Date(story.updatedAt || story.publishedAt || Date.now()).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });

      // Games
      games.forEach(game => {
        sitemap += `
  <url>
    <loc>${baseUrl}/game/${game.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      });

      sitemap += `
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error) {
      console.error("Sitemap generation error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  const isProduction = process.env.NODE_ENV === "production";
  const root = process.cwd();

  if (!isProduction) {
    const vite = await import("vite").then((m) =>
      m.createServer({
        server: { middlewareMode: true },
        appType: "custom",
        configFile: path.resolve(root, "client/vite.config.ts"),
      })
    );
    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(root, "client/index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
        const { html, dehydratedState, helmet } = await render(url);
        console.log("Helmet title:", helmet?.title?.toString());
        const helmetHead = `
          ${helmet.title.toString()}
          ${helmet.meta.toString()}
          ${helmet.link.toString()}
          ${helmet.script.toString()}
        `;
        console.log("Helmet head injected length:", helmetHead.length);
        const appHtml = template.replace(`<!--app-html-->`, html)
                                .replace(`<!--app-head-->`, helmetHead)
                                .replace(
                                  `<!--app-state-->`,
                                  `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)}</script>`
                                );
        res.status(200).set({ "Content-Type": "text/html" }).end(appHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production SSR
    const dist = path.resolve(root, "client/dist");
    if (fs.existsSync(dist)) {
      app.use(express.static(dist, { index: false }));
      
      app.use("*", async (req, res, next) => {
        try {
          const url = req.originalUrl;
          const template = fs.readFileSync(path.resolve(dist, "index.html"), "utf-8");
          
          // Load the server entry built by Vite
          const serverEntryPath = path.resolve(dist, "server/entry-server.js");
          const { render } = await import(serverEntryPath);
          
          const { html, dehydratedState, helmet } = await render(url);
          
          const helmetHead = `
            ${helmet.title.toString()}
            ${helmet.meta.toString()}
            ${helmet.link.toString()}
            ${helmet.script.toString()}
          `;
          
          const appHtml = template.replace(`<!--app-html-->`, html)
                                  .replace(`<!--app-head-->`, helmetHead)
                                  .replace(
                                    `<!--app-state-->`,
                                    `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)}</script>`
                                  );
          
          res.status(200).set({ "Content-Type": "text/html" }).end(appHtml);
        } catch (e) {
          console.error("SSR Error:", e);
          next(e);
        }
      });
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 3001 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "3001", 10);
  httpServer.listen(
    {
      port,
      host: "127.0.0.1",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
