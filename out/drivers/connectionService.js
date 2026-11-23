"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveConnectionService = void 0;
const types_1 = require("./types");
const sqlDrivers_1 = require("./sqlDrivers");
const nosqlDrivers_1 = require("./nosqlDrivers");
const DEFAULT_DRIVERS = {
    postgres: sqlDrivers_1.postgresDriver,
    mysql: sqlDrivers_1.mysqlDriver,
    mariadb: sqlDrivers_1.mysqlDriver,
    sqlserver: sqlDrivers_1.sqlServerDriver,
    oracle: sqlDrivers_1.oracleDriver,
    clickhouse: sqlDrivers_1.clickhouseDriver,
    mongodb: nosqlDrivers_1.mongodbDriver,
    redis: nosqlDrivers_1.redisDriver,
};
const SECRET_KEY_PREFIX = 'dbstudio.conn.';
function secretKeyFor(connectionId) {
    return `${SECRET_KEY_PREFIX}${connectionId}.password`;
}
class LiveConnectionService {
    secrets;
    configs = new Map();
    drivers;
    constructor(secrets, drivers) {
        this.secrets = secrets;
        this.drivers = { ...DEFAULT_DRIVERS, ...drivers };
    }
    async saveConnection(rawConfig, password) {
        const validation = (0, types_1.validateConnectionConfig)(rawConfig);
        if ('error' in validation) {
            throw new Error(validation.error);
        }
        const { config } = validation;
        this.configs.set(config.id, config);
        if (typeof password === 'string' && password.length > 0) {
            await this.secrets.store(secretKeyFor(config.id), password);
        }
        return config;
    }
    async deleteConnection(connectionId) {
        this.configs.delete(connectionId);
        await this.secrets.delete(secretKeyFor(connectionId));
    }
    hasConnection(connectionId) {
        return this.configs.has(connectionId);
    }
    async resolvePassword(connectionId, overridePassword) {
        if (typeof overridePassword === 'string' && overridePassword.length > 0) {
            return overridePassword;
        }
        const stored = await this.secrets.get(secretKeyFor(connectionId));
        return stored ?? '';
    }
    async testConnection(rawConfig, password) {
        const validation = (0, types_1.validateConnectionConfig)(rawConfig);
        if ('error' in validation) {
            return { success: false, latencyMs: 0, message: validation.error };
        }
        const { config } = validation;
        const driver = this.drivers[config.type];
        const resolvedPassword = await this.resolvePassword(config.id, password);
        try {
            return await driver.testConnection(config, resolvedPassword);
        }
        catch (err) {
            return {
                success: false,
                latencyMs: 0,
                message: (0, types_1.sanitizeErrorMessage)(err),
            };
        }
    }
    async executeQuery(connectionId, query, options) {
        const config = this.configs.get(connectionId);
        if (!config) {
            return {
                columns: [],
                rows: [],
                executionTimeMs: 0,
                fetchTimeMs: 0,
                rowCount: 0,
                query,
                error: `Live connection "${connectionId}" is not registered.`,
            };
        }
        const driver = this.drivers[config.type];
        const password = await this.resolvePassword(connectionId);
        try {
            return await driver.executeQuery(config, password, query, options);
        }
        catch (err) {
            return {
                columns: [],
                rows: [],
                executionTimeMs: 0,
                fetchTimeMs: 0,
                rowCount: 0,
                query,
                error: (0, types_1.sanitizeErrorMessage)(err),
            };
        }
    }
    async introspectSchema(connectionId) {
        const config = this.configs.get(connectionId);
        if (!config) {
            throw new Error(`Live connection "${connectionId}" is not registered.`);
        }
        const driver = this.drivers[config.type];
        const password = await this.resolvePassword(connectionId);
        try {
            return await driver.introspectSchema(config, password);
        }
        catch (err) {
            throw new Error((0, types_1.sanitizeErrorMessage)(err), { cause: err });
        }
    }
}
exports.LiveConnectionService = LiveConnectionService;
//# sourceMappingURL=connectionService.js.map