const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'ORDER BY',
  'GROUP BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'FULL JOIN',
  'CROSS JOIN',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'JOIN',
  'ON',
  'AS',
  'ASC',
  'DESC',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'CREATE TABLE',
  'ALTER TABLE',
  'DROP TABLE',
  'INDEX',
  'PRIMARY KEY',
  'FOREIGN KEY',
  'REFERENCES',
  'NOT NULL',
  'DEFAULT',
  'DISTINCT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'UNION ALL',
  'UNION',
  'IN',
  'IS NULL',
  'IS NOT NULL',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'EXPLAIN QUERY PLAN',
  'EXPLAIN',
];

export function formatSql(query: string): string {
  if (!query || typeof query !== 'string') return '';
  const trimmed = query.trim();
  if (!trimmed) return '';

  // Extract string literals and comments to preserve them intact
  const literals: string[] = [];
  let tokenized = trimmed.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"/g, (match) => {
    literals.push(match);
    return `__SQL_LITERAL_${literals.length - 1}__`;
  });

  // Preserve line comments
  const comments: string[] = [];
  tokenized = tokenized.replace(/--.*$/gm, (match) => {
    comments.push(match);
    return `__SQL_COMMENT_${comments.length - 1}__`;
  });

  // Replace whitespace sequences with a single space first
  tokenized = tokenized.replace(/\s+/g, ' ');

  // Capitalize known SQL keywords (word-boundary matched, sorted longest first)
  const sortedKeywords = [...SQL_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sortedKeywords) {
    const escaped = kw.replace(/ /g, '\\s+');
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${escaped}(?![a-zA-Z0-9_])`, 'gi');
    tokenized = tokenized.replace(regex, kw);
  }

  // Break lines before main clauses using safe negative lookbehinds
  // Ensure we don't break 'INNER JOIN' into 'INNER \nJOIN'
  const clauseKeywords = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'INNER JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'CROSS JOIN',
    'FULL JOIN',
    'JOIN',
    'VALUES',
    'SET',
    'UNION ALL',
    'UNION',
  ];

  // Protect multi-word join phrases first
  tokenized = tokenized.replace(/\b(INNER|LEFT|RIGHT|CROSS|FULL)\s+JOIN\b/g, '__MWJOIN_$1__');
  // Break standalone JOIN
  tokenized = tokenized.replace(/\bJOIN\b/g, '\n  JOIN');
  // Restore multi-word joins with newline and indent
  tokenized = tokenized.replace(/__MWJOIN_(INNER|LEFT|RIGHT|CROSS|FULL)__/g, '\n  $1 JOIN');

  // Other major clauses
  const topClauses = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'VALUES',
    'SET',
    'UNION ALL',
    'UNION',
  ];

  for (const clause of topClauses) {
    const regex = new RegExp(`\\s*\\b(${clause})\\b\\s*`, 'g');
    tokenized = tokenized.replace(regex, '\n$1 ');
  }

  const lines = tokenized
    .split('\n')
    .map((line) => line.trimRight())
    .filter((line) => line.trim().length > 0);

  let result = lines.join('\n');

  // Restore comments and literals
  for (let i = 0; i < comments.length; i++) {
    result = result.replace(`__SQL_COMMENT_${i}__`, comments[i]);
  }
  for (let i = 0; i < literals.length; i++) {
    result = result.replace(`__SQL_LITERAL_${i}__`, literals[i]);
  }

  // Semicolon cleanup
  result = result.replace(/\s+;/g, ';');
  if (!result.endsWith(';') && !result.includes('\n\n')) {
    result += ';';
  }

  return result.trim();
}
