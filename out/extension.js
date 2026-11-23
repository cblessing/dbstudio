"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
class ExtensionStateStore {
    connections = undefined;
    ddlHistory = [];
    queryCounter = 0;
    webviews = new Set();
    reusablePanels = new Map();
    registerWebview(webview, disposables) {
        this.webviews.add(webview);
        if (disposables) {
            disposables.push({
                dispose: () => {
                    this.webviews.delete(webview);
                },
            });
        }
    }
    unregisterWebview(webview) {
        this.webviews.delete(webview);
    }
    broadcastState(sender, connections, ddlQuery) {
        if (connections) {
            this.connections = stripConnectionSecrets(connections);
        }
        if (ddlQuery) {
            this.ddlHistory.push(ddlQuery);
        }
        for (const wv of this.webviews) {
            if (wv !== sender) {
                wv.postMessage({
                    command: 'syncState',
                    connections: this.connections,
                    ddlQuery,
                });
            }
        }
    }
    getReusablePanel(key) {
        return this.reusablePanels.get(key);
    }
    setReusablePanel(key, panel) {
        this.reusablePanels.set(key, panel);
    }
    deleteReusablePanel(key) {
        this.reusablePanels.delete(key);
    }
}
const stateStore = new ExtensionStateStore();
function activate(context) {
    const openDisposable = vscode.commands.registerCommand('database-studio.open', () => {
        openEditorTab(context.extensionUri, { editorType: 'query' });
    });
    const newQueryDisposable = vscode.commands.registerCommand('database-studio.newQuery', () => {
        openEditorTab(context.extensionUri, { editorType: 'query' });
    });
    const openErdDisposable = vscode.commands.registerCommand('database-studio.openErd', () => {
        openEditorTab(context.extensionUri, {
            editorType: 'erd',
            title: 'schema.erd',
        });
    });
    const sidebarProvider = new DatabaseStudioSidebarProvider(context.extensionUri);
    const viewDisposable = vscode.window.registerWebviewViewProvider('database-studio.sidebarView', sidebarProvider, {
        webviewOptions: { retainContextWhenHidden: true },
    });
    context.subscriptions.push(openDisposable, newQueryDisposable, openErdDisposable, viewDisposable);
}
function deactivate() { }
function resolveReuseKey(config, connId) {
    if (config.editorType === 'table') {
        const tableName = config.tableName ? config.tableName : 'customers';
        return `table:${connId}:${tableName}`;
    }
    if (config.editorType === 'erd') {
        return `erd:${connId}`;
    }
    return undefined;
}
function resolveTabTitle(config) {
    if (config.title)
        return config.title;
    if (config.editorType === 'table') {
        const tableName = config.tableName ? config.tableName : 'table';
        return `${tableName}.table`;
    }
    if (config.editorType === 'erd') {
        return 'schema.erd';
    }
    stateStore.queryCounter += 1;
    return `Script-${stateStore.queryCounter}.sql`;
}
function attachPanelDisposeListener(panel, reuseKey, disposables) {
    panel.onDidDispose(() => {
        if (reuseKey) {
            stateStore.deleteReusablePanel(reuseKey);
        }
        stateStore.unregisterWebview(panel.webview);
        while (disposables.length) {
            const d = disposables.pop();
            if (d)
                d.dispose();
        }
    }, null, disposables);
}
function openEditorTab(extensionUri, config) {
    const activeEditor = vscode.window.activeTextEditor;
    const column = activeEditor ? activeEditor.viewColumn : vscode.ViewColumn.One;
    const connId = config.connectionId ? config.connectionId : 'conn_sqlite_local';
    const reuseKey = resolveReuseKey(config, connId);
    if (reuseKey) {
        const existingPanel = stateStore.getReusablePanel(reuseKey);
        if (existingPanel) {
            existingPanel.reveal(column);
            return;
        }
    }
    const tabTitle = resolveTabTitle(config);
    const panel = vscode.window.createWebviewPanel(`database-studio.${config.editorType}`, tabTitle, column ? column : vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
            vscode.Uri.joinPath(extensionUri, 'dist'),
            vscode.Uri.joinPath(extensionUri, 'public'),
        ],
    });
    const disposables = [];
    stateStore.registerWebview(panel.webview, disposables);
    if (reuseKey) {
        stateStore.setReusablePanel(reuseKey, panel);
    }
    registerWebviewMessageHandler(panel.webview, extensionUri, disposables);
    panel.webview.html = getWebviewHtml(panel.webview, extensionUri, 'editor', {
        ...config,
        connectionId: connId,
        title: tabTitle,
    });
    attachPanelDisposeListener(panel, reuseKey, disposables);
}
class DatabaseStudioSidebarProvider {
    _extensionUri;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, _context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'dist'),
                vscode.Uri.joinPath(this._extensionUri, 'public'),
            ],
        };
        stateStore.registerWebview(webviewView.webview);
        registerWebviewMessageHandler(webviewView.webview, this._extensionUri);
        webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri, 'sidebar');
        webviewView.onDidDispose(() => {
            stateStore.unregisterWebview(webviewView.webview);
        });
    }
}
function stripConnectionSecrets(connections) {
    return connections.map((conn) => {
        if (!conn || typeof conn !== 'object')
            return conn;
        const { password: _omitted, ...safeConn } = conn;
        void _omitted;
        return safeConn;
    });
}
function sanitizeFilename(rawName) {
    const base = typeof rawName === 'string' ? path.basename(rawName.trim()) : '';
    if (!base || base === '.' || base === '..')
        return 'export.txt';
    return base;
}
function parseEditorConfig(message) {
    const allowedTypes = ['query', 'erd', 'table'];
    const editorType = allowedTypes.includes(message.editorType) ? message.editorType : 'query';
    return {
        editorType,
        connectionId: typeof message.connectionId === 'string' ? message.connectionId : undefined,
        tableName: typeof message.tableName === 'string' ? message.tableName : undefined,
        title: typeof message.title === 'string' ? message.title : undefined,
        initialQuery: typeof message.initialQuery === 'string' ? message.initialQuery : undefined,
    };
}
function writeExportPayload(savePath, message) {
    const buffer = message.isBase64
        ? Buffer.from(String(message.content ?? ''), 'base64')
        : Buffer.from(String(message.content ?? ''), 'utf8');
    fs.writeFileSync(savePath, buffer);
}
async function handleSaveFileMessage(message) {
    const defaultFilename = sanitizeFilename(message.filename);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
    const defaultUri = workspaceFolder
        ? vscode.Uri.joinPath(workspaceFolder, defaultFilename)
        : vscode.Uri.file(defaultFilename);
    const saveUri = await vscode.window.showSaveDialog({
        defaultUri,
        saveLabel: 'Export File',
    });
    if (!saveUri)
        return;
    try {
        writeExportPayload(saveUri.fsPath, message);
        vscode.window.showInformationMessage(`Saved export to ${saveUri.fsPath}`);
    }
    catch (err) {
        const errText = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to save file: ${errText}`);
    }
}
function handleStateUpdateMessage(webview, message) {
    const conns = Array.isArray(message.connections) ? message.connections : undefined;
    const ddl = typeof message.ddlQuery === 'string' ? message.ddlQuery : undefined;
    stateStore.broadcastState(webview, conns, ddl);
}
async function dispatchWebviewMessage(message, webview, extensionUri) {
    switch (message.command) {
        case 'alert':
            if (typeof message.text === 'string')
                vscode.window.showInformationMessage(message.text);
            return;
        case 'error':
            if (typeof message.text === 'string')
                vscode.window.showErrorMessage(message.text);
            return;
        case 'openFullView':
            vscode.commands.executeCommand('database-studio.open');
            return;
        case 'openEditor':
            openEditorTab(extensionUri, parseEditorConfig(message));
            return;
        case 'stateUpdate':
            handleStateUpdateMessage(webview, message);
            return;
        case 'saveFile':
            await handleSaveFileMessage(message);
            return;
    }
}
function registerWebviewMessageHandler(webview, extensionUri, disposables) {
    webview.onDidReceiveMessage(async (message) => {
        if (!message || typeof message !== 'object')
            return;
        await dispatchWebviewMessage(message, webview, extensionUri);
    }, null, disposables);
}
function serializeForInlineScript(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
function buildWebviewCsp(webview, nonce) {
    const cspSource = webview.cspSource || '';
    return [
        "default-src 'none'",
        `img-src ${cspSource} data: blob:`,
        `style-src ${cspSource} 'unsafe-inline'`,
        `font-src ${cspSource} data:`,
        `script-src 'nonce-${nonce}' 'wasm-unsafe-eval'`,
        `connect-src ${cspSource} data: blob:`,
    ].join('; ');
}
function buildBootstrapScriptContent(viewMode, editorConfig) {
    const lines = [
        `window.__VSCODE_VIEW_MODE__ = ${serializeForInlineScript(viewMode)};`,
    ];
    if (editorConfig) {
        lines.push(`window.__VSCODE_EDITOR_CONFIG__ = ${serializeForInlineScript(editorConfig)};`);
    }
    if (stateStore.connections) {
        lines.push(`window.__VSCODE_INITIAL_CONNECTIONS__ = ${serializeForInlineScript(stateStore.connections)};`);
    }
    if (stateStore.ddlHistory.length > 0) {
        lines.push(`window.__VSCODE_DDL_HISTORY__ = ${serializeForInlineScript(stateStore.ddlHistory)};`);
    }
    return lines.join('\n      ');
}
function getWebviewHtml(webview, extensionUri, viewMode = 'editor', editorConfig) {
    const distPath = path.join(extensionUri.fsPath, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        const distUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist'));
        const nonce = crypto.randomBytes(16).toString('base64');
        const csp = buildWebviewCsp(webview, nonce);
        html = html.replace(/(href|src)="(?!https?:\/\/|data:|vscode-|#)\/?(?:\.\/)?([^"]+)"/g, (_match, attr, relPath) => {
            const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', relPath));
            return `${attr}="${resourceUri}"`;
        });
        html = html.replace(/<script\b/g, `<script nonce="${nonce}"`);
        const bootstrapScripts = buildBootstrapScriptContent(viewMode, editorConfig);
        const headInjection = `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <base href="${distUri}/" />\n    <script nonce="${nonce}">\n      ${bootstrapScripts}\n    </script>`;
        return html.replace('<head>', headInjection);
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; padding: 24px; color: #ccc; background: #1e1e1e; }
    h2 { color: #fff; }
    code { background: #252526; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h2>Database Studio Extension</h2>
  <p>Please compile the frontend build before launching:</p>
  <p><code>npm run build</code></p>
</body>
</html>`;
}
//# sourceMappingURL=extension.js.map