import * as vscode from 'vscode';
import { LiveConnectionService } from './connectionService';
import { sanitizeErrorMessage } from './types';

function sendRpcResponse(
  webview: vscode.Webview,
  requestId: string,
  ok: boolean,
  payload: unknown
): void {
  webview.postMessage(
    ok
      ? { command: 'rpcResponse', requestId, ok: true, data: payload }
      : { command: 'rpcResponse', requestId, ok: false, error: String(payload) }
  );
}

type RpcHandlerFn = (
  liveService: LiveConnectionService,
  message: Record<string, any>
) => Promise<unknown>;

function asOptionalString(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

const RPC_HANDLERS: Record<string, RpcHandlerFn> = {
  testLiveConnection: (svc, msg) => svc.testConnection(msg.config, asOptionalString(msg.password)),
  saveLiveConnection: (svc, msg) => svc.saveConnection(msg.config, asOptionalString(msg.password)),
  deleteLiveConnection: async (svc, msg) => {
    const connId = asOptionalString(msg.connectionId);
    if (connId) await svc.deleteConnection(connId);
    return { deleted: true };
  },
  executeLiveQuery: (svc, msg) =>
    svc.executeQuery(
      asOptionalString(msg.connectionId) ?? '',
      asOptionalString(msg.query) ?? '',
      msg.options && typeof msg.options === 'object' ? msg.options : undefined
    ),
  introspectLiveSchema: (svc, msg) =>
    svc.introspectSchema(asOptionalString(msg.connectionId) ?? ''),
  getLiveConnectionPassword: (svc, msg) =>
    svc.getPassword(asOptionalString(msg.connectionId) ?? ''),
};

export async function tryHandleLiveRpcMessage(
  liveService: LiveConnectionService | null,
  webview: vscode.Webview,
  message: Record<string, any>
): Promise<boolean> {
  const command = asOptionalString(message.command) ?? '';
  const requestId = asOptionalString(message.requestId) ?? '';
  const handler = RPC_HANDLERS[command];
  if (!requestId || !handler) return false;

  if (!liveService) {
    sendRpcResponse(webview, requestId, false, 'Live database service is not initialized.');
    return true;
  }

  try {
    const data = await handler(liveService, message);
    sendRpcResponse(webview, requestId, true, data);
  } catch (err) {
    sendRpcResponse(webview, requestId, false, sanitizeErrorMessage(err));
  }
  return true;
}
