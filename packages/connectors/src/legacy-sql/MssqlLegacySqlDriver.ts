import mssql, {
  type config as MssqlConfig,
  type ConnectionPool,
  type Request,
} from "mssql";

import type { LegacySqlConfig } from "./LegacySqlConfig.js";
import type {
  LegacySqlDriver,
  LegacySqlParameterValue,
  LegacySqlPool,
  LegacySqlRequest,
} from "./types/index.js";

class MssqlRequestAdapter implements LegacySqlRequest {
  constructor(private readonly requestInstance: Request) {}

  input(name: string, value: LegacySqlParameterValue): void {
    this.requestInstance.input(name, value);
  }

  async query<Row extends Record<string, unknown>>(
    sqlText: string,
  ): Promise<readonly Row[]> {
    const result = await this.requestInstance.query<Row>(sqlText);
    return result.recordset;
  }
}

class MssqlPoolAdapter implements LegacySqlPool {
  constructor(private readonly pool: ConnectionPool) {}

  request(): LegacySqlRequest {
    return new MssqlRequestAdapter(this.pool.request());
  }

  async close(): Promise<void> {
    await this.pool.close();
  }
}

/** Adapter around mssql. Constructing it performs no network operation. */
export class MssqlLegacySqlDriver implements LegacySqlDriver {
  async connect(configuration: LegacySqlConfig): Promise<LegacySqlPool> {
    const driverConfiguration: MssqlConfig = {
      server: configuration.server,
      database: configuration.database,
      user: configuration.user,
      password: configuration.password,
      connectionTimeout: configuration.connectionTimeoutMs,
      requestTimeout: configuration.requestTimeoutMs,
      options: {
        encrypt: configuration.encrypt,
        trustServerCertificate: configuration.trustServerCertificate,
      },
      pool: {
        min: 0,
        max: 5,
        idleTimeoutMillis: 30_000,
      },
    };

    const pool = new mssql.ConnectionPool(driverConfiguration);
    await pool.connect();
    return new MssqlPoolAdapter(pool);
  }
}
