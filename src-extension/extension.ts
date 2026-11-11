import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  // Register Command: Database Studio: Open Database Studio
  const openDisposable = vscode.commands.registerCommand(
    'database-studio.open',
    () => {
      DatabaseStudioPanel.createOrShow(context.extensionUri);
    }
  );

  // Register Activity Bar Webview View Provider (if docked in sidebar)
  const sidebarProvider = new DatabaseStudioSidebarProvider(context.extensionUri);
  const viewDisposable = vscode.window.registerWebviewViewProvider(
    'database-studio.sidebarView',
    sidebarProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }
  );

  context.subscriptions.push(openDisposable, viewDisposable);
}

export function deactivate() {}

class DatabaseStudioPanel {
  public static currentPanel: DatabaseStudioPanel | undefined;
  public static readonly viewType = 'database-studio.panel';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists, reveal it
    if (DatabaseStudioPanel.currentPanel) {
      DatabaseStudioPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      DatabaseStudioPanel.viewType,
      'Database Studio (WebAssembly)',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'public'),
        ],
      }
    );

    DatabaseStudioPanel.currentPanel = new DatabaseStudioPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages sent from the Webview (React App)
    this._panel.webview.onDidReceiveMessage(
      (message: any) => {
        switch (message.command) {
          case 'alert':
            vscode.window.showInformationMessage(message.text);
            return;
          case 'error':
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    DatabaseStudioPanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.webview.html = getWebviewHtml(this._panel.webview, this._extensionUri);
  }
}

class DatabaseStudioSidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist'),
        vscode.Uri.joinPath(this._extensionUri, 'public'),
      ],
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri);
  }
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const distPath = path.join(extensionUri.fsPath, 'dist');
  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');

    // Replace relative paths with Webview URIs
    html = html.replace(/(href|src)="\/?([^"]+)"/g, (_match, attr, relPath) => {
      const resourceUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', relPath));
      return `${attr}="${resourceUri}"`;
    });

    return html;
  }

  // Fallback if not yet built
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
