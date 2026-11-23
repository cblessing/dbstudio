"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLiveDriverType = isLiveDriverType;
exports.sanitizeErrorMessage = sanitizeErrorMessage;
exports.validateConnectionConfig = validateConnectionConfig;
exports.loadOptionalDriver = loadOptionalDriver;
exports.buildRowsQueryResult = buildRowsQueryResult;
const LIVE_DRIVER_TYPES = new Set([
    'postgres',
    'mysql',
    'mariadb',
    'sqlserver',
    'oracle',
    'clickhouse',
    'mongodb',
    'redis',
]);
const SAFE_HOST_PATTERN = /^[a-zA-Z0-9._:-]{1,253}$/;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;
function isLiveDriverType(value) {
    return typeof value === 'string' && LIVE_DRIVER_TYPES.has(value);
}
function sanitizeErrorMessage(err) {
    const raw = err instanceof Error ? err.message : String(err ?? 'Unknown database error');
    return raw
        .replace(/(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis(?:s)?):\/\/[^\s]+/gi, '[redacted-uri]')
        .replace(/(password|pwd|token|secret)\s*[:=]\s*[^\s;,]+/gi, '$1=[redacted]');
}
function validateHostAndPort(host, port) {
    if (typeof host !== 'string' || !SAFE_HOST_PATTERN.test(host.trim())) {
        return 'Invalid host address.';
    }
    const numPort = typeof port === 'number' ? port : Number(port);
    if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
        return 'Port must be an integer between 1 and 65535.';
    }
    return null;
}
function normalizeTimeoutMs(val) {
    return typeof val === 'number' ? Math.min(Math.max(val, 1000), 30000) : 10000;
}
function asTrimmedString(val) {
    return typeof val === 'string' ? val.trim() : '';
}
function validateConnectionConfig(raw) {
    if (!raw || typeof raw !== 'object') {
        return { valid: false, error: 'Connection configuration must be an object.' };
    }
    const obj = raw;
    if (!isLiveDriverType(obj.type)) {
        return { valid: false, error: `Unsupported live driver type: ${String(obj.type ?? '')}` };
    }
    if (typeof obj.id !== 'string' || !SAFE_ID_PATTERN.test(obj.id)) {
        return { valid: false, error: 'Invalid connection identifier.' };
    }
    const hostPortError = validateHostAndPort(obj.host, obj.port);
    if (hostPortError) {
        return { valid: false, error: hostPortError };
    }
    return {
        valid: true,
        config: {
            id: obj.id,
            type: obj.type,
            host: String(obj.host).trim(),
            port: Number(obj.port),
            database: asTrimmedString(obj.database),
            username: asTrimmedString(obj.username),
            ssl: obj.ssl === true,
            rejectUnauthorized: obj.rejectUnauthorized !== false,
            timeoutMs: normalizeTimeoutMs(obj.timeoutMs),
        },
    };
}
function loadOptionalDriver(packageName) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(packageName);
    }
    catch {
        throw new Error(`Driver package "${packageName}" is not installed. Run "npm install ${packageName}".`);
    }
}
function buildRowsQueryResult(query, columns, rows, startTime, affectedRows) {
    const elapsed = Math.max(0.1, +(performance.now() - startTime).toFixed(2));
    return {
        columns,
        rows,
        executionTimeMs: elapsed,
        fetchTimeMs: 0.1,
        rowCount: affectedRows ?? rows.length,
        affectedRows,
        query,
    };
}
//# sourceMappingURL=types.js.map