import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const certsDir = path.resolve(process.cwd(), '.certs');
fs.mkdirSync(certsDir, { recursive: true });

const clickhouseXml = `<clickhouse>
  <https_port>8443</https_port>
  <openSSL>
    <server>
      <certificateFile>/etc/clickhouse-server/certs/server.crt</certificateFile>
      <privateKeyFile>/etc/clickhouse-server/certs/server.key</privateKeyFile>
      <caConfig>/etc/clickhouse-server/certs/ca.crt</caConfig>
      <verificationMode>none</verificationMode>
      <loadDefaultCAFile>true</loadDefaultCAFile>
      <cacheSessions>true</cacheSessions>
      <disableProtocols>sslv2,sslv3</disableProtocols>
      <preferServerCiphers>true</preferServerCiphers>
    </server>
  </openSSL>
</clickhouse>
`;
fs.writeFileSync(path.join(certsDir, 'clickhouse-tls.xml'), clickhouseXml, 'utf8');

if (!fs.existsSync(path.join(certsDir, 'server.crt'))) {
  const script = [
    'set -e',
    'openssl req -x509 -newkey rsa:2048 -nodes -days 825 -keyout /certs/ca.key -out /certs/ca.crt -subj "/CN=DatabaseStudioDevCA"',
    'openssl req -newkey rsa:2048 -nodes -keyout /certs/server.key -out /certs/server.csr -subj "/CN=localhost"',
    'printf "subjectAltName=DNS:localhost,IP:127.0.0.1\\nextendedKeyUsage=serverAuth\\n" > /certs/ext.cnf',
    'openssl x509 -req -in /certs/server.csr -CA /certs/ca.crt -CAkey /certs/ca.key -CAcreateserial -out /certs/server.crt -days 825 -extfile /certs/ext.cnf',
    'cat /certs/server.crt /certs/server.key > /certs/server.pem',
    'chmod 644 /certs/ca.crt /certs/server.crt /certs/server.key /certs/server.pem',
    'rm -f /certs/server.csr /certs/ext.cnf /certs/ca.srl',
  ].join(' && ');

  execFileSync(
    'podman',
    ['run', '--rm', '-v', `${certsDir}:/certs`, 'docker.io/library/postgres:17', 'sh', '-c', script],
    { stdio: 'inherit' }
  );
  console.log(`Generated local dev TLS certificates in ${certsDir}`);
} else {
  console.log(`TLS certificates already exist in ${certsDir}`);
}
