const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_DIR = __dirname;
const SUPABASE_URL = 'https://wmxilttilpcnnqodkbqf.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndteGlsdHRpbHBjbm5xb2RrYnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ4ODYxMywiZXhwIjoyMTA1MDY0NjEzfQ.0LthUllPyWvTUzS2gL66LGWuQaXrykEIFmWvvC5WJQg';
const BUCKET = 'xorbit-site';

console.log('[1/4] Empaquetando sitio web y backend con tar...');
execSync('tar -czf site.tar.gz index.html css js server.js', { cwd: BASE_DIR });
const archiveData = fs.readFileSync(path.join(BASE_DIR, 'site.tar.gz'));
console.log(`[1/4] Archivo creado: site.tar.gz (${archiveData.length} bytes)`);

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('[2/4] Verificando / creando bucket público en Supabase Storage...');
  try {
    const createBucketUrl = new URL(`${SUPABASE_URL}/storage/v1/bucket`);
    const bucketRes = await request({
      hostname: createBucketUrl.hostname,
      path: createBucketUrl.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({ id: BUCKET, name: BUCKET, public: true }));
    console.log('Bucket status:', bucketRes.status, bucketRes.body);
  } catch (e) {
    console.log('Bucket check note:', e.message);
  }

  console.log('[3/4] Subiendo site.tar.gz a Supabase Storage...');
  const uploadUrl = new URL(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/site.tar.gz`);
  const uploadRes = await request({
    hostname: uploadUrl.hostname,
    path: uploadUrl.pathname,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/gzip',
      'x-upsert': 'true',
      'Content-Length': archiveData.length
    }
  }, archiveData);
  console.log('Upload status:', uploadRes.status, uploadRes.body);

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/site.tar.gz`;
  console.log('\n=============================================');
  console.log('[4/4] URL Pública de descarga para el VPS:');
  console.log(publicUrl);
  console.log('=============================================\n');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
