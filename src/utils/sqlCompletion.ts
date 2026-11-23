import { DatabaseConnection, SchemaDefinition } from '../types/database';

export type SqlCompletionKind = 'table' | 'view' | 'procedure' | 'column';

export interface SqlCompletionItem {
  name: string;
  kind: SqlCompletionKind;
  schema?: string;
  detail: string;
  insertText: string;
}

export interface SqlCompletionResult {
  items: SqlCompletionItem[];
  replaceStart: number;
  replaceEnd: number;
  prefix: string;
  qualifier?: string;
}

interface CatalogObjects {
  allTables: SqlCompletionItem[];
  allViews: SqlCompletionItem[];
  allProcedures: SqlCompletionItem[];
  allColumnsByObject: Map<string, SqlCompletionItem[]>;
}

const OBJECT_CLAUSE_REGEX =
  /\b(?:FROM|JOIN|INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|CROSS\s+JOIN|INTO|UPDATE|TABLE|VIEW|DESCRIBE|DESC|TRUNCATE)\s+(?:[a-zA-Z0-9_[\]"`]+(?:\.[a-zA-Z0-9_[\]"`]+)?\s*(?:(?:AS\s+)?[a-zA-Z0-9_]+)?\s*,\s*)*$/i;

const PROCEDURE_CLAUSE_REGEX = /\b(?:EXEC|EXECUTE|CALL|PROCEDURE)\s+$/i;

const EXPRESSION_CLAUSE_REGEX =
  /(?:\b(?:SELECT(?:\s+DISTINCT|\s+TOP\s+\(?\d+\)?)?|WHERE|AND|OR|ON|BY|HAVING|SET|VALUES)\s+|[,(=<>!]\s*)$/i;

const RESERVED_KEYWORDS = new Set([
  'WHERE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'CROSS',
  'ON',
  'GROUP',
  'ORDER',
  'LIMIT',
  'HAVING',
  'SET',
  'VALUES',
  'UNION',
]);

/**
 * Checks whether the cursor offset is inside a single-quoted string,
 * a line comment (`-- ...`), or a block comment (`/* ... * /`).
 */
function isInsideStringOrComment(sql: string, cursorOffset: number): boolean {
  const prefix = sql.slice(0, cursorOffset);
  const withoutCompleteTokens = prefix.replace(
    /'(?:''|[^'])*'|\/\*[\s\S]*?\*\/|--[^\n]*\n/g,
    ''
  );
  return /'|--|\/\*/.test(withoutCompleteTokens);
}

function extractQueryReferences(sql: string): {
  aliases: Map<string, string>;
  referencedObjects: Set<string>;
} {
  const aliases = new Map<string, string>();
  const referencedObjects = new Set<string>();
  const regex =
    /\b(?:FROM|JOIN|UPDATE|INTO)\s+(?:[a-zA-Z0-9_[\]"`]+\.)?["`[]?([a-zA-Z0-9_]+)["`\]]?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;

  for (const match of sql.matchAll(regex)) {
    const objectName = match[1];
    const alias = match[2];
    referencedObjects.add(objectName.toLowerCase());
    if (alias && !RESERVED_KEYWORDS.has(alias.toUpperCase())) {
      aliases.set(alias.toLowerCase(), objectName.toLowerCase());
    }
  }
  return { aliases, referencedObjects };
}

function indexSchemaTables(schema: SchemaDefinition, catalog: CatalogObjects): void {
  for (const tbl of schema.tables) {
    const schemaName = tbl.schema ?? schema.name;
    catalog.allTables.push({
      name: tbl.name,
      kind: 'table',
      schema: schemaName,
      detail: `Table • ${schemaName}`,
      insertText: tbl.name,
    });

    const cols: SqlCompletionItem[] = tbl.columns.map((col) => ({
      name: col.name,
      kind: 'column',
      schema: tbl.name,
      detail: `Column • ${tbl.name} (${col.type})`,
      insertText: col.name,
    }));
    catalog.allColumnsByObject.set(tbl.name.toLowerCase(), cols);
  }
}

function indexSchemaViews(schema: SchemaDefinition, catalog: CatalogObjects): void {
  const views = schema.views ?? [];
  for (const vw of views) {
    const schemaName = vw.schema ?? schema.name;
    catalog.allViews.push({
      name: vw.name,
      kind: 'view',
      schema: schemaName,
      detail: `View • ${schemaName}`,
      insertText: vw.name,
    });

    if (vw.columns) {
      const cols: SqlCompletionItem[] = vw.columns.map((col) => ({
        name: col.name,
        kind: 'column',
        schema: vw.name,
        detail: `Column • ${vw.name} (${col.type})`,
        insertText: col.name,
      }));
      catalog.allColumnsByObject.set(vw.name.toLowerCase(), cols);
    }
  }
}

function indexSchemaProcedures(schema: SchemaDefinition, catalog: CatalogObjects): void {
  const procedures = schema.procedures ?? [];
  for (const proc of procedures) {
    const schemaName = proc.schema ?? schema.name;
    const paramSuffix = proc.parameters ? ` (${proc.parameters})` : '';
    catalog.allProcedures.push({
      name: proc.name,
      kind: 'procedure',
      schema: schemaName,
      detail: `Procedure • ${schemaName}${paramSuffix}`,
      insertText: proc.name,
    });
  }
}

