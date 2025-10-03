// api/view.js (patched)
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const raw = (req.query.file || 'profile.txt').toString();

  // generate some variants (as before)
  const variants = new Set();
  function add(v){ if(v && !variants.has(v)) variants.add(v); }
  add(raw);
  try{ add(decodeURIComponent(raw)); } catch(e){}
  try{ add(decodeURIComponent(decodeURIComponent(raw))); } catch(e){}
  add(raw.replace(/%2e/ig, '.').replace(/%2f/ig, '/'));
  add(raw.replace(/\\/g, '/'));
  add(raw.replace(/\.\./g, '..'));
  add(raw.replace(/%252e%252e/ig, '..'));
  add(raw.replace(/\/+/g, '/'));

  const bases = [
    process.cwd(),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'public','files'),
    path.join(process.cwd(), 'play','one','two','three'),
    path.join(process.cwd(), 'play','a','b','c','d','e'),
    path.join(process.cwd(), 'play','deep','level','x','y','z')
  ];

  const tried = [];
  const FLAG = process.env.FLAG || null;

  (async () => {
    for (const base of bases) {
      for (const v of variants) {
        let candidate = v;
        let absAttempt = false;
        if (candidate.startsWith('/')) absAttempt = true;
        let resolved;
        try {
          if (absAttempt) {
            resolved = path.resolve('/', candidate);
          } else {
            resolved = path.resolve(base, candidate);
          }
        } catch (e) {
          continue;
        }
        tried.push(resolved);

        // If this resolved path looks like the challenge flag location,
        // return the environment FLAG (so we don't rely on commit)
        const normalizedWanted = path.normalize('var/www/html/flag.txt');
        if (resolved.endsWith(normalizedWanted)) {
          res.setHeader('Content-Type','text/plain; charset=utf-8');
          return res.end(FLAG ? FLAG : 'FLAG_NOT_SET');
        }

        try {
          const data = fs.readFileSync(resolved, 'utf8');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(`=== FILE FOUND ===\nPath: ${resolved}\n\nContents:\n\n${data}`);
        } catch (err) {
          // ignore and try next
        }
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.statusCode = 404;
    return res.end(
      `File not found. Tried ${tried.length} candidate paths (examples):\n\n` +
      tried.slice(0,10).map(p => ` - ${p}`).join('\n') +
      `\n\nTry different ../ counts or encodings (e.g. %2e%2e or %252e%252e).`
    );
  })();
};
