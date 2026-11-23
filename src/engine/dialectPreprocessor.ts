import { QueryResult } from '../types/database';
import { generateExecutionPlan } from './sqlEngineCore';

export interface PreprocessResult {
  translatedQuery: string;
  syntheticResult?: QueryResult;
}

type StoredProcedureHandler = (rawArgs: string, numArg: number | null) => string;

const STORED_PROCEDURES: Record<string, StoredProcedureHandler> = {
  sp_get_customer_orders: (_raw, numArg) => {
    const filter = numArg !== null ? ` WHERE c.id = ${numArg}` : '';
    return `SELECT c.id AS customer_id, c.first_name, c.last_name, o.id AS order_id, o.order_date, o.status, o.total_amount FROM customers c JOIN orders o ON c.id = o.customer_id${filter} ORDER BY o.order_date DESC`;
  },
  sp_sales_by_category: () =>
    `SELECT cat.name AS category, COUNT(DISTINCT p.id) AS product_count, ROUND(COALESCE(SUM(oi.subtotal), 0), 2) AS total_revenue FROM categories cat LEFT JOIN products p ON cat.id = p.category_id LEFT JOIN order_items oi ON p.id = oi.product_id GROUP BY cat.id, cat.name ORDER BY total_revenue DESC`,
  sp_get_inventory_logs: (_raw, numArg) => {
    const filter = numArg !== null ? ` WHERE il.product_id = ${numArg}` : '';
    return `SELECT il.log_id, il.product_id, p.sku, p.title, il.change_qty, il.reason, il.logged_by, il.log_time FROM inventory_logs il JOIN products p ON il.product_id = p.id${filter} ORDER BY il.log_time DESC`;
  },
  sp_restock_product: (rawArgs) => {
    const nums = rawArgs.match(/\d+/g);
    const prodId = nums?.[0] ? Number(nums[0]) : 1;
    const qty = nums?.[1] ? Number(nums[1]) : 10;
    return `UPDATE products SET stock_quantity = stock_quantity + ${qty} WHERE id = ${prodId}`;
  },
  prc_get_dept_employees: (_raw, numArg) => {
    const filter = numArg !== null ? ` WHERE department_id = ${numArg}` : '';
    return `SELECT employee_id, first_name, last_name, job_id, salary, department_id FROM employees${filter}`;
  },
  prc_give_raise: (rawArgs) => {
    const nums = rawArgs.match(/\d+(?:\.\d+)?/g);
    const empId = nums?.[0] ? Number(nums[0]) : 100;
    const pct = nums?.[1] ? Number(nums[1]) : 5;
    return `UPDATE employees SET salary = ROUND(salary * (1 + ${pct} / 100.0), 2) WHERE employee_id = ${empId}`;
  },
};

function buildSyntheticVersionResult(
  rawQuery: string,
  columns: string[],
  row: Record<string, string>,
  executionTimeMs = 0.2
): QueryResult {
  return {
    columns,
    rows: [row],
    executionTimeMs,
    fetchTimeMs: 0.1,
    rowCount: 1,
    query: rawQuery,
    explainPlan: generateExecutionPlan(rawQuery),
  };
}

function matchSyntheticSystemQuery(q: string, rawQuery: string): QueryResult | undefined {
  if (/^SELECT\s+@@VERSION\b/i.test(q)) {
    return buildSyntheticVersionResult(rawQuery, ['@@VERSION'], {
      '@@VERSION':
        'Microsoft SQL Server 2022 (RTM) - 16.0.1000.6 (X64) Oct  8 2022 05:58:10 Enterprise Edition: Core-based Licensing (64-bit) on Linux (Ubuntu 22.04.1 LTS) <X64>',
    });
  }

  if (/^SELECT\s+@@SERVERNAME\b/i.test(q)) {
    return buildSyntheticVersionResult(rawQuery, ['@@SERVERNAME'], {
      '@@SERVERNAME': 'MSSQL-PROD-AZURE-01',
    });
  }

  if (/FROM\s+(?:V\$VERSION|v\$version)\b/i.test(q)) {
    return buildSyntheticVersionResult(
      rawQuery,
      ['BANNER', 'BANNER_FULL'],
      {
        BANNER: 'Oracle Database 23c Free Release 23.0.0.0.0 - Production',
        BANNER_FULL:
          'Oracle Database 23c Free Release 23.0.0.0.0 - Production Version 23.3.0.23.09',
      },
      0.3
    );
  }

  return undefined;
}

