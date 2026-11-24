import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CjsModule = require('node:module');
const origLoad = CjsModule._load;
CjsModule._load = (req: string, parent: unknown, isMain: boolean) =>
  req === 'vscode' ? {} : origLoad.call(CjsModule, req, parent, isMain);
const { LiveConnectionService } = require('../out/extension.js');
CjsModule._load = origLoad;

function loadPassword(): string {
  const envPath = path.resolve(process.cwd(), '.env');
  const match = fs.readFileSync(envPath, 'utf8').match(/^DB_DEV_PASSWORD=(.+)$/m);
  if (!match?.[1]) throw new Error('Missing DB_DEV_PASSWORD in .env');
  return match[1].trim();
}

const TARGETS = [
  { id: 'v_pg', type: 'postgres', host: '127.0.0.1', port: 5432, database: 'dbstudio', username: 'postgres', ssl: true, rejectUnauthorized: false },
  { id: 'v_mysql', type: 'mysql', host: '127.0.0.1', port: 3306, database: 'dbstudio', username: 'root', ssl: true, rejectUnauthorized: false },
  { id: 'v_mariadb', type: 'mariadb', host: '127.0.0.1', port: 3307, database: 'dbstudio', username: 'root', ssl: true, rejectUnauthorized: false },
  { id: 'v_mssql', type: 'sqlserver', host: '127.0.0.1', port: 1433, database: 'master', username: 'sa', ssl: true, rejectUnauthorized: false },
  { id: 'v_oracle', type: 'oracle', host: '127.0.0.1', port: 1521, database: 'FREEPDB1', username: 'system', ssl: false, rejectUnauthorized: true },
  { id: 'v_ch', type: 'clickhouse', host: '127.0.0.1', port: 8123, database: 'dbstudio', username: 'default', ssl: true, rejectUnauthorized: false },
  { id: 'v_mongo', type: 'mongodb', host: '127.0.0.1', port: 27017, database: 'admin', username: 'root', ssl: true, rejectUnauthorized: false },
  { id: 'v_redis', type: 'redis', host: '127.0.0.1', port: 6379, database: '0', username: '', ssl: true, rejectUnauthorized: false },
];

async function testWithRetry(service: any, cfg: any, pwd: string, attempts = 2) {
  let last: any;
  for (let i = 0; i < attempts; i++) {
    last = await service.testConnection({ ...cfg, timeoutMs: 4000 }, pwd);
    if (last.success) return last;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return last;
}

async function main() {
  const pwd = loadPassword();
  const mem = new Map<string, string>();
  const service = new LiveConnectionService({
    get: async (k: string) => mem.get(k),
    store: async (k: string, v: string) => {
      mem.set(k, v);
    },
    delete: async (k: string) => {
      mem.delete(k);
    },
  });

  await Promise.all(
    TARGETS.map(async (cfg) => {
      const r = await testWithRetry(service, cfg, pwd);
      const icon = r.success ? 'PASS' : 'FAIL';
      console.log(`[${icon}] ${cfg.type.padEnd(11)} 127.0.0.1:${String(cfg.port).padEnd(5)} ${r.message} ${r.version ?? ''}`.trim());
    })
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
