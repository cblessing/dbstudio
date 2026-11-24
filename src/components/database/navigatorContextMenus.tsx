import React from 'react';
import {
  DatabaseConnection,
  DatabaseType,
  TableDefinition,
  ViewDefinition,
  ProcedureDefinition,
  ColumnDefinition,
} from '../../types/database';
import { ContextMenuItem } from '../dialogs/ContextMenu';
import {
  getConsoleActionLabel,
  supportsErDiagram,
} from '../../utils/connectionProfiles';
import { isNetworkDatabaseType } from '../../utils/liveBridge';
import {
  generateCreateViewTemplateSql,
  generateCreateProcedureTemplateSql,
} from '../../utils/tableManagement';
import {
  Table,
  Eye,
  EyeOff,
  Cpu,
  Plus,
  RefreshCw,
  Search,
  FileCode,
  LayoutGrid,
  Code2,
  Trash2,
  Copy,
  Settings,
  Download,
} from 'lucide-react';

export interface NavigatorMenuCallbacks {
  onOpenTable: (connectionId: string, tableName: string) => void;
  onOpenSqlEditor: (connectionId: string, initialQuery?: string) => void;
  onOpenERDiagram: (connectionId: string) => void;
  onEditColumns: (connectionId: string, table: TableDefinition) => void;
  onCreateTableClick: (connectionId: string) => void;
  onDropTableClick: (connectionId: string, tableName: string) => void;
  onTruncateTableClick: (connectionId: string, tableName: string) => void;
  onDropColumnClick: (connectionId: string, tableName: string, colName: string) => void;
}

export function buildTableContextMenuItems(
  connId: string,
  tbl: TableDefinition,
  cb: NavigatorMenuCallbacks
): ContextMenuItem[] {
  const ddlScript = tbl.ddl ? tbl.ddl : `-- DDL for ${tbl.name}`;
  return [
    {
      id: 'open_data',
      label: `View Data (${tbl.name})`,
      icon: <Table className="w-3.5 h-3.5 text-blue-400" />,
      action: () => cb.onOpenTable(connId, tbl.name),
    },
    {
      id: 'edit_columns',
      label: 'Edit Columns / Structure...',
      icon: <Code2 className="w-3.5 h-3.5 text-sky-400" />,
      action: () => cb.onEditColumns(connId, tbl),
    },
    {
      id: 'view_erd',
      label: 'View ER Diagram',
      icon: <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => cb.onOpenERDiagram(connId),
    },
    { id: 'div_1', isDivider: true, label: '' },
    {
      id: 'gen_select',
      label: 'Generate SQL: SELECT *',
      icon: <FileCode className="w-3.5 h-3.5 text-amber-400" />,
      action: () => cb.onOpenSqlEditor(connId, `SELECT * FROM ${tbl.name} LIMIT 100;`),
    },
    {
      id: 'gen_insert',
      label: 'Generate SQL: INSERT Template',
      icon: <Plus className="w-3.5 h-3.5 text-amber-400" />,
      action: () => {
        const nonPkCols = tbl.columns.filter((c) => !c.primaryKey).map((c) => c.name);
        cb.onOpenSqlEditor(
          connId,
          `INSERT INTO ${tbl.name} (${nonPkCols.join(', ')})\nVALUES (${nonPkCols.map(() => '?').join(', ')});`
        );
      },
    },
    {
      id: 'show_ddl',
      label: 'Show DDL Script',
      icon: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
      action: () => cb.onOpenSqlEditor(connId, ddlScript),
    },
    { id: 'div_2', isDivider: true, label: '' },
    {
      id: 'truncate_table',
      label: 'Truncate Table (Clear Rows)',
      icon: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
      action: () => cb.onTruncateTableClick(connId, tbl.name),
    },
    {
      id: 'drop_table',
      label: 'Drop Table (DROP TABLE)',
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
      isDestructive: true,
      action: () => cb.onDropTableClick(connId, tbl.name),
    },
  ];
}

