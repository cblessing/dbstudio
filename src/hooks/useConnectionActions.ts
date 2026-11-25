import React, { useState } from 'react';
import { DatabaseConnection } from '../types/database';
import { ConfirmModalConfig } from '../components/vscode/WorkspaceChrome';
import { downloadFile } from '../utils/exportData';
import { deleteLiveConnection, isNetworkDatabaseType } from '../utils/liveBridge';
import {
  exportConnectionProfiles,
  refreshLiveConnectionSchema,
  registerImportedLiveConnections,
} from '../utils/connectionProfiles';
import {
  generateDropObjectSql,
  removeObjectFromSchema,
} from '../utils/navigatorObjects';

export function useConnectionActions({
  connections,
  activeConnectionId,
  setConnections,
  setActiveConnectionId,
  broadcastConnectionsUpdate,
  setConfirmModal,
  onExecuteDdl,
}: {
  connections: DatabaseConnection[];
  activeConnectionId: string;
  setConnections: React.Dispatch<React.SetStateAction<DatabaseConnection[]>>;
  setActiveConnectionId: React.Dispatch<React.SetStateAction<string>>;
  broadcastConnectionsUpdate: (next: DatabaseConnection[], ddlQuery?: string) => void;
  setConfirmModal: React.Dispatch<React.SetStateAction<ConfirmModalConfig | null>>;
  onExecuteDdl?: (sql: string) => Promise<unknown>;
}) {
  const [isRefreshingConns, setIsRefreshingConns] = useState(false);

  const performDeleteConnection = (connId: string) => {
    const target = connections.find((c) => c.id === connId);
    if (target && isNetworkDatabaseType(target.type)) {
      void deleteLiveConnection(connId).catch(() => {});
    }
    const next = connections.filter((c) => c.id !== connId);
    setConnections(next);
    broadcastConnectionsUpdate(next);
    if (activeConnectionId === connId) setActiveConnectionId(next[0]?.id ?? '');
  };

  const handleDeleteConnection = (connId: string) => {
    const target = connections.find((c) => c.id === connId);
    if (!target) return;
    setConfirmModal({
      isOpen: true,
      title: `Remove Connection: ${target.name}`,
      description: `Are you sure you want to remove "${target.name}"? Any saved credentials for this connection will also be deleted.`,
      confirmButtonLabel: 'Remove Connection',
      isDestructive: true,
      onConfirm: async () => performDeleteConnection(connId),
    });
  };

  const handleRefreshConnection = async (connId: string) => {
    const conn = connections.find((c) => c.id === connId);
    const updated = conn ? await refreshLiveConnectionSchema(conn) : null;
    if (!updated) return;
    setConnections((prev) => {
      const next = prev.map((c) => (c.id === connId ? updated : c));
      broadcastConnectionsUpdate(next);
      return next;
    });
  };

  const handleRefreshAllConnections = async () => {
    setIsRefreshingConns(true);
    try {
      await Promise.all(connections.map((c) => handleRefreshConnection(c.id)));
    } finally {
      setIsRefreshingConns(false);
    }
  };

  const handleExportConnections = () =>
    downloadFile('database-studio-connections.json', exportConnectionProfiles(connections), 'application/json');

  const handleImportConnections = async (imported: DatabaseConnection[]) => {
    await registerImportedLiveConnections(imported);
    setConnections((prev) => {
      const next = [...imported, ...prev];
      broadcastConnectionsUpdate(next);
      return next;
    });
    if (!activeConnectionId && imported[0]) setActiveConnectionId(imported[0].id);
  };

  const handleDropObjectClick = (
    connId: string,
    kind: 'view' | 'procedure' | 'function' | 'package',
    objectName: string
  ) => {
    const conn = connections.find((c) => c.id === connId);
    const dialect = conn?.type ?? 'sqlite';
    const ddl = generateDropObjectSql(kind, objectName, dialect);
    const label = kind.charAt(0).toUpperCase() + kind.slice(1);
    setConfirmModal({
      isOpen: true,
      title: `Drop ${label}: ${objectName}`,
      description: `Are you sure you want to permanently drop ${kind} "${objectName}"?`,
      sqlStatement: ddl,
      confirmButtonLabel: `Drop ${label}`,
      isDestructive: true,
      onConfirm: async () => {
        if (onExecuteDdl) await onExecuteDdl(ddl);
        setConnections((prev) => {
          const next = prev.map((c) =>
            c.id !== connId
              ? c
              : { ...c, schemas: c.schemas.map((s) => removeObjectFromSchema(s, kind, objectName)) }
          );
          broadcastConnectionsUpdate(next, ddl);
          return next;
        });
      },
    });
  };

  return {
    isRefreshingConns,
    handleDeleteConnection,
    handleDropObjectClick,
    handleRefreshConnection,
    handleRefreshAllConnections,
    handleExportConnections,
    handleImportConnections,
  };
}
