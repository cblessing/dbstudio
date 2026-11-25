import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function loadEnvPassword() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env file. Copy .env.example to .env and set DB_DEV_PASSWORD.');
  }
  const match = fs.readFileSync(envPath, 'utf8').match(/^DB_DEV_PASSWORD=(.+)$/m);
  const pwd = match?.[1]?.trim();
  if (!pwd) {
    throw new Error('DB_DEV_PASSWORD is empty in .env.');
  }
  return pwd;
}

function buildServices(pwd, certsDir) {
  const pgTlsWrapper = [
    'mkdir -p /tmp/pg-tls',
    'cp /certs-ro/server.crt /certs-ro/server.key /certs-ro/ca.crt /tmp/pg-tls/',
    'chown -R postgres:postgres /tmp/pg-tls',
    'chmod 600 /tmp/pg-tls/server.key',
    'exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/pg-tls/server.crt -c ssl_key_file=/tmp/pg-tls/server.key -c ssl_ca_file=/tmp/pg-tls/ca.crt',
  ].join(' && ');

  return [
    {
      name: 'postgres',
      container: 'dbstudio-postgres',
      image: 'docker.io/library/postgres:17',
      ports: ['127.0.0.1:5432:5432'],
      volumes: [`${certsDir}:/certs-ro:ro`],
      env: ['POSTGRES_USER=postgres', `POSTGRES_PASSWORD=${pwd}`, 'POSTGRES_DB=dbstudio'],
      entrypoint: ['sh', '-c', pgTlsWrapper],
      cmd: [],
    },
    {
      name: 'mysql',
      container: 'dbstudio-mysql',
      image: 'docker.io/library/mysql:8.4',
      ports: ['127.0.0.1:3306:3306'],
      volumes: [],
      env: [`MYSQL_ROOT_PASSWORD=${pwd}`, 'MYSQL_DATABASE=dbstudio'],
      entrypoint: null,
      cmd: [],
    },
    {
      name: 'mariadb',
      container: 'dbstudio-mariadb',
      image: 'docker.io/library/mariadb:11',
      ports: ['127.0.0.1:3307:3306'],
      volumes: [`${certsDir}:/certs-ro:ro`],
      env: [`MARIADB_ROOT_PASSWORD=${pwd}`, 'MARIADB_DATABASE=dbstudio'],
      entrypoint: null,
      cmd: [
        '--ssl-cert=/certs-ro/server.crt',
        '--ssl-key=/certs-ro/server.key',
        '--ssl-ca=/certs-ro/ca.crt',
      ],
    },
    {
      name: 'sqlserver',
      container: 'dbstudio-sqlserver',
      image: 'mcr.microsoft.com/mssql/server:2022-latest',
      ports: ['127.0.0.1:1433:1433'],
      volumes: [],
      env: ['ACCEPT_EULA=Y', `MSSQL_SA_PASSWORD=${pwd}`, 'MSSQL_PID=Developer'],
      entrypoint: null,
      cmd: [],
    },
    {
      name: 'oracle',
      container: 'dbstudio-oracle',
      image: 'container-registry.oracle.com/database/free:latest-lite',
      ports: ['127.0.0.1:1521:1521'],
      volumes: [],
      env: [`ORACLE_PWD=${pwd}`],
      entrypoint: null,
      cmd: [],
    },
    {
      name: 'clickhouse',
      container: 'dbstudio-clickhouse',
      image: 'docker.io/clickhouse/clickhouse-server:latest',
      ports: ['127.0.0.1:8123:8443'],
      volumes: [
        `${certsDir}:/etc/clickhouse-server/certs:ro`,
        `${path.join(certsDir, 'clickhouse-tls.xml')}:/etc/clickhouse-server/config.d/tls.xml:ro`,
      ],
      env: [
        'CLICKHOUSE_DB=dbstudio',
        'CLICKHOUSE_USER=default',
        `CLICKHOUSE_PASSWORD=${pwd}`,
        'CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1',
      ],
      entrypoint: null,
      cmd: [],
    },
    {
      name: 'mongodb',
      container: 'dbstudio-mongodb',
      image: 'docker.io/library/mongo:8',
      ports: ['127.0.0.1:27017:27017'],
      volumes: [`${certsDir}:/certs-ro:ro`],
      env: ['MONGO_INITDB_ROOT_USERNAME=root', `MONGO_INITDB_ROOT_PASSWORD=${pwd}`],
      entrypoint: null,
      cmd: [
        '--tlsMode',
        'preferTLS',
        '--tlsCertificateKeyFile',
        '/certs-ro/server.pem',
        '--tlsCAFile',
        '/certs-ro/ca.crt',
        '--tlsAllowConnectionsWithoutCertificates',
      ],
    },
    {
      name: 'redis',
      container: 'dbstudio-redis',
      image: 'docker.io/library/redis:7-alpine',
      ports: ['127.0.0.1:6379:6379'],
      volumes: [`${certsDir}:/certs-ro:ro`],
      env: [],
      entrypoint: null,
      cmd: [
        'redis-server',
        '--tls-port',
        '6379',
        '--port',
        '0',
        '--tls-cert-file',
        '/certs-ro/server.crt',
        '--tls-key-file',
        '/certs-ro/server.key',
        '--tls-ca-cert-file',
        '/certs-ro/ca.crt',
        '--tls-auth-clients',
        'no',
        '--requirepass',
        pwd,
      ],
    },
    {
      name: 'bastion',
      optional: true,
      container: 'dbstudio-bastion',
      image: 'docker.io/library/alpine:3.21',
      ports: ['127.0.0.1:2222:22'],
      volumes: [`${certsDir}:/certs-ro:ro`],
      env: [`BASTION_PASSWORD=${pwd}`],
      entrypoint: [
        'sh',
        '-c',
        [
          'apk add --no-cache openssh-server >/dev/null',
          'ssh-keygen -A >/dev/null',
          'adduser -D -s /bin/sh bastion 2>/dev/null || true',
          'echo "bastion:${BASTION_PASSWORD}" | chpasswd',
          'mkdir -p /home/bastion/.ssh && cp /certs-ro/bastion_id_ed25519.pub /home/bastion/.ssh/authorized_keys',
          'chown -R bastion:bastion /home/bastion/.ssh && chmod 700 /home/bastion/.ssh && chmod 600 /home/bastion/.ssh/authorized_keys',
          'printf "Port 22\\nPermitRootLogin no\\nPasswordAuthentication yes\\nPubkeyAuthentication yes\\nAllowTcpForwarding yes\\nGatewayPorts no\\n" > /etc/ssh/sshd_config.d/dbstudio.conf',
          'exec /usr/sbin/sshd -D -e',
        ].join(' && '),
      ],
      cmd: [],
    },
  ];
}