export function buildViewContextMenuItems(
  connId: string,
  vw: ViewDefinition,
  cb: NavigatorMenuCallbacks,
  dialect: DatabaseType = 'sqlite'
): ContextMenuItem[] {
  return [
    {
      id: 'query_view',
      label: `SELECT * FROM ${vw.name}`,
      icon: <Eye className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => cb.onOpenSqlEditor(connId, `SELECT * FROM ${vw.name} LIMIT 100;`),
    },
    {
      id: 'view_ddl',
      label: 'Show View Definition (DDL)',
      icon: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
      action: () => cb.onOpenSqlEditor(connId, vw.definition),
    },
    {
      id: 'copy_view_name',
      label: `Copy View Name ("${vw.name}")`,
      icon: <Copy className="w-3.5 h-3.5 text-zinc-400" />,
      action: () => navigator.clipboard.writeText(vw.name),
    },
    { id: 'div_new_view', isDivider: true, label: '' },
    {
      id: 'create_new_view',
      label: 'Create New View',
      icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => cb.onOpenSqlEditor(connId, generateCreateViewTemplateSql(vw.schema ?? 'public', dialect)),
    },
  ];
}

export function buildProcedureContextMenuItems(
  connId: string,
  proc: ProcedureDefinition,
  cb: NavigatorMenuCallbacks,
  dialect: DatabaseType = 'sqlite'
): ContextMenuItem[] {
  return [
    {
      id: 'exec_proc',
      label: `Execute Procedure (EXEC ${proc.name})`,
      icon: <Cpu className="w-3.5 h-3.5 text-amber-400" />,
      action: () => cb.onOpenSqlEditor(connId, `EXEC ${proc.name};`),
    },
    {
      id: 'proc_ddl',
      label: 'Show Procedure Definition (DDL)',
      icon: <Code2 className="w-3.5 h-3.5 text-purple-400" />,
      action: () => cb.onOpenSqlEditor(connId, proc.definition),
    },
    {
      id: 'copy_proc_name',
      label: `Copy Procedure Name ("${proc.name}")`,
      icon: <Copy className="w-3.5 h-3.5 text-zinc-400" />,
      action: () => navigator.clipboard.writeText(proc.name),
    },
    { id: 'div_new_proc', isDivider: true, label: '' },
    {
      id: 'create_new_procedure',
      label: 'Create New Procedure',
      icon: <Plus className="w-3.5 h-3.5 text-amber-400" />,
      action: () => cb.onOpenSqlEditor(connId, generateCreateProcedureTemplateSql(proc.schema ?? 'public', dialect)),
    },
  ];
}

export function buildViewsGroupContextMenuItems(
  connId: string,
  schemaName: string,
  dialect: DatabaseType,
  cb: NavigatorMenuCallbacks
): ContextMenuItem[] {
  return [
    {
      id: 'create_new_view',
      label: 'Create New View',
      icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => cb.onOpenSqlEditor(connId, generateCreateViewTemplateSql(schemaName, dialect)),
    },
  ];
}

export function buildProceduresGroupContextMenuItems(
  connId: string,
  schemaName: string,
  dialect: DatabaseType,
  cb: NavigatorMenuCallbacks
): ContextMenuItem[] {
  return [
    {
      id: 'create_new_procedure',
      label: 'Create New Procedure',
      icon: <Plus className="w-3.5 h-3.5 text-amber-400" />,
      action: () => cb.onOpenSqlEditor(connId, generateCreateProcedureTemplateSql(schemaName, dialect)),
    },
  ];
}

export function buildColumnContextMenuItems(
  connId: string,
  tbl: TableDefinition,
  col: ColumnDefinition,
  cb: NavigatorMenuCallbacks
): ContextMenuItem[] {
  const dropColItems: ContextMenuItem[] = col.primaryKey
    ? []
    : [
        { id: 'div_col', isDivider: true, label: '' },
        {
          id: 'drop_col',
          label: `Drop Column "${col.name}"`,
          icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
          isDestructive: true,
          action: () => cb.onDropColumnClick(connId, tbl.name, col.name),
        },
      ];

  return [
    {
      id: 'edit_col_struct',
      label: `Edit Columns of ${tbl.name}...`,
      icon: <Code2 className="w-3.5 h-3.5 text-sky-400" />,
      action: () => cb.onEditColumns(connId, tbl),
    },
    {
      id: 'copy_col_name',
      label: `Copy Column Name ("${col.name}")`,
      icon: <Copy className="w-3.5 h-3.5 text-zinc-400" />,
      action: () => navigator.clipboard.writeText(col.name),
    },
    {
      id: 'filter_col',
      label: `Group by ${col.name}`,
      icon: <Search className="w-3.5 h-3.5 text-amber-400" />,
      action: () =>
        cb.onOpenSqlEditor(
          connId,
          `SELECT ${col.name}, COUNT(*) AS count\nFROM ${tbl.name}\nGROUP BY ${col.name}\nORDER BY count DESC;`
        ),
    },
    ...dropColItems,
  ];
}

