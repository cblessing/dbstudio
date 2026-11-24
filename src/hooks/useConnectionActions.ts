import React, { useState } from 'react';
import { DatabaseConnection } from '../types/database';
import { downloadFile } from '../utils/exportData';
import { deleteLiveConnection, isNetworkDatabaseType } from '../utils/liveBridge';
import {
  exportConnectionProfiles,
  refreshLiveConnectionSchema,
  registerImportedLiveConnections,
} from '../utils/connectionProfiles';

export function useConnectionActions({
  connections,
  activeConnectionId,
  setConnections,
  setActiveConnectionId,
  broadcastConnectionsUpdate,
}: {
  connections: DatabaseConnection[];
  activeConnectionId: string;
  setConnections: React.Dispatch<React.SetStateAction<DatabaseConnection[]>>;
  setActiveConnectionId: React.Dispatch<React.SetStateAction<string>>;
  broadcastConnectionsUpdate: (next: DatabaseConnection[], ddlQuery?: string) => void;
}) {
  const [isRefreshingConns, setIsRefreshingConns] = useState(false);

  const handleDeleteConnection = (connId: string) => {
    const target = connections.find((c) => c.id === connId);
    if (target && isNetworkDatabaseType(target.type)) {
      void deleteLiveConnection(connId).catch(() => {});
    }
    const next = connections.filter((c) => c.id !== connId);
    setConnections(next);
    broadcastConnectionsUpdate(next);
    if (activeConnectionId === connId) setActiveConnectionId(next[0]?.id ?? '');
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

  return {
    isRefreshingConns,
    handleDeleteConnection,
    handleRefreshConnection,
    handleRefreshAllConnections,
    handleExportConnections,
    handleImportConnections,
  };
}
