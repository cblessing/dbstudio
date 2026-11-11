import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  INITIAL_ECOMMERCE_TABLES,
  INITIAL_DEMO_DATA,
  ORACLE_HR_TABLES,
  SQLSERVER_DBO_TABLES,
  generateExecutionPlan,
} from './sqlEngineCore';
import { QueryResult, TableDefinition } from '../types/database';
import { preprocessDialectQuery } from './dialectPreprocessor';

export { preprocessDialectQuery };

class WasmDatabaseManager {
  private sqlJs: SqlJsStatic | null = null;
  private db: Database | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private customTables: TableDefinition[] = [
    ...INITIAL_ECOMMERCE_TABLES,
    ...ORACLE_HR_TABLES,
    ...SQLSERVER_DBO_TABLES,
  ];

  constructor() {
    // Start initialization lazily
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.sqlJs = await initSqlJs({
          locateFile: () => sqlWasmUrl,
        });
        this.db = new this.sqlJs.Database();
        this.bootstrapSchema();
        this.isInitialized = true;
      } catch (err) {
        console.warn('WASM sql.js binary load error, falling back to in-memory JS engine:', err);
        this.fallbackBootstrap();
        this.isInitialized = true;
      }
    })();

    return this.initPromise;
  }

  private bootstrapSchema(): void {
    if (!this.db) return;

    // Run DDLs for all tables, avoiding duplicates
    const allTables = [
      ...INITIAL_ECOMMERCE_TABLES,
      ...ORACLE_HR_TABLES,
      ...SQLSERVER_DBO_TABLES,
    ];
    const createdNames = new Set<string>();

    for (const table of allTables) {
      if (createdNames.has(table.name)) continue;
      createdNames.add(table.name);

      if (table.ddl) {
        try {
          this.db.run(table.ddl);
        } catch (e) {
          console.error(`Failed to create table ${table.name}`, e);
        }
      }
    }

    // Insert demo data
    for (const [tableName, rows] of Object.entries(INITIAL_DEMO_DATA)) {
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;

      try {
        for (const row of rows) {
          const values = columns.map((col) => row[col]);
          this.db.run(sql, values);
        }
      } catch (e) {
        console.error(`Failed to seed table ${tableName}`, e);
      }
    }
  }

  private fallbackData: Record<string, Record<string, any>[]> = {
    ...INITIAL_DEMO_DATA,
  };

  private fallbackBootstrap(): void {
    // Fallback in-memory storage clone
    this.fallbackData = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }

  public async executeQuery(sqlQuery: string): Promise<QueryResult> {
    await this.init();
    const { translatedQuery, syntheticResult } = preprocessDialectQuery(sqlQuery);
    if (syntheticResult) {
      return syntheticResult;
    }

    const trimmed = translatedQuery;
    const startTime = performance.now();

    // If real WASM DB is ready
    if (this.db) {
      try {
        const fetchStart = performance.now();
        const execResults = this.db.exec(trimmed);
        const execEnd = performance.now();

        if (execResults.length === 0) {
          // Non-SELECT query (INSERT, UPDATE, DELETE, CREATE, DROP, etc.)
          const rowsModified = this.db.getRowsModified();
          return {
            columns: ['status', 'message'],
            rows: [
              {
                status: 'SUCCESS',
                message: `Query executed successfully in WASM. Affected rows: ${rowsModified}`,
              },
            ],
            executionTimeMs: Math.max(0.1, +(execEnd - startTime).toFixed(2)),
            fetchTimeMs: Math.max(0.05, +(execEnd - fetchStart).toFixed(2)),
            rowCount: rowsModified,
            affectedRows: rowsModified,
            query: sqlQuery,
            explainPlan: generateExecutionPlan(trimmed),
          };
        }

        const firstResult = execResults[0];
        const columns = firstResult.columns;
        const rows: Record<string, any>[] = firstResult.values.map((valArr) => {
          const obj: Record<string, any> = {};
          columns.forEach((col, idx) => {
            obj[col] = valArr[idx];
          });
          return obj;
        });

        const fetchEnd = performance.now();

        return {
          columns,
          rows,
          executionTimeMs: Math.max(0.2, +(execEnd - startTime).toFixed(2)),
          fetchTimeMs: Math.max(0.1, +(fetchEnd - execEnd).toFixed(2)),
          rowCount: rows.length,
          query: sqlQuery,
          explainPlan: generateExecutionPlan(trimmed),
        };
      } catch (err: any) {
        return {
          columns: [],
          rows: [],
          executionTimeMs: +(performance.now() - startTime).toFixed(2),
          fetchTimeMs: 0,
          rowCount: 0,
          query: sqlQuery,
          error: err?.message || String(err),
        };
      }
    }

    // Fallback simulation engine
    return this.fallbackExecute(trimmed, startTime);
  }

  private fallbackExecute(sqlQuery: string, startTime: number): QueryResult {
    const upper = sqlQuery.toUpperCase();

    // Check simple SELECT * FROM <table>
    const matchFrom = upper.match(/FROM\s+([a-zA-Z0-9_]+)/);
    const tableName = matchFrom ? matchFrom[1].toLowerCase() : null;

    if (tableName && this.fallbackData[tableName]) {
      const allRows = this.fallbackData[tableName];
      const columns = allRows.length > 0 ? Object.keys(allRows[0]) : ['id'];
      const endTime = performance.now();

      return {
        columns,
        rows: allRows,
        executionTimeMs: +(endTime - startTime).toFixed(2),
        fetchTimeMs: 0.2,
        rowCount: allRows.length,
        query: sqlQuery,
        explainPlan: generateExecutionPlan(sqlQuery),
      };
    }

    return {
      columns: ['status', 'message'],
      rows: [{ status: 'OK', message: 'Executed in WASM emulation engine.' }],
      executionTimeMs: 1.2,
      fetchTimeMs: 0.1,
      rowCount: 1,
      query: sqlQuery,
      explainPlan: generateExecutionPlan(sqlQuery),
    };
  }

  public async getTableData(
    tableName: string,
    limit = 100,
    offset = 0
  ): Promise<QueryResult> {
    const query = `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset};`;
    return this.executeQuery(query);
  }

  public exportDatabaseBinary(): Uint8Array | null {
    if (this.db) {
      return this.db.export();
    }
    return null;
  }

  public async importDatabaseBinary(fileBuffer: Uint8Array): Promise<boolean> {
    await this.init();
    if (!this.sqlJs) return false;
    try {
      this.db = new this.sqlJs.Database(fileBuffer);
      return true;
    } catch (e) {
      console.error('Failed to import SQLite binary', e);
      return false;
    }
  }

  public isWasmReady(): boolean {
    return this.isInitialized && this.db !== null;
  }
}

export const wasmDatabaseManager = new WasmDatabaseManager();
