import type { Database, SqlJsStatic } from 'sql.js';
import initSqlJs from 'sql.js';
import {
  INITIAL_ECOMMERCE_TABLES,
  INITIAL_ECOMMERCE_VIEWS,
  INITIAL_DEMO_DATA,
  ORACLE_HR_TABLES,
  ORACLE_HR_VIEWS,
  SQLSERVER_DBO_TABLES,
  SQLSERVER_DBO_VIEWS,
  generateExecutionPlan,
} from './sqlEngineCore';
import { QueryResult, TableDefinition, ViewDefinition } from '../types/database';
import { preprocessDialectQuery } from './dialectPreprocessor';

export { preprocessDialectQuery };

export const DEFAULT_QUERY_BATCH_SIZE = 1000;

export function isUnboundedSelectQuery(sql: string): boolean {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .replace(/;$/, '')
    .trim();

  if (!/^(?:SELECT|WITH)\b/i.test(cleaned)) {
    return false;
  }

  const hasExplicitLimit =
    /\bLIMIT\s+\d+(?:\s*,\s*\d+|\s+OFFSET\s+\d+)?\s*$/i.test(cleaned) ||
    /\bFETCH\s+(?:FIRST|NEXT)\s+\d+\s+ROWS?\s+ONLY\s*$/i.test(cleaned);

  return !hasExplicitLimit;
}

function runDdlStatement(db: Database, sql: string | undefined, label: string): void {
  if (!sql) return;
  try {
    db.run(sql);
  } catch (e) {
    console.error(`Failed to initialize ${label}`, e);
  }
}

function seedTableRows(db: Database, tableName: string, rows: Record<string, any>[]): void {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;

  try {
    for (const row of rows) {
      db.run(sql, columns.map((col) => row[col]));
    }
  } catch (e) {
    console.error(`Failed to seed table ${tableName}`, e);
  }
}

function mapResultValuesToRows(
  columns: string[],
  rawValues: any[][],
  batchSize: number,
  isUnbounded: boolean
): { rows: Record<string, any>[]; hasMore: boolean } {
  const hasMore = isUnbounded && rawValues.length > batchSize;
  const slicedValues = hasMore ? rawValues.slice(0, batchSize) : rawValues;
  const rows = slicedValues.map((valArr) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      obj[col] = valArr[idx];
    });
    return obj;
  });
  return { rows, hasMore };
}

function buildEmptyExecResult(
  db: Database,
  sqlQuery: string,
  trimmed: string,
  isUnbounded: boolean,
  startTime: number,
  fetchStart: number,
  execEnd: number
): QueryResult {
  const executionTimeMs = Math.max(0.1, +(execEnd - startTime).toFixed(2));
  const fetchTimeMs = Math.max(0.05, +(execEnd - fetchStart).toFixed(2));
  const explainPlan = generateExecutionPlan(trimmed);

  if (isUnbounded) {
    return {
      columns: [],
      rows: [],
      executionTimeMs,
      fetchTimeMs,
      rowCount: 0,
      query: sqlQuery,
      explainPlan,
      hasMore: false,
    };
  }

  const rowsModified = db.getRowsModified();
  return {
    columns: ['status', 'message'],
    rows: [
      {
        status: 'SUCCESS',
        message: `Query executed successfully. Affected rows: ${rowsModified}`,
      },
    ],
    executionTimeMs,
    fetchTimeMs,
    rowCount: rowsModified,
    affectedRows: rowsModified,
    query: sqlQuery,
    explainPlan,
  };
}

