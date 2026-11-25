import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const EXTENSION_FILTERS: Record<string, Record<string, string[]>> = {
  '.csv': { 'CSV Files': ['csv'] },
  '.json': { 'JSON Files': ['json'] },
  '.sql': { 'SQL Files': ['sql'] },
  '.md': { 'Markdown Files': ['md'] },
  '.sqlite': { 'SQLite Database': ['sqlite', 'db'] },
};

export function sanitizeFilename(rawName: unknown): string {
  const base = typeof rawName === 'string' ? path.basename(rawName.trim()) : '';
  if (!base || base === '.' || base === '..') return 'export.txt';
  return base;
}

export function resolveDefaultExportUri(defaultFilename: string): vscode.Uri {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (workspaceFolder) {
    return vscode.Uri.joinPath(workspaceFolder, defaultFilename);
  }
  return vscode.Uri.file(path.join(os.homedir(), defaultFilename));
}

function buildExportBuffer(message: Record<string, any>): Buffer {
  const encoding = message.isBase64 ? 'base64' : 'utf8';
  return Buffer.from(String(message.content ?? ''), encoding);
}

async function writeExportBytes(saveUri: vscode.Uri, buffer: Buffer): Promise<void> {
  if (vscode.workspace.fs && typeof vscode.workspace.fs.writeFile === 'function') {
    await vscode.workspace.fs.writeFile(saveUri, buffer);
    return;
  }
  await fs.promises.writeFile(saveUri.fsPath, buffer);
}

export async function handleSaveFileMessage(message: Record<string, any>): Promise<void> {
  try {
    const defaultFilename = sanitizeFilename(message.filename);
    const ext = path.extname(defaultFilename).toLowerCase();
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: resolveDefaultExportUri(defaultFilename),
      saveLabel: 'Export File',
      filters: EXTENSION_FILTERS[ext],
    });
    if (!saveUri) return;

    await writeExportBytes(saveUri, buildExportBuffer(message));
    vscode.window.showInformationMessage(`Saved export to ${saveUri.fsPath || saveUri.toString()}`);
  } catch (err: unknown) {
    const errText = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to save file: ${errText}`);
  }
}
