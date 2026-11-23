"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryHandleLiveRpcMessage = tryHandleLiveRpcMessage;
const types_1 = require("./types");
function sendRpcResponse(webview, requestId, ok, payload) {
    webview.postMessage(ok
        ? { command: 'rpcResponse', requestId, ok: true, data: payload }
        : { command: 'rpcResponse', requestId, ok: false, error: String(payload) });
}
function asOptionalString(val) {
    return typeof val === 'string' ? val : undefined;
}
const RPC_HANDLERS = {
    testLiveConnection: (svc, msg) => svc.testConnection(msg.config, asOptionalString(msg.password)),
    saveLiveConnection: (svc, msg) => svc.saveConnection(msg.config, asOptionalString(msg.password)),
    deleteLiveConnection: async (svc, msg) => {
        const connId = asOptionalString(msg.connectionId);
        if (connId)
            await svc.deleteConnection(connId);
        return { deleted: true };
    },
    executeLiveQuery: (svc, msg) => svc.executeQuery(asOptionalString(msg.connectionId) ?? '', asOptionalString(msg.query) ?? '', msg.options && typeof msg.options === 'object' ? msg.options : undefined),
    introspectLiveSchema: (svc, msg) => svc.introspectSchema(asOptionalString(msg.connectionId) ?? ''),
};
async function tryHandleLiveRpcMessage(liveService, webview, message) {
    const command = asOptionalString(message.command) ?? '';
    const requestId = asOptionalString(message.requestId) ?? '';
    const handler = RPC_HANDLERS[command];
    if (!requestId || !handler)
        return false;
    if (!liveService) {
        sendRpcResponse(webview, requestId, false, 'Live database service is not initialized.');
        return true;
    }
    try {
        const data = await handler(liveService, message);
        sendRpcResponse(webview, requestId, true, data);
    }
    catch (err) {
        sendRpcResponse(webview, requestId, false, (0, types_1.sanitizeErrorMessage)(err));
    }
    return true;
}
//# sourceMappingURL=rpcHandler.js.map