export function buildSchemaContextMenuItems(
  connId: string,
  schemaName: string,
  cb: NavigatorMenuCallbacks,
  dbType: DatabaseType = 'sqlite'
): ContextMenuItem[] {
  const consoleLabel = getConsoleActionLabel(dbType);
  if (!supportsErDiagram(dbType)) {
    return [
      {
        id: 'open_sql',
        label: `Open ${consoleLabel}`,
        icon: <FileCode className="w-3.5 h-3.5 text-amber-400" />,
        action: () => cb.onOpenSqlEditor(connId),
      },
    ];
  }

  return [
    {
      id: 'create_table',
      label: `Create New Table in ${schemaName}...`,
      icon: <Plus className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => cb.onCreateTableClick(connId),
    },
    {
      id: 'open_sql',
      label: `Open ${consoleLabel}`,
      icon: <FileCode className="w-3.5 h-3.5 text-amber-400" />,
      action: () => cb.onOpenSqlEditor(connId),
    },
    {
      id: 'view_erd',
      label: 'View Schema ER Diagram',
      icon: <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />,
      action: () => cb.onOpenERDiagram(connId),
    },
  ];
}

export function buildTablesGroupContextMenuItems(
  connId: string,
  schemaName: string,
  cb: NavigatorMenuCallbacks,
  dbType: DatabaseType = 'sqlite',
  oracleOptions?: {
    showOracleMaintained: boolean;
    onToggleOracleMaintained: () => void;
  }
): ContextMenuItem[] {
  const items = buildSchemaContextMenuItems(connId, schemaName, cb, dbType);
  if (dbType !== 'oracle' || !oracleOptions) {
    return items;
  }

  return [
    ...items,
    { id: 'div_oracle_sys', isDivider: true, label: '' },
    {
      id: 'toggle_oracle_maintained',
      label: oracleOptions.showOracleMaintained
        ? 'Hide Oracle-Maintained Tables'
        : 'Show Oracle-Maintained Tables',
      icon: oracleOptions.showOracleMaintained ? (
        <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
      ) : (
        <Eye className="w-3.5 h-3.5 text-sky-400" />
      ),
      action: oracleOptions.onToggleOracleMaintained,
    },
  ];
}

export function buildConnectionContextMenuItems(
  conn: DatabaseConnection,
  canDelete: boolean,
  callbacks: {
    onEditConnection: (conn: DatabaseConnection) => void;
    onRefreshConnection?: (connectionId: string) => void;
    onOpenSqlEditor: (connectionId: string) => void;
    onExportSqlite?: () => void;
    onDeleteConnection: (connectionId: string) => void;
  }
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'edit_connection',
      label: 'Edit Connection Settings...',
      icon: <Settings className="w-3.5 h-3.5 text-sky-400" />,
      action: () => callbacks.onEditConnection(conn),
    },
    {
      id: 'conn_console',
      label: `Open ${getConsoleActionLabel(conn.type)}`,
      icon: <Code2 className="w-3.5 h-3.5 text-amber-400" />,
      action: () => callbacks.onOpenSqlEditor(conn.id),
    },
  ];

  if (isNetworkDatabaseType(conn.type) && callbacks.onRefreshConnection) {
    items.push({
      id: 'refresh_connection',
      label: 'Refresh Schema',
      icon: <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />,
      action: () => callbacks.onRefreshConnection?.(conn.id),
    });
  }

  if (conn.type === 'sqlite' && callbacks.onExportSqlite) {
    items.push({
      id: 'export_sqlite',
      label: 'Export SQLite Database (.sqlite)',
      icon: <Download className="w-3.5 h-3.5 text-purple-400" />,
      action: () => callbacks.onExportSqlite?.(),
    });
  }

  if (canDelete) {
    items.push(
      { id: 'div_conn_del', isDivider: true, label: '' },
      {
        id: 'delete_connection',
        label: 'Remove Connection',
        icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
        isDestructive: true,
        action: () => callbacks.onDeleteConnection(conn.id),
      }
    );
  }

  return items;
}
