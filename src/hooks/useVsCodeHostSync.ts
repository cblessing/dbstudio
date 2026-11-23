import React, { useEffect } from 'react';
import {
  DatabaseConnection,
  EditorTab,
  TableDefinition,
} from '../types/database';
import {
  INITIAL_CONNECTIONS,
  INITIAL_ECOMMERCE_TABLES,
} from '../engine/sqlEngineCore';
import { databaseManager } from '../engine/databaseManager';

export type VsCodeViewMode = 'standalone' | 'sidebar' | 'editor';

export interface VsCodeEditorConfig {
  editorType: 'query' | 'erd' | 'table';
  connectionId?: string;
  tableName?: string;
  title?: string;
  initialQuery?: string;
}

export function getInjectedGlobal<T>(key: string): T | undefined {
  return (globalThis as any)[key] as T | undefined;
}

function resolveEditorConfigTitle(config: VsCodeEditorConfig): string {
  if (config.title) return config.title;
  if (config.editorType === 'table') {
    const tbl = config.tableName ? config.tableName : 'table';
    return `${tbl}.table`;
  }
  return config.editorType === 'erd' ? 'schema.erd' : 'Script-1.sql';
}

export function createInitialTabs(
  viewMode: VsCodeViewMode,
  config: VsCodeEditorConfig | undefined
): EditorTab[] {
  if (viewMode === 'editor' && config) {
    const connId = config.connectionId ? config.connectionId : INITIAL_CONNECTIONS[0].id;
    return [
      {
        id: 'vscode_editor_tab',
        title: resolveEditorConfigTitle(config),
        type: config.editorType,
        connectionId: connId,
        tableName: config.tableName,
        queryContent: config.initialQuery ?? '',
      },
    ];
  }

  return [
    {
      id: 'tab_sql_1',
      title: 'Script-1.sql',
      type: 'query',
      connectionId: INITIAL_CONNECTIONS[0].id,
      queryContent: '',
    },
  ];
}

export function resolveCurrentTableDefinition(
  tabConnection: DatabaseConnection,
  tableName: string | undefined
): TableDefinition {
  const allTables = tabConnection.schemas.flatMap((s) => s.tables);
  const foundInConn = allTables.find((t) => t.name === tableName);
  if (foundInConn) return foundInConn;
  const foundInDefault = INITIAL_ECOMMERCE_TABLES.find((t) => t.name === tableName);
  if (foundInDefault) return foundInDefault;
  return allTables[0] ? allTables[0] : INITIAL_ECOMMERCE_TABLES[0];
}

export function getInitialConnections(): DatabaseConnection[] {
  const synced = getInjectedGlobal<DatabaseConnection[]>('__VSCODE_INITIAL_CONNECTIONS__');
  return synced ? synced : INITIAL_CONNECTIONS;
}

export function getInitialConnectionId(
  config: VsCodeEditorConfig | undefined,
  conns: DatabaseConnection[]
): string {
  return config?.connectionId ? config.connectionId : conns[0].id;
}

export function findConnectionOrFallback(
  connections: DatabaseConnection[],
  id: string,
  fallback: DatabaseConnection
): DatabaseConnection {
  const match = connections.find((c) => c.id === id);
  return match ? match : fallback;
}

function isTrustedMessageOrigin(origin: string): boolean {
  if (!origin) return false;
  return origin === window.location.origin || origin.startsWith('vscode-webview://');
}

export function useVsCodeHostSync(
  setConnections: React.Dispatch<React.SetStateAction<DatabaseConnection[]>>,
  setTabs: React.Dispatch<React.SetStateAction<EditorTab[]>>,
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  useEffect(() => {
    const initialHistory = getInjectedGlobal<string[]>('__VSCODE_DDL_HISTORY__');
    if (!Array.isArray(initialHistory)) return;
    (async () => {
      for (const sql of initialHistory) {
        if (typeof sql !== 'string') continue;
        try {
          await databaseManager.executeQuery(sql);
        } catch (err) {
          console.error('Failed to replay DDL statement', err);
        }
      }
    })();
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!isTrustedMessageOrigin(event.origin)) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.command === 'syncState') {
        if (Array.isArray(msg.connections)) setConnections(msg.connections);
        if (typeof msg.ddlQuery === 'string') await databaseManager.executeQuery(msg.ddlQuery);
      } else if (msg.command === 'updateEditorQuery') {
        const nextSql = typeof msg.initialQuery === 'string' ? msg.initialQuery : '';
        setTabs((prev) =>
          prev.map((t, idx) => (idx === 0 ? { ...t, queryContent: nextSql } : t))
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setConnections, setTabs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const isPaletteKey = e.key === 'p' || e.key === 'k';
      if (isModifier && isPaletteKey) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);
}

export function buildDestructiveConfirmConfig(
  title: string,
  description: string,
  sqlStatement: string,
  confirmButtonLabel: string,
  onConfirm: () => Promise<void>
) {
  return {
    isOpen: true,
    title,
    description,
    sqlStatement,
    confirmButtonLabel,
    isDestructive: true,
    onConfirm,
  };
}