function runPodman(args) {
  return execFileSync('podman', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function ensureBastionKey(certsDir) {
  const privKey = path.join(certsDir, 'bastion_id_ed25519');
  if (fs.existsSync(privKey) && fs.existsSync(`${privKey}.pub`)) return;
  fs.mkdirSync(certsDir, { recursive: true });
  execFileSync('ssh-keygen', ['-t', 'ed25519', '-N', '', '-f', privKey, '-C', 'dbstudio-bastion'], {
    stdio: 'inherit',
  });
}

const [, , action = 'up', ...selected] = process.argv;
const pwd = loadEnvPassword();
const certsDir = path.resolve(process.cwd(), '.certs');
const services = buildServices(pwd, certsDir).filter((s) =>
  selected.length === 0 ? !s.optional : selected.includes(s.name)
);

if (action === 'down') {
  for (const svc of services) {
    try {
      runPodman(['rm', '-f', svc.container]);
      console.log(`Stopped & removed ${svc.container}`);
    } catch {
      console.log(`Skipped ${svc.container} (not running)`);
    }
  }
  process.exit(0);
}

if (action === 'status') {
  console.log(
    runPodman([
      'ps',
      '-a',
      '--filter',
      'name=dbstudio-',
      '--format',
      'table {{.Names}}\t{{.Status}}\t{{.Ports}}',
    ])
  );
  process.exit(0);
}

if (action === 'start') {
  for (const svc of services) {
    try {
      runPodman(['start', svc.container]);
      console.log(`Started ${svc.container}`);
    } catch (err) {
      console.error(`Failed to start ${svc.container}: ${err.stderr || err.message}`);
    }
  }
  process.exit(0);
}

if (!fs.existsSync(path.join(certsDir, 'server.crt'))) {
  execFileSync('node', ['scripts/generate-dev-certs.mjs'], { stdio: 'inherit' });
}
if (services.some((s) => s.name === 'bastion')) {
  ensureBastionKey(certsDir);
}

for (const svc of services) {
  console.log(`Starting ${svc.container} (${svc.image})...`);
  const args = ['run', '-d', '--replace', '--restart=unless-stopped', '--name', svc.container];
  for (const p of svc.ports) args.push('-p', p);
  for (const v of svc.volumes) args.push('-v', v);
  for (const e of svc.env) args.push('-e', e);
  if (svc.entrypoint) {
    args.push('--entrypoint', svc.entrypoint[0]);
    args.push(svc.image, ...svc.entrypoint.slice(1), ...svc.cmd);
  } else {
    args.push(svc.image, ...svc.cmd);
  }
  try {
    const id = runPodman(args);
    console.log(`  OK ${svc.container} -> ${id.slice(0, 12)}`);
  } catch (err) {
    console.error(`  FAILED ${svc.container}: ${err.stderr || err.message}`);
  }
}
