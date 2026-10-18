import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  authorizeBuildRequest,
  prepareContentRoot,
  renderPublishedPosts,
  resolveStaticFile,
} from './blogger-runtime.mjs';

const siteRoot = path.resolve(
  process.env.PERSONAL_SITE_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
);
const contentRoot = path.resolve(
  process.env.PERSONAL_CONTENT_DIR || path.join(siteRoot, 'site-data'),
);
const { postsDir, publicBlogDir, sitemapPath } = await prepareContentRoot({
  contentRoot,
  releaseBlogDir: path.join(siteRoot, 'blog'),
  releaseSitemapPath: path.join(siteRoot, 'sitemap.xml'),
});

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname === '/health') {
      return json(response, 200, { ok: true, service: 'personaltrainerfuengirola' });
    }

    if (url.pathname === '/api/blogger/build' && request.method === 'POST') {
      if (!authorizeBuildRequest(request.headers.authorization || '', process.env.BLOGGER_BUILD_SECRET || '')) {
        return json(response, 401, { error: 'Unauthorized' });
      }
      const result = await renderPublishedPosts({
        postsDir,
        publicBlogDir,
        siteUrl: 'https://personaltrainerfuengirola.com',
        blogIndexPath: path.join(publicBlogDir, 'index.html'),
        sitemapPath,
      });
      return json(response, 200, { ok: true, ...result });
    }

    if (!['GET', 'HEAD'].includes(request.method || '')) {
      return json(response, 405, { error: 'Method not allowed' });
    }

    const filePath = resolveStaticFile(url.pathname, { siteRoot, publicBlogDir, sitemapPath });
    if (!filePath) return json(response, 404, { error: 'Not found' });
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return json(response, 404, { error: 'Not found' });
    response.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Content-Length': fileStat.size,
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') return response.end();
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error.code === 'ENOENT') return json(response, 404, { error: 'Not found' });
    console.error(error);
    return json(response, 500, { error: 'Internal server error' });
  }
});

server.listen(
  Number(process.env.PORT || 3000),
  process.env.HOST || '0.0.0.0',
  () => console.log(`Personal Trainer Fuengirola listening on ${process.env.PORT || 3000}`),
);

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(payload);
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.xml': 'application/xml; charset=utf-8',
  })[extension] || 'application/octet-stream';
}
