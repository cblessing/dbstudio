import {
  DatabaseDriverInfo,
  DatabaseType,
  SshAuthMethod,
  SshTunnelConfig,
} from '../types/database';

const DEFAULT_SSH_FORM_FIELDS = {
  sshEnabled: false,
  sshHost: '',
  sshPort: 22,
  sshUsername: '',
  sshAuthMethod: 'privateKey' as SshAuthMethod,
  sshPrivateKeyPath: '',
  sshSecret: '',
};

export function toSshFormFields(ssh?: SshTunnelConfig) {
  if (!ssh) return { ...DEFAULT_SSH_FORM_FIELDS };
  return {
    sshEnabled: Boolean(ssh.enabled),
    sshHost: ssh.host || '',
    sshPort: ssh.port || 22,
    sshUsername: ssh.username || '',
    sshAuthMethod: ssh.authMethod || 'privateKey',
    sshPrivateKeyPath: ssh.privateKeyPath || '',
    sshSecret: '',
  };
}

export interface ConnectionFormState {
  selectedDriver: DatabaseDriverInfo;
  step: 'pick' | 'configure';
  connectionName: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  allowSelfSigned: boolean;
  sshEnabled: boolean;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshAuthMethod: SshAuthMethod;
  sshPrivateKeyPath: string;
  sshSecret: string;
  colorBadge: string;
}

export interface ConnectionFieldLabels {
  uriLabel: string;
  uriPlaceholder: string;
  hostLabel: string;
  hostPlaceholder: string;
  portLabel: string;
  databaseLabel: string;
  databasePlaceholder: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
}

const DEFAULT_LABELS: ConnectionFieldLabels = {
  uriLabel: 'Connection URI',
  uriPlaceholder: 'postgresql://user:password@127.0.0.1:5432/dbstudio',
  hostLabel: 'Host / Server',
  hostPlaceholder: '127.0.0.1',
  portLabel: 'Port',
  databaseLabel: 'Database / Catalog',
  databasePlaceholder: 'dbstudio',
  usernameLabel: 'Username',
  usernamePlaceholder: 'user',
  passwordLabel: 'Password',
};

const LABELS_BY_TYPE: Partial<Record<DatabaseType, Partial<ConnectionFieldLabels>>> = {
  postgres: {
    uriPlaceholder: 'postgresql://postgres:password@127.0.0.1:5432/dbstudio',
    hostLabel: 'Host',
    databaseLabel: 'Database',
    databasePlaceholder: 'postgres',
    usernameLabel: 'User',
    usernamePlaceholder: 'postgres',
  },
  mysql: {
    uriPlaceholder: 'mysql://root:password@127.0.0.1:3306/dbstudio',
    hostLabel: 'Host',
    databaseLabel: 'Default Schema / Database',
    usernameLabel: 'User',
    usernamePlaceholder: 'root',
  },
  mariadb: {
    uriPlaceholder: 'mariadb://root:password@127.0.0.1:3307/dbstudio',
    hostLabel: 'Host',
    databaseLabel: 'Default Schema / Database',
    usernameLabel: 'User',
    usernamePlaceholder: 'root',
  },
  sqlserver: {
    uriPlaceholder: 'sqlserver://sa:password@127.0.0.1:1433/dbstudio',
    hostLabel: 'Server',
    databaseLabel: 'Database',
    usernameLabel: 'Login',
    usernamePlaceholder: 'sa',
  },
  oracle: {
    uriPlaceholder: 'oracle://dbstudio:password@127.0.0.1:1521/FREEPDB1',
    hostLabel: 'Host',
    databaseLabel: 'Service Name / SID',
    databasePlaceholder: 'FREEPDB1',
    usernameLabel: 'Username (Schema)',
    usernamePlaceholder: 'dbstudio',
  },
  clickhouse: {
    uriPlaceholder: 'clickhouse://default:password@127.0.0.1:8123/dbstudio',
    hostLabel: 'Host',
    portLabel: 'HTTP(S) Port',
    databaseLabel: 'Database',
    databasePlaceholder: 'default',
    usernamePlaceholder: 'default',
  },
  mongodb: {
    uriPlaceholder: 'mongodb://root:password@127.0.0.1:27017/dbstudio',
    hostLabel: 'Host',
    databaseLabel: 'Database',
    usernamePlaceholder: 'root',
  },
  redis: {
    uriPlaceholder: 'rediss://:password@127.0.0.1:6379/0',
    hostLabel: 'Host',
    databaseLabel: 'Database Index',
    databasePlaceholder: '0',
    usernameLabel: 'ACL Username (optional)',
    usernamePlaceholder: 'default',
    passwordLabel: 'Password / AUTH',
  },
  snowflake: {
    uriPlaceholder: 'snowflake://user:password@account.snowflakecomputing.com:443/db',
    hostLabel: 'Account Host',
    hostPlaceholder: 'org-account.snowflakecomputing.com',
    databaseLabel: 'Database',
    databasePlaceholder: 'MY_DB',
    usernamePlaceholder: 'ACCOUNTADMIN',
  },
};

export function getConnectionFieldLabels(type: DatabaseType): ConnectionFieldLabels {
  return { ...DEFAULT_LABELS, ...(LABELS_BY_TYPE[type] ?? {}) };
}