const DIRECT_DDL_REWRITES: { pattern: RegExp; buildSql: (m: RegExpMatchArray) => string }[] = [
  {
    pattern:
      /^IF\s+OBJECT_ID\s*\([^)]+\)\s+IS\s+NOT\s+NULL\s+DROP\s+TABLE\s+(?:\[?dbo\]?\.)?\[?([a-zA-Z0-9_]+)\]?$/i,
    buildSql: (m) => `DROP TABLE IF EXISTS "${m[1]}"`,
  },
  {
    pattern:
      /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?[a-zA-Z0-9_]+"?\.)?"?`?\[?([a-zA-Z0-9_]+)\]?`?"?\s+CASCADE(?:\s+CONSTRAINTS)?$/i,
    buildSql: (m) => `DROP TABLE IF EXISTS "${m[1]}"`,
  },
  {
    pattern:
      /^TRUNCATE\s+TABLE\s+(?:(?:\[?dbo\]?|"HR"|"SYS"|public)\.)?["`[]?([a-zA-Z0-9_]+)["`\]]?$/i,
    buildSql: (m) => `DELETE FROM "${m[1]}"`,
  },
  {
    pattern:
      /^EXEC(?:UTE)?\s+sp_rename\s+N?'(?:\[?dbo\]?\.)?\[?([a-zA-Z0-9_]+)\]?\.\[?([a-zA-Z0-9_]+)\]?'\s*,\s*N?'([a-zA-Z0-9_]+)'\s*,\s*N?'COLUMN'$/i,
    buildSql: (m) => `ALTER TABLE "${m[1]}" RENAME COLUMN "${m[2]}" TO "${m[3]}"`,
  },
  {
    pattern:
      /^EXEC(?:UTE)?\s+sp_rename\s+N?'(?:\[?dbo\]?\.)?\[?([a-zA-Z0-9_]+)\]?'\s*,\s*N?'([a-zA-Z0-9_]+)'$/i,
    buildSql: (m) => `ALTER TABLE "${m[1]}" RENAME TO "${m[2]}"`,
  },
  {
    pattern:
      /^ALTER\s+TABLE\s+(?:"?[a-zA-Z0-9_]+"?\.)?"?([a-zA-Z0-9_]+)"?\s+ADD\s*\(\s*(.+)\s*\)$/is,
    buildSql: (m) => `ALTER TABLE "${m[1]}" ADD COLUMN ${m[2].trim()}`,
  },
];

function matchDirectDdlOrProcedure(q: string): string | undefined {
  for (const rule of DIRECT_DDL_REWRITES) {
    const match = q.match(rule.pattern);
    if (match) return rule.buildSql(match);
  }

  const procExecMatch = q.match(
    /^(?:EXEC(?:UTE)?|CALL)\s+(?:(?:\[?dbo\]?|"HR"|"SYS"|public|main)\.)?\[?"?([a-zA-Z0-9_]+)"?\]?(?:\s*\(([^)]*)\)|\s+(.*))?$/i
  );
  if (!procExecMatch) return undefined;

  const handler = STORED_PROCEDURES[procExecMatch[1].toLowerCase()];
  if (!handler) return undefined;

  const rawArgs = (procExecMatch[2] ?? procExecMatch[3] ?? '').trim();
  const firstNum = rawArgs.match(/(\d+)/);
  return handler(rawArgs, firstNum ? Number(firstNum[1]) : null);
}

function normalizeCreateTableIdentity(q: string): string {
  if (!/^CREATE\s+TABLE\b/i.test(q)) return q;
  return q
    .replace(
      /\bNUMBER\s+GENERATED\s+(?:ALWAYS|BY\s+DEFAULT(?:\s+ON\s+NULL)?)\s+AS\s+IDENTITY(?:\s+PRIMARY\s+KEY)?/gi,
      'INTEGER PRIMARY KEY AUTOINCREMENT'
    )
    .replace(
      /\b(?:INT|INTEGER|BIGINT)\s+IDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)(?:\s+PRIMARY\s+KEY)?/gi,
      'INTEGER PRIMARY KEY AUTOINCREMENT'
    )
    .replace(/\b(?:BIG)?SERIAL\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(
      /\b(?:INT|INTEGER|BIGINT)\s+(?:NOT\s+NULL\s+)?AUTO_INCREMENT(?:\s+PRIMARY\s+KEY)?/gi,
      'INTEGER PRIMARY KEY AUTOINCREMENT'
    )
    .replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT');
}

function normalizeTopAndRownumLimits(query: string): string {
  let q = query;
  const topMatch = q.match(/^SELECT\s+TOP\s*\(?\s*(\d+)\s*\)?\s+(.+)$/is);
  if (topMatch) {
    const suffix = /LIMIT\s+\d+/i.test(topMatch[2]) ? '' : ` LIMIT ${topMatch[1]}`;
    q = `SELECT ${topMatch[2]}${suffix}`;
  }

  const rownumMatch = q.match(/\bWHERE\s+ROWNUM\s*<=\s*(\d+)/i);
  if (rownumMatch) {
    q = q.replace(/\bWHERE\s+ROWNUM\s*<=\s*(\d+)/i, '');
    if (!/LIMIT\s+\d+/i.test(q)) {
      q = `${q} LIMIT ${rownumMatch[1]}`;
    }
  }
  return q;
}

function normalizeIdentifiersAndFunctions(query: string): string {
  const cleaned = query
    .replace(/\bWITH\s*\(\s*NOLOCK\s*\)/gi, '')
    .replace(/\[dbo\]\.\[([a-zA-Z0-9_]+)\]/gi, '$1')
    .replace(/dbo\.\[([a-zA-Z0-9_]+)\]/gi, '$1')
    .replace(/dbo\.([a-zA-Z0-9_]+)/gi, '$1')
    .replace(/\[([a-zA-Z0-9_]+)\]/g, '$1')
    .replace(/"HR"\."([a-zA-Z0-9_]+)"/gi, '$1')
    .replace(/"SYS"\."([a-zA-Z0-9_]+)"/gi, '$1')
    .replace(/\bHR\.([a-zA-Z0-9_]+)/gi, '$1')
    .replace(/\bSYS\.([a-zA-Z0-9_]+)/gi, '$1')
    .replace(/\bSYSDATE\b/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bGETDATE\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bSYSDATETIME\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bGETUTCDATE\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bNEWID\(\)/gi, ' lower(hex(randomblob(16)))')
    .replace(/\bLEN\(/gi, 'LENGTH(')
    .replace(/\bISNULL\(/gi, 'COALESCE(')
    .replace(/\bNVL\(/gi, 'COALESCE(');

  return normalizeTopAndRownumLimits(normalizeCreateTableIdentity(cleaned));
}

export function preprocessDialectQuery(rawQuery: string): PreprocessResult {
  const q = rawQuery
    .replace(/^\s*GO\s*;?\s*$/gim, '')
    .trim()
    .replace(/;$/, '');

  const syntheticResult = matchSyntheticSystemQuery(q, rawQuery);
  if (syntheticResult) {
    return { translatedQuery: q, syntheticResult };
  }

  const directRewrite = matchDirectDdlOrProcedure(q);
  if (directRewrite) {
    return { translatedQuery: directRewrite };
  }

  return { translatedQuery: normalizeIdentifiersAndFunctions(q) };
}
