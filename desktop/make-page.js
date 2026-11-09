// Builds app/index.html from the web version (../index.html):
// wraps it in a full document, loads three.js and JSZip from local files so 3D and zips work offline,
// and adds a small bridge so "save file" buttons use the Windows save dialog.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const swap = (s, from, to) => { if (!s.includes(from)) throw new Error('Missing in page: ' + from); return s.split(from).join(to); };
let body = src;
body = swap(body, '<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>', '<script src="lib/jszip.min.js"></script>');
body = swap(body, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', '<script src="lib/three.min.js"></script>');
body = swap(body, "'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js'", "'lib/GLTFExporter.js'");
const bridge = `<script>
/* Desktop bridge: the web page asks for a "downloads" helper; here it hands files to the Windows save dialog. */
window.claude = { use: async name => name === 'downloads' ? { save: async ({ filename, data }) => {
  const blob = data instanceof Blob ? data : new Blob([data]); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 120000); return { status: 'saved' };
} } : null };
</script>`;
body = swap(body, '<script src="lib/jszip.min.js"></script>', bridge + '\n<script src="lib/jszip.min.js"></script>');
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>
${body}
</body></html>`;
fs.mkdirSync(path.join(__dirname, 'app'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'app', 'index.html'), page);
fs.copyFileSync(path.join(__dirname, 'build', 'icon.png'), path.join(__dirname, 'app', 'icon.png'));
console.log('app/index.html written (' + page.length + ' bytes)');
