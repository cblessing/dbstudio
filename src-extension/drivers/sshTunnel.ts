import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { LiveConnectionConfig, LiveSshConfig, loadOptionalDriver } from './types';

export function expandHomePath(filePath: string): string {
  const trimmed = filePath.trim();
  if (trimmed === '~') return os.homedir();
  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return trimmed;
}

export function resolveSshAgentSocket(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string {
  if (env.SSH_AUTH_SOCK) return env.SSH_AUTH_SOCK;
  if (platform === 'win32') return '\\\\.\\pipe\\openssh-ssh-agent';
  throw new Error('SSH_AUTH_SOCK is not set. Start ssh-agent or choose Private Key / Password authentication.');
}

function loadPrivateKeyBuffer(keyPath: string | undefined): Buffer {
  if (!keyPath || !keyPath.trim()) {
    throw new Error('SSH Private Key path is required for Private Key authentication.');
  }
  const resolved = expandHomePath(keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SSH private key file not found: ${resolved}`);
  }
  return fs.readFileSync(resolved);
}

export function buildSshConnectConfig(
  ssh: LiveSshConfig,
  sshSecret: string,
  timeoutMs = 10000
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    host: ssh.host,
    port: ssh.port,
    username: ssh.username,
    readyTimeout: timeoutMs,
  };

  if (ssh.authMethod === 'agent') {
    return { ...base, agent: resolveSshAgentSocket() };
  }
  if (ssh.authMethod === 'password') {
    return { ...base, password: sshSecret };
  }
  const privateKey = loadPrivateKeyBuffer(ssh.privateKeyPath);
  return sshSecret ? { ...base, privateKey, passphrase: sshSecret } : { ...base, privateKey };
}

function connectSshClient(connectConfig: Record<string, unknown>): Promise<any> {
  const { Client } = loadOptionalDriver('ssh2');
  return new Promise((resolve, reject) => {
    const client = new Client();
    const cleanup = () => {
      client.removeListener('ready', onReady);
      client.removeListener('error', onError);
    };
    const onReady = () => {
      cleanup();
      resolve(client);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    client.once('ready', onReady);
    client.once('error', onError);
    client.connect(connectConfig);
  });
}

function startLocalForwardServer(
  sshClient: any,
  targetHost: string,
  targetPort: number
): Promise<{ server: net.Server; localPort: number; sockets: Set<net.Socket> }> {
  const sockets = new Set<net.Socket>();
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
      socket.on('error', () => {});
      sshClient.forwardOut(
        socket.remoteAddress || '127.0.0.1',
        socket.remotePort || 0,
        targetHost,
        targetPort,
        (err: Error | undefined, stream: any) => {
          if (err) {
            socket.destroy();
            return;
          }
          socket.pipe(stream).pipe(socket);
          socket.on('error', () => stream.end());
          stream.on('error', () => socket.destroy());
        }
      );
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to bind local SSH tunnel port.'));
        return;
      }
      resolve({ server, localPort: addr.port, sockets });
    });
  });
}

export async function withSshTunnel<T>(
  config: LiveConnectionConfig,
  sshSecret: string,
  fn: (effectiveConfig: LiveConnectionConfig) => Promise<T>
): Promise<T> {
  if (!config.ssh?.enabled) {
    return fn(config);
  }
  const connectConfig = buildSshConnectConfig(config.ssh, sshSecret, config.timeoutMs ?? 10000);
  const sshClient = await connectSshClient(connectConfig);
  let server: net.Server | null = null;
  let sockets: Set<net.Socket> | null = null;
  try {
    const started = await startLocalForwardServer(sshClient, config.host, config.port);
    server = started.server;
    sockets = started.sockets;
    return await fn({ ...config, host: '127.0.0.1', port: started.localPort });
  } finally {
    if (sockets) {
      for (const s of sockets) s.destroy();
    }
    sshClient.end();
    if (server) {
      server.close();
    }
  }
}
