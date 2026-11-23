"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
            this.connections = connections;
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
async function handleSaveFileMessage(message) {
    const defaultFilename = message.filename ? message.filename : 'export.txt';
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
        const buffer = message.isBase64
            ? Buffer.from(message.content, 'base64')
            : Buffer.from(String(message.content ?? ''), 'utf8');
        fs.writeFileSync(saveUri.fsPath, buffer);
        vscode.window.showInformationMessage(`Saved export to ${saveUri.fsPath}`);
    }
    catch (err) {
        const errText = err ? String(err.message || err) : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to save file: ${errText}`);
    }
}
function registerWebviewMessageHandler(webview, extensionUri, disposables) {
    webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'alert':
                vscode.window.showInformationMessage(message.text);
                return;
            case 'error':
                vscode.window.showErrorMessage(message.text);
                return;
            case 'openFullView':
                vscode.commands.executeCommand('database-studio.open');
                return;
            case 'openEditor':
                openEditorTab(extensionUri, {
                    editorType: message.editorType ? message.editorType : 'query',
                    connectionId: message.connectionId,
                    tableName: message.tableName,
                    title: message.title,
                    initialQuery: message.initialQuery,
                });
                return;
            case 'stateUpdate':
                stateStore.broadcastState(webview, message.connections, message.ddlQuery);
                return;
            case 'saveFile':
                await handleSaveFileMessage(message);
                return;
        }
    }, null, disposables);
}
function buildBootstrapScriptContent(viewMode, editorConfig) {
    const lines = [
        `window.__VSCODE_VIEW_MODE__ = ${JSON.stringify(viewMode)};`,
    ];
    if (editorConfig) {
        lines.push(`window.__VSCODE_EDITOR_CONFIG__ = ${JSON.stringify(editorConfig)};`);
    }
    if (stateStore.connections) {
        lines.push(`window.__VSCODE_INITIAL_CONNECTIONS__ = ${JSON.stringify(stateStore.connections)};`);
    }
    if (stateStore.ddlHistory.length > 0) {
        lines.push(`window.__VSCODE_DDL_HISTORY__ = ${JSON.stringify(stateStore.ddlHistory)};`);
    }
    return lines.join('\n      ');
}
function getWebviewHtml(webview, extensionUri, viewMode = 'editor', editorConfig) {
    const distPath = path.join(extensionUri.fsPath, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        const distUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist'));
        html = html.replace(/(href|src)="(?!https?:\/\/|data:|vscode-|#)\/?(?:\.\/)?([^"]+)"/g, (_match, attr, relPath) => {
            const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', relPath));
            return `${attr}="${resourceUri}"`;
        });
        const bootstrapScripts = buildBootstrapScriptContent(viewMode, editorConfig);
        const headInjection = `<head>\n    <base href="${distUri}/" />\n    <script>\n      ${bootstrapScripts}\n    </script>`;
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