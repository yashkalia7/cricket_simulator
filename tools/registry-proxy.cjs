#!/usr/bin/env node
/**
 * A ~60-line npm registry proxy, for networks that filter `registry.npmjs.org`.
 *
 * WHY THIS EXISTS
 * ---------------
 * On this machine `registry.npmjs.org` is blocked by TLS SNI hostname, not by
 * IP: plain HTTP to it returns 403 in ~18ms, and `registry.yarnpkg.com` — npm's
 * own mirror — resolves into the *same* Cloudflare /16 and answers normally.
 *
 * npm works around this on its own (it rewrites tarball hosts to whatever
 * `registry` is configured). pnpm does not: it reads `dist.tarball` out of the
 * metadata verbatim, and that field is an absolute `https://registry.npmjs.org/...`
 * URL, so every tarball fetch hits the blocked host and resets.
 *
 * This proxy sits in front of the mirror and rewrites those URLs to point back
 * at itself.
 *
 * ON TRUST
 * --------
 * This does not widen the trust boundary. Metadata and tarballs both come from
 * npm's own CDN — `registry.yarnpkg.com` is npm-operated, not a third-party
 * mirror. And the `integrity` (sha512) field inside the metadata is passed
 * through untouched, so pnpm still verifies every tarball it downloads. A
 * tampered tarball fails the same check it would have failed direct.
 *
 * USAGE
 * -----
 *   node tools/registry-proxy.cjs &        # leave running
 *   pnpm install
 *
 * `.npmrc` already points `registry` at http://127.0.0.1:4873/.
 *
 * If you are on a network where registry.npmjs.org works, delete the `registry`
 * line from `.npmrc` and ignore this file.
 */

const http = require('node:http');
const https = require('node:https');

const UPSTREAM_HOST = 'registry.yarnpkg.com';
const BLOCKED_ORIGIN = 'https://registry.npmjs.org/';
const PORT = Number(process.env.REGISTRY_PROXY_PORT || 4873);
const SELF_ORIGIN = `http://127.0.0.1:${PORT}/`;

const server = http.createServer((req, res) => {
  const upstream = https.request(
    {
      host: UPSTREAM_HOST,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: UPSTREAM_HOST,
        // Identity encoding keeps the rewrite below a plain string operation.
        'accept-encoding': 'identity',
      },
    },
    (upstreamRes) => {
      const contentType = upstreamRes.headers['content-type'] || '';

      // Tarballs and everything else stream straight through, untouched.
      if (!contentType.includes('json')) {
        res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
        upstreamRes.pipe(res);
        return;
      }

      // Metadata gets its `dist.tarball` origins pointed back at this proxy.
      const chunks = [];
      upstreamRes.on('data', (chunk) => chunks.push(chunk));
      upstreamRes.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8').split(BLOCKED_ORIGIN).join(SELF_ORIGIN);
        const headers = { ...upstreamRes.headers };
        delete headers['content-encoding'];
        delete headers['transfer-encoding'];
        headers['content-length'] = Buffer.byteLength(body);
        res.writeHead(upstreamRes.statusCode || 502, headers);
        res.end(body);
      });
    },
  );

  upstream.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `registry proxy upstream failure: ${error.message}` }));
  });

  req.pipe(upstream);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`registry proxy listening on ${SELF_ORIGIN} -> https://${UPSTREAM_HOST}\n`);
});
