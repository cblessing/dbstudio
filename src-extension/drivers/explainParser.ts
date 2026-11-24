import { LiveExecutionPlanStep } from './types';

export function stripTrailingSemicolon(query: string): string {
  return query.trim().replace(/;\s*$/, '').trim();
}

export function isExplainableSql(query: string): boolean {
  const cleaned = query
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
  if (!cleaned || /^EXPLAIN\b/i.test(cleaned)) {
    return false;
  }
  return /^(?:SELECT|WITH|INSERT|UPDATE|DELETE|VALUES)\b/i.test(cleaned);
}

const PG_DETAIL_FIELDS: ReadonlyArray<[string, string]> = [
  ['Join Type', 'Join'],
  ['Index Name', 'Index'],
  ['Index Cond', 'Index Cond'],
  ['Hash Cond', 'Hash Cond'],
  ['Merge Cond', 'Merge Cond'],
  ['Filter', 'Filter'],
  ['Sort Key', 'Sort Key'],
  ['Group Key', 'Group Key'],
];

function buildPgStepDetails(node: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, label] of PG_DETAIL_FIELDS) {
    const val = node[key];
    if (Array.isArray(val) && val.length > 0) {
      parts.push(`${label}: ${val.join(', ')}`);
    } else if (typeof val === 'string' && val.trim()) {
      parts.push(`${label}: ${val.trim()}`);
    }
  }
  if (parts.length > 0) {
    return parts.join(' • ');
  }
  const alias = typeof node['Alias'] === 'string' ? node['Alias'] : '';
  return alias ? `Alias: ${alias}` : String(node['Node Type'] ?? 'Execution step');
}

function formatPgCost(node: Record<string, unknown>): string | undefined {
  const startup = node['Startup Cost'];
  const total = node['Total Cost'];
  if (typeof startup === 'number' && typeof total === 'number') {
    return `${startup.toFixed(2)}..${total.toFixed(2)}`;
  }
  return undefined;
}

function convertPgNode(
  node: Record<string, unknown>,
  counter: { nextId: number }
): LiveExecutionPlanStep {
  const id = counter.nextId++;
  const operation = String(node['Node Type'] ?? 'Plan Node');
  const relation = typeof node['Relation Name'] === 'string' ? node['Relation Name'] : undefined;
  const schema = typeof node['Schema'] === 'string' ? node['Schema'] : undefined;
  const target = relation ? (schema ? `${schema}.${relation}` : relation) : undefined;
  const rowsEstimate = typeof node['Plan Rows'] === 'number' ? node['Plan Rows'] : undefined;
  const rawChildren = Array.isArray(node['Plans']) ? node['Plans'] : [];
  const children = rawChildren
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
    .map((child) => convertPgNode(child, counter));

  return {
    id,
    operation,
    target,
    cost: formatPgCost(node),
    rowsEstimate,
    details: buildPgStepDetails(node),
    children: children.length > 0 ? children : undefined,
  };
}

export function parsePostgresExplainJson(rawPlan: unknown): LiveExecutionPlanStep[] {
  let parsed: unknown = rawPlan;
  if (typeof rawPlan === 'string') {
    try {
      parsed = JSON.parse(rawPlan);
    } catch {
      return [];
    }
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const counter = { nextId: 1 };
  const steps: LiveExecutionPlanStep[] = [];
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && 'Plan' in entry) {
      const root = (entry as Record<string, unknown>)['Plan'];
      if (root && typeof root === 'object') {
        steps.push(convertPgNode(root as Record<string, unknown>, counter));
      }
    }
  }
  return steps;
}

function buildMysqlExplainDetails(row: Record<string, unknown>, keyName: string): string {
  const parts: string[] = [];
  if (row.select_type) parts.push(`Select: ${String(row.select_type)}`);
  if (keyName) parts.push(`Key: ${keyName}`);
  if (row.Extra) parts.push(String(row.Extra));
  return parts.join(' • ') || 'MySQL execution step';
}

export function parseMysqlExplainRows(rows: Record<string, unknown>[]): LiveExecutionPlanStep[] {
  return rows.map((row, idx) => {
    const accessType = String(row.type ?? row.select_type ?? 'SCAN').toUpperCase();
    const keyName = row.key ? String(row.key) : '';
    const est = Number(row.rows);
    return {
      id: idx + 1,
      operation: keyName ? `INDEX ${accessType}` : `TABLE SCAN (${accessType})`,
      target: row.table ? String(row.table) : undefined,
      rowsEstimate: Number.isFinite(est) ? est : undefined,
      details: buildMysqlExplainDetails(row, keyName),
    };
  });
}

export function parseTextExplainLines(
  lines: string[],
  defaultOp = 'PLAN STEP'
): LiveExecutionPlanStep[] {
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  return nonEmpty.map((line, idx) => ({
    id: idx + 1,
    operation: defaultOp,
    details: line,
  }));
}

export function parseClickHouseExplainRows(
  rows: Record<string, unknown>[]
): LiveExecutionPlanStep[] {
  const lines = rows.map((r) => String(r.explain ?? Object.values(r)[0] ?? ''));
  return parseTextExplainLines(lines, 'PIPELINE STEP');
}