class DatabaseManager {
  private sqlJs: SqlJsStatic | null = null;
  private db: Database | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private fallbackData: Record<string, Record<string, any>[]> = {
    ...INITIAL_DEMO_DATA,
  };

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Database engine init timed out')), 3000)
        );
        this.sqlJs = (await Promise.race([initSqlJs(), timeoutPromise])) as SqlJsStatic;
        this.db = new this.sqlJs.Database();
        this.bootstrapSchema();
        this.isInitialized = true;
      } catch (err) {
        console.warn('SQLite engine load error, falling back to in-memory engine:', err);
        this.fallbackBootstrap();
        this.isInitialized = true;
      }
    })();

    return this.initPromise;
  }

  private createUniqueTables(tables: TableDefinition[]): void {
    if (!this.db) return;
    const created = new Set<string>();
    for (const table of tables) {
      if (created.has(table.name)) continue;
      created.add(table.name);
      runDdlStatement(this.db, table.ddl, `table ${table.name}`);
    }
  }

  private createUniqueViews(views: ViewDefinition[]): void {
    if (!this.db) return;
    const created = new Set<string>();
    for (const view of views) {
      if (created.has(view.name)) continue;
      created.add(view.name);
      runDdlStatement(this.db, view.definition, `view ${view.name}`);
    }
  }

  private bootstrapSchema(): void {
    if (!this.db) return;

    this.createUniqueTables([
      ...INITIAL_ECOMMERCE_TABLES,
      ...ORACLE_HR_TABLES,
      ...SQLSERVER_DBO_TABLES,
    ]);

    for (const [tableName, rows] of Object.entries(INITIAL_DEMO_DATA)) {
      seedTableRows(this.db, tableName, rows);
    }

    this.createUniqueViews([
      ...INITIAL_ECOMMERCE_VIEWS,
      ...ORACLE_HR_VIEWS,
      ...SQLSERVER_DBO_VIEWS,
    ]);
  }

  private fallbackBootstrap(): void {
    this.fallbackData = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }

  private executeOnEngine(
    db: Database,
    sqlQuery: string,
    trimmed: string,
    effectiveQuery: string,
    isUnbounded: boolean,
    batchSize: number,
    offset: number,
    startTime: number
  ): QueryResult {
    try {
      const fetchStart = performance.now();
      const execResults = db.exec(effectiveQuery);
      const execEnd = performance.now();

      if (execResults.length === 0) {
        return buildEmptyExecResult(
          db,
          sqlQuery,
          trimmed,
          isUnbounded,
          startTime,
          fetchStart,
          execEnd
        );
      }

      const firstResult = execResults[0];
      const { rows, hasMore } = mapResultValuesToRows(
        firstResult.columns,
        firstResult.values,
        batchSize,
        isUnbounded
      );
      const fetchEnd = performance.now();

      return {
        columns: firstResult.columns,
        rows,
        executionTimeMs: Math.max(0.2, +(execEnd - startTime).toFixed(2)),
        fetchTimeMs: Math.max(0.1, +(fetchEnd - execEnd).toFixed(2)),
        rowCount: rows.length,
        query: sqlQuery,
        explainPlan: generateExecutionPlan(trimmed),
        hasMore,
        nextOffset: hasMore ? offset + batchSize : undefined,
      };
    } catch (err: any) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: +(performance.now() - startTime).toFixed(2),
        fetchTimeMs: 0,
        rowCount: 0,
        query: sqlQuery,
        error: err ? String(err.message || err) : 'Execution error',
      };
    }
  }

  public async executeQuery(
    sqlQuery: string,
    options?: { offset?: number; batchSize?: number }
  ): Promise<QueryResult> {
    await this.init();
    const { translatedQuery, syntheticResult } = preprocessDialectQuery(sqlQuery);
    if (syntheticResult) {
      return syntheticResult;
    }

    const trimmed = translatedQuery.trim().replace(/;$/, '');
    const batchSize = options?.batchSize ?? DEFAULT_QUERY_BATCH_SIZE;
    const offset = options?.offset ?? 0;
    const isUnbounded = isUnboundedSelectQuery(trimmed);
    const effectiveQuery = isUnbounded
      ? `${trimmed} LIMIT ${batchSize + 1} OFFSET ${offset}`
      : trimmed;

    const startTime = performance.now();
    if (this.db) {
      return this.executeOnEngine(
        this.db,
        sqlQuery,
        trimmed,
        effectiveQuery,
        isUnbounded,
        batchSize,
        offset,
        startTime
      );
    }

    return this.fallbackExecute(trimmed, startTime);
  }

  private fallbackExecute(sqlQuery: string, startTime: number): QueryResult {
    const matchFrom = sqlQuery.toUpperCase().match(/FROM\s+([a-zA-Z0-9_]+)/);
    const tableName = matchFrom ? matchFrom[1].toLowerCase() : '';
    const allRows = tableName ? this.fallbackData[tableName] : undefined;

    if (allRows) {
      const columns = allRows.length > 0 ? Object.keys(allRows[0]) : ['id'];
      return {
        columns,
        rows: allRows,
        executionTimeMs: +(performance.now() - startTime).toFixed(2),
        fetchTimeMs: 0.2,
        rowCount: allRows.length,
        query: sqlQuery,
        explainPlan: generateExecutionPlan(sqlQuery),
      };
    }

    return {
      columns: ['status', 'message'],
      rows: [{ status: 'OK', message: 'Query executed successfully.' }],
      executionTimeMs: 1.2,
      fetchTimeMs: 0.1,
      rowCount: 1,
      query: sqlQuery,
      explainPlan: generateExecutionPlan(sqlQuery),
    };
  }

  public async getTableData(
    tableName: string,
    limit = DEFAULT_QUERY_BATCH_SIZE,
    offset = 0
  ): Promise<QueryResult> {
    return this.executeQuery(`SELECT * FROM ${tableName}`, { offset, batchSize: limit });
  }

  public exportDatabaseBinary(): Uint8Array | null {
    return this.db ? this.db.export() : null;
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

  public isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }
}

export const databaseManager = new DatabaseManager();
