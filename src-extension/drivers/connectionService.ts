import {
  LiveConnectionConfig,
  LiveDatabaseDriver,
  LiveDriverType,
  LiveQueryOptions,
  LiveQueryResult,
  LiveSchemaTable,
  LiveTestResult,
  sanitizeErrorMessage,
  validateConnectionConfig,
} from './types';
import {
  postgresDriver,
  mysqlDriver,
  sqlServerDriver,
  oracleDriver,
  clickhouseDriver,
} from './sqlDrivers';
import { mongodbDriver, redisDriver } from './nosqlDrivers';
import { withSshTunnel } from './sshTunnel';

export interface SecretStoreLike {
  get(key: string): Thenable<string | undefined> | Promise<string | undefined>;
  store(key: string, value: string): Thenable<void> | Promise<void>;
  delete(key: string): Thenable<void> | Promise<void>;
}

const DEFAULT_DRIVERS: Record<LiveDriverType, LiveDatabaseDriver> = {
  postgres: postgresDriver,
  mysql: mysqlDriver,
  mariadb: mysqlDriver,
  sqlserver: sqlServerDriver,
  oracle: oracleDriver,
  clickhouse: clickhouseDriver,
  mongodb: mongodbDriver,
  redis: redisDriver,
};

const SECRET_KEY_PREFIX = 'dbstudio.conn.';

function secretKeyFor(connectionId: string): string {
  return `${SECRET_KEY_PREFIX}${connectionId}.password`;
}

function sshSecretKeyFor(connectionId: string): string {
  return `${SECRET_KEY_PREFIX}${connectionId}.sshSecret`;
}

export class LiveConnectionService {
  private readonly configs = new Map<string, LiveConnectionConfig>();
  private readonly sessionPasswords = new Map<string, string>();
  private readonly sessionSshSecrets = new Map<string, string>();
  private readonly drivers: Record<LiveDriverType, LiveDatabaseDriver>;

  constructor(
    private readonly secrets: SecretStoreLike,
    drivers?: Partial<Record<LiveDriverType, LiveDatabaseDriver>>
  ) {
    this.drivers = { ...DEFAULT_DRIVERS, ...drivers };
  }

  public async saveConnection(
    rawConfig: unknown,
    password?: string,
    sshSecret?: string
  ): Promise<LiveConnectionConfig> {
    const validation = validateConnectionConfig(rawConfig);
    if ('error' in validation) {
      throw new Error(validation.error);
    }

    const { config } = validation;
    this.configs.set(config.id, config);
    if (typeof password === 'string' && password.length > 0) {
      this.sessionPasswords.set(config.id, password);
      await this.secrets.store(secretKeyFor(config.id), password);
    }
    if (typeof sshSecret === 'string' && sshSecret.length > 0) {
      this.sessionSshSecrets.set(config.id, sshSecret);
      await this.secrets.store(sshSecretKeyFor(config.id), sshSecret);
    }
    return config;
  }

  public async deleteConnection(connectionId: string): Promise<void> {
    this.configs.delete(connectionId);
    this.sessionPasswords.delete(connectionId);
    this.sessionSshSecrets.delete(connectionId);
    await this.secrets.delete(secretKeyFor(connectionId));
    await this.secrets.delete(sshSecretKeyFor(connectionId));
  }

  public hasConnection(connectionId: string): boolean {
    return this.configs.has(connectionId);
  }

  public async getPassword(connectionId: string): Promise<string> {
    return this.resolveSecret(connectionId, this.sessionPasswords, secretKeyFor);
  }

  private async resolveSecret(
    connectionId: string,
    cache: Map<string, string>,
    keyFn: (id: string) => string,
    override?: string
  ): Promise<string> {
    if (typeof override === 'string' && override.length > 0) return override;
    const cached = cache.get(connectionId);
    if (cached) return cached;
    return (await this.secrets.get(keyFn(connectionId))) ?? '';
  }

  public async testConnection(
    rawConfig: unknown,
    password?: string,
    sshSecret?: string
  ): Promise<LiveTestResult> {
    const validation = validateConnectionConfig(rawConfig);
    if ('error' in validation) {
      return { success: false, latencyMs: 0, message: validation.error };
    }

    const { config } = validation;
    const driver = this.drivers[config.type];
    const resolvedPassword = await this.resolveSecret(
      config.id,
      this.sessionPasswords,
      secretKeyFor,
      password
    );
    const resolvedSshSecret = await this.resolveSecret(
      config.id,
      this.sessionSshSecrets,
      sshSecretKeyFor,
      sshSecret
    );

    try {
      return await withSshTunnel(config, resolvedSshSecret, (effectiveConfig) =>
        driver.testConnection(effectiveConfig, resolvedPassword)
      );
    } catch (err) {
      return {
        success: false,
        latencyMs: 0,
        message: sanitizeErrorMessage(err),
      };
    }
  }

  public async executeQuery(
    connectionId: string,
    query: string,
    options?: LiveQueryOptions
  ): Promise<LiveQueryResult> {
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
    const password = await this.resolveSecret(connectionId, this.sessionPasswords, secretKeyFor);
    const sshSecret = await this.resolveSecret(
      connectionId,
      this.sessionSshSecrets,
      sshSecretKeyFor
    );
    try {
      return await withSshTunnel(config, sshSecret, (effectiveConfig) =>
        driver.executeQuery(effectiveConfig, password, query, options)
      );
    } catch (err) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: 0,
        fetchTimeMs: 0,
        rowCount: 0,
        query,
        error: sanitizeErrorMessage(err),
      };
    }
  }

  public async introspectSchema(connectionId: string): Promise<LiveSchemaTable[]> {
    const config = this.configs.get(connectionId);
    if (!config) {
      throw new Error(`Live connection "${connectionId}" is not registered.`);
    }
    const driver = this.drivers[config.type];
    const password = await this.resolveSecret(connectionId, this.sessionPasswords, secretKeyFor);
    const sshSecret = await this.resolveSecret(
      connectionId,
      this.sessionSshSecrets,
      sshSecretKeyFor
    );
    try {
      return await withSshTunnel(config, sshSecret, (effectiveConfig) =>
        driver.introspectSchema(effectiveConfig, password)
      );
    } catch (err) {
      throw new Error(sanitizeErrorMessage(err), { cause: err });
    }
  }
}
