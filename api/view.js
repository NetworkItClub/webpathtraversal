// api/view.js
// Vulnerable file viewer for Directory Traversal CTF.
// Tries multiple "base" directories and several decodings of the input
// so contestants can try many ../ combinations and encodings.

const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const raw = (req.query.file || 'profile.txt').toString();

  // build candidate variants from user input: raw, decoded once, decoded twice,
  // replace %2e%2e, backslashes -> forward slashes, etc.
  const variants = new Set();

  function add(v) { if (v && !variants.has(v)) variants.add(v); }

  add(raw);
  try { add(decodeURIComponent(raw)); } catch(e){}
  try { add(decodeURIComponent(decodeURIComponent(raw))); } catch(e){}
  // replace common encodings
  add(raw.replace(/%2e/ig, '.').replace(/%2f/ig, '/'));
  add(raw.replace(/\\/g, '/'));
  add(raw.replace(/\.\./g, '..')); // keep
  // double dots encoded
  add(raw.replace(/%252e%252e/ig, '..')); // double-encoded %2e%2e => %252e%252e
  // other simple normalizations
  add(raw.replace(/\/+/g, '/'));

  // bases to try: several depths so different numbers of ../ will land on repo root's var/...
  // add many bases under project so traversal can go up various steps
  const bases = [
    process.cwd(),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'public', 'files'),
    path.join(process.cwd(), 'play', 'one', 'two', 'three'),    // depth 3
    path.join(process.cwd(), 'play', 'a','b','c','d','e'),      // depth 5
    path.join(process.cwd(), 'play', 'deep','level','x','y','z')// depth 5
  ];

  // attempt to read each candidate: for each base, for each variant
  const tried = [];
  (async () => {
    for (const base of bases) {
      for (const v of variants) {
        // normalize slashes and remove leading slashes to treat relative
        let candidate = v;
        // if starts with "/" treat as absolute attempt (allow absolute too)
        let absAttempt = false;
        if (candidate.startsWith('/')) {
          absAttempt = true;
        }
        // build resolved path
        let resolved;
        try {
          if (absAttempt) {
            resolved = path.resolve('/', candidate); // absolute
          } else {
            resolved = path.resolve(base, candidate);
          }
        } catch (e) {
          continue;
        }
        tried.push(resolved);

        try {
          // async readFile sync-style with await-like promise
          const data = fs.readFileSync(resolved, 'utf8');
          // success: return the found path and contents
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(
            `=== FILE FOUND ===\nPath: ${resolved}\n\nContents:\n\n${data}`
          );
        } catch (err) {
          // ignore read errors, try next candidate
        }
      }
    }

    // nothing found: respond with tried paths summary to make challenge interactive
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.statusCode = 404;
    return res.end(
      `File not found. Tried ${tried.length} candidate paths (examples):\n\n` +
      tried.slice(0,10).map(p => ` - ${p}`).join('\n') +
      `\n\nTry different ../ counts or encodings (e.g. %2e%2e or %252e%252e).`
    );
  })();
};
