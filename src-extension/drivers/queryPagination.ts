import { LiveDriverType, LiveQueryResult } from './types';

export const DEFAULT_LIVE_BATCH_SIZE = 1000;

const SQL_PAGINATED_DRIVERS: ReadonlySet<LiveDriverType> = new Set([
  'postgres',
  'mysql',
  'mariadb',
  'sqlserver',
  'oracle',
  'clickhouse',
]);

export function isUnboundedLiveSelect(sql: string): boolean {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .replace(/;\s*$/, '')
    .trim();

  if (!/^(?:SELECT|WITH)\b/i.test(cleaned)) {
    return false;
  }

  const hasExplicitLimit =
    /\bLIMIT\s+\d+(?:\s*,\s*\d+|\s+OFFSET\s+\d+)?\s*$/i.test(cleaned) ||
    /\bFETCH\s+(?:FIRST|NEXT)\s+\d+\s+ROWS?\s+ONLY\s*$/i.test(cleaned) ||
    /^SELECT\s+(?:DISTINCT\s+)?TOP\s+\d+\b/i.test(cleaned);

  return !hasExplicitLimit;
}

export function applyLivePagination(
  sql: string,
  driverType: LiveDriverType,
  batchSize = DEFAULT_LIVE_BATCH_SIZE,
  offset = 0
): { effectiveQuery: string; paginated: boolean } {
  if (!SQL_PAGINATED_DRIVERS.has(driverType) || !isUnboundedLiveSelect(sql)) {
    return { effectiveQuery: sql, paginated: false };
  }

  const trimmed = sql.trim().replace(/;\s*$/, '').trim();
  const safeBatch = Math.max(1, Math.floor(batchSize));
  const safeOffset = Math.max(0, Math.floor(offset));
  const probeLimit = safeBatch + 1;

  if (driverType === 'oracle') {
    return {
      effectiveQuery: `${trimmed} OFFSET ${safeOffset} ROWS FETCH NEXT ${probeLimit} ROWS ONLY`,
      paginated: true,
    };
  }

  if (driverType === 'sqlserver') {
    const hasOrderBy = /\bORDER\s+BY\b/i.test(trimmed);
    const orderClause = hasOrderBy ? '' : ' ORDER BY (SELECT NULL)';
    return {
      effectiveQuery: `${trimmed}${orderClause} OFFSET ${safeOffset} ROWS FETCH NEXT ${probeLimit} ROWS ONLY`,
      paginated: true,
    };
  }

  return {
    effectiveQuery: `${trimmed} LIMIT ${probeLimit} OFFSET ${safeOffset}`,
    paginated: true,
  };
}

export function finalizePaginatedResult(
  result: LiveQueryResult,
  originalQuery: string,
  paginated: boolean,
  batchSize = DEFAULT_LIVE_BATCH_SIZE,
  offset = 0
): LiveQueryResult {
  if (!paginated || result.error) {
    return result;
  }

  const safeBatch = Math.max(1, Math.floor(batchSize));
  const safeOffset = Math.max(0, Math.floor(offset));
  const hasMore = result.rows.length > safeBatch;
  const rows = hasMore ? result.rows.slice(0, safeBatch) : result.rows;

  return {
    ...result,
    rows,
    rowCount: rows.length,
    query: originalQuery,
    hasMore,
    nextOffset: hasMore ? safeOffset + safeBatch : undefined,
  };
}
