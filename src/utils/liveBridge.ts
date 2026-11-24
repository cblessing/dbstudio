import { DatabaseType, QueryResult, TableDefinition } from '../types/database';
import { postVsCodeMessage } from './exportData';

export interface LiveConnectionPayload {
  id: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  rejectUnauthorized: boolean;
}

export interface LiveTestResponse {
  success: boolean;
  latencyMs: number;
  version?: string;
  message: string;
}

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();
let rpcCounter = 1;
let listenerAttached = false;

function isTrustedOrigin(origin: string): boolean {
  if (!origin) return false;
  return origin === window.location.origin || origin.startsWith('vscode-webview://');
}

function handleRpcWindowMessage(event: MessageEvent): void {
  if (!isTrustedOrigin(event.origin)) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object' || msg.command !== 'rpcResponse') return;

  const entry = pendingRequests.get(String(msg.requestId ?? ''));
  if (!entry) return;

  clearTimeout(entry.timer);
  pendingRequests.delete(String(msg.requestId));
  if (msg.ok) {
    entry.resolve(msg.data);
  } else {
    entry.reject(new Error(String(msg.error ?? 'Live database request failed')));
  }
}

function ensureRpcListener(): void {
  if (listenerAttached || typeof window === 'undefined') return;
  window.addEventListener('message', handleRpcWindowMessage);
  listenerAttached = true;
}

export function isNetworkDatabaseType(type: DatabaseType): boolean {
  return type !== 'sqlite' && type !== 'duckdb';
}

export function isVsCodeWebview(): boolean {
  const g = globalThis as any;
  return Boolean(g.__vscodeApi || typeof g.acquireVsCodeApi === 'function');
}

function invokeLiveRpc<T>(
  command: string,
  payload: Record<string, unknown>,
  timeoutMs = 15000
): Promise<T> {
  ensureRpcListener();
  const requestId = `rpc_${rpcCounter++}`;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Timed out waiting for extension host response (${command}).`));
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timer });
    const sent = postVsCodeMessage({ command, requestId, ...payload });
    if (!sent) {
      clearTimeout(timer);
      pendingRequests.delete(requestId);
      reject(new Error('VS Code extension host bridge is unavailable.'));
    }
  });
}

export function testLiveConnection(
  config: LiveConnectionPayload,
  password: string
): Promise<LiveTestResponse> {
  return invokeLiveRpc<LiveTestResponse>('testLiveConnection', { config, password });
}

export function saveLiveConnection(
  config: LiveConnectionPayload,
  password: string
): Promise<LiveConnectionPayload> {
  return invokeLiveRpc<LiveConnectionPayload>('saveLiveConnection', { config, password });
}

export function deleteLiveConnection(connectionId: string): Promise<{ deleted: boolean }> {
  return invokeLiveRpc<{ deleted: boolean }>('deleteLiveConnection', { connectionId });
}

export function executeLiveQuery(
  connectionId: string,
  query: string,
  options?: { params?: unknown[]; offset?: number; batchSize?: number }
): Promise<QueryResult> {
  return invokeLiveRpc<QueryResult>('executeLiveQuery', { connectionId, query, options }, 30000);
}

export function introspectLiveSchema(connectionId: string): Promise<TableDefinition[]> {
  return invokeLiveRpc<TableDefinition[]>('introspectLiveSchema', { connectionId }, 20000);
}

export function getLiveConnectionPassword(connectionId: string): Promise<string> {
  return invokeLiveRpc<string>('getLiveConnectionPassword', { connectionId }, 5000);
}