function buildCatalogObjects(schemas: SchemaDefinition[]): CatalogObjects {
  const catalog: CatalogObjects = {
    allTables: [],
    allViews: [],
    allProcedures: [],
    allColumnsByObject: new Map(),
  };

  for (const schema of schemas) {
    indexSchemaTables(schema, catalog);
    indexSchemaViews(schema, catalog);
    indexSchemaProcedures(schema, catalog);
  }

  return catalog;
}

function filterAndRankCandidates(
  candidates: SqlCompletionItem[],
  lowerPrefix: string
): SqlCompletionItem[] {
  const seen = new Set<string>();
  const prefixMatches: SqlCompletionItem[] = [];
  const substringMatches: SqlCompletionItem[] = [];

  for (const item of candidates) {
    const key = `${item.kind}:${item.name.toLowerCase()}`;
    if (seen.has(key)) continue;

    const lowerName = item.name.toLowerCase();
    if (lowerName.startsWith(lowerPrefix)) {
      seen.add(key);
      prefixMatches.push(item);
    } else if (lowerName.includes(lowerPrefix)) {
      seen.add(key);
      substringMatches.push(item);
    }
  }

  return [...prefixMatches, ...substringMatches];
}

function resolveQualifiedCandidates(
  query: string,
  rawQualifier: string,
  schemas: SchemaDefinition[],
  catalog: CatalogObjects
): SqlCompletionItem[] {
  const lowerQual = rawQualifier.toLowerCase();
  const isSchemaMatch = schemas.some((s) => s.name.toLowerCase() === lowerQual);

  if (isSchemaMatch) {
    const allObjects = [
      ...catalog.allTables,
      ...catalog.allViews,
      ...catalog.allProcedures,
    ];
    return allObjects.filter((obj) => (obj.schema ?? '').toLowerCase() === lowerQual);
  }

  const { aliases } = extractQueryReferences(query);
  const resolvedObjectName = aliases.get(lowerQual) ?? lowerQual;
  return catalog.allColumnsByObject.get(resolvedObjectName) ?? [];
}

function resolveExpressionCandidates(
  query: string,
  catalog: CatalogObjects
): SqlCompletionItem[] {
  const { referencedObjects } = extractQueryReferences(query);
  const referencedCols: SqlCompletionItem[] = [];
  const otherCols: SqlCompletionItem[] = [];

  for (const [objName, cols] of catalog.allColumnsByObject.entries()) {
    const targetList = referencedObjects.has(objName) ? referencedCols : otherCols;
    targetList.push(...cols);
  }

  return [
    ...referencedCols,
    ...catalog.allTables,
    ...catalog.allViews,
    ...catalog.allProcedures,
    ...otherCols,
  ];
}

function resolveUnqualifiedCandidates(
  query: string,
  textBeforeToken: string,
  catalog: CatalogObjects,
  forceTrigger: boolean
): SqlCompletionItem[] {
  if (PROCEDURE_CLAUSE_REGEX.test(textBeforeToken)) {
    return [...catalog.allProcedures, ...catalog.allViews, ...catalog.allTables];
  }

  if (OBJECT_CLAUSE_REGEX.test(textBeforeToken)) {
    return [...catalog.allTables, ...catalog.allViews, ...catalog.allProcedures];
  }

  if (EXPRESSION_CLAUSE_REGEX.test(textBeforeToken)) {
    return resolveExpressionCandidates(query, catalog);
  }

  return forceTrigger ? resolveExpressionCandidates(query, catalog) : [];
}

function canComputeCompletions(
  query: string,
  cursorOffset: number,
  connection: DatabaseConnection | null | undefined
): connection is DatabaseConnection {
  if (!connection || connection.schemas.length === 0) return false;
  if (cursorOffset < 0 || cursorOffset > query.length) return false;
  return !isInsideStringOrComment(query, cursorOffset);
}

export function getSqlCompletions(
  query: string,
  cursorOffset: number,
  connection: DatabaseConnection | null | undefined,
  forceTrigger = false
): SqlCompletionResult {
  const emptyResult: SqlCompletionResult = {
    items: [],
    replaceStart: cursorOffset,
    replaceEnd: cursorOffset,
    prefix: '',
  };

  if (!canComputeCompletions(query, cursorOffset, connection)) {
    return emptyResult;
  }

  const textBeforeCursor = query.slice(0, cursorOffset);
  const tokenMatch = textBeforeCursor.match(
    /(?:([a-zA-Z0-9_$#[\]"`]+)\.)?([a-zA-Z0-9_$#]*)$/
  )!;

  const rawQualifier = tokenMatch[1]
    ? tokenMatch[1].replace(/^[["`]|[\]"`]$/g, '')
    : undefined;
  const prefix = tokenMatch[2];
  const hasTriggerInput = Boolean(prefix) || Boolean(rawQualifier) || forceTrigger;
  if (!hasTriggerInput) {
    return emptyResult;
  }

  const replaceStart = cursorOffset - prefix.length;
  const textBeforeToken = query.slice(0, tokenMatch.index ?? replaceStart);
  const catalog = buildCatalogObjects(connection.schemas);

  const candidates = rawQualifier
    ? resolveQualifiedCandidates(query, rawQualifier, connection.schemas, catalog)
    : resolveUnqualifiedCandidates(query, textBeforeToken, catalog, forceTrigger);

  return {
    items: filterAndRankCandidates(candidates, prefix.toLowerCase()),
    replaceStart,
    replaceEnd: cursorOffset,
    prefix,
    qualifier: rawQualifier,
  };
}
