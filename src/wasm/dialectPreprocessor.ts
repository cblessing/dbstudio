import { QueryResult } from '../types/database';
import { generateExecutionPlan } from './sqlEngineCore';

export interface PreprocessResult {
  translatedQuery: string;
  syntheticResult?: QueryResult;
}

export function preprocessDialectQuery(rawQuery: string): PreprocessResult {
  let q = rawQuery.trim().replace(/;$/, '');

  // T-SQL System Functions: SELECT @@VERSION
  if (/^SELECT\s+@@VERSION\b/i.test(q)) {
    return {
      translatedQuery: q,
      syntheticResult: {
        columns: ['@@VERSION'],
        rows: [
          {
            '@@VERSION':
              'Microsoft SQL Server 2022 (RTM) - 16.0.1000.6 (X64) Oct  8 2022 05:58:10 Enterprise Edition: Core-based Licensing (64-bit) on Linux (Ubuntu 22.04.1 LTS) <X64> (WASM Native)',
          },
        ],
        executionTimeMs: 0.2,
        fetchTimeMs: 0.1,
        rowCount: 1,
        query: rawQuery,
        explainPlan: generateExecutionPlan(rawQuery),
      },
    };
  }

  // T-SQL: SELECT @@SERVERNAME
  if (/^SELECT\s+@@SERVERNAME\b/i.test(q)) {
    return {
      translatedQuery: q,
      syntheticResult: {
        columns: ['@@SERVERNAME'],
        rows: [{ '@@SERVERNAME': 'MSSQL-PROD-AZURE-01' }],
        executionTimeMs: 0.2,
        fetchTimeMs: 0.1,
        rowCount: 1,
        query: rawQuery,
        explainPlan: generateExecutionPlan(rawQuery),
      },
    };
  }

  // Oracle: SELECT * FROM v$version or V$VERSION
  if (/FROM\s+(?:V\$VERSION|v\$version)\b/i.test(q)) {
    return {
      translatedQuery: q,
      syntheticResult: {
        columns: ['BANNER', 'BANNER_FULL'],
        rows: [
          {
            BANNER: 'Oracle Database 23c Free Release 23.0.0.0.0 - Production',
            BANNER_FULL:
              'Oracle Database 23c Free Release 23.0.0.0.0 - Production Version 23.3.0.23.09 (WebAssembly Virtual Runtime)',
          },
        ],
        executionTimeMs: 0.3,
        fetchTimeMs: 0.1,
        rowCount: 1,
        query: rawQuery,
        explainPlan: generateExecutionPlan(rawQuery),
      },
    };
  }

  // T-SQL square bracket normalization: [dbo].[tableName] -> tableName, [column] -> column
  q = q.replace(/\[dbo\]\.\[([a-zA-Z0-9_]+)\]/gi, '$1');
  q = q.replace(/dbo\.\[([a-zA-Z0-9_]+)\]/gi, '$1');
  q = q.replace(/dbo\.([a-zA-Z0-9_]+)/gi, '$1');
  q = q.replace(/\[([a-zA-Z0-9_]+)\]/g, '$1');

  // Oracle quotes normalization: "HR"."EMPLOYEES" -> employees, "HR"."employees" -> employees
  q = q.replace(/"HR"\."([a-zA-Z0-9_]+)"/gi, '$1');
  q = q.replace(/"SYS"\."([a-zA-Z0-9_]+)"/gi, '$1');
  q = q.replace(/HR\.([a-zA-Z0-9_]+)/gi, '$1');

  // Dialect date/time functions
  q = q.replace(/\bSYSDATE\b/gi, 'CURRENT_TIMESTAMP');
  q = q.replace(/\bGETDATE\(\)/gi, 'CURRENT_TIMESTAMP');
  q = q.replace(/\bISNULL\(/gi, 'COALESCE(');
  q = q.replace(/\bNVL\(/gi, 'COALESCE(');

  // T-SQL: SELECT TOP (N) or SELECT TOP N
  const topMatch = q.match(/^SELECT\s+TOP\s*\(?\s*(\d+)\s*\)?\s+(.+)$/is);
  if (topMatch) {
    const limit = topMatch[1];
    const rest = topMatch[2];
    if (!/LIMIT\s+\d+/i.test(rest)) {
      q = `SELECT ${rest} LIMIT ${limit}`;
    } else {
      q = `SELECT ${rest}`;
    }
  }

  // Oracle: WHERE ROWNUM <= N
  const rownumMatch = q.match(/\bWHERE\s+ROWNUM\s*<=\s*(\d+)/i);
  if (rownumMatch) {
    const limit = rownumMatch[1];
    q = q.replace(/\bWHERE\s+ROWNUM\s*<=\s*(\d+)/i, '');
    if (!/LIMIT\s+\d+/i.test(q)) {
      q = `${q} LIMIT ${limit}`;
    }
  }

  return { translatedQuery: q };
}
