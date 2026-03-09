import snowflake from "snowflake-sdk";

export interface SnowflakeConfig {
  account: string;
  user: string;
  database?: string;
  schema?: string;
  warehouse?: string;
  authMethod: "keypair" | "password" | "pat";
  password?: string;
  privateKey?: string;
  pat?: string;
}

export function createConnection(config: SnowflakeConfig): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    const connectionConfig: snowflake.ConnectionOptions = {
      account: config.account,
      username: config.user,
      database: config.database,
      schema: config.schema,
      warehouse: config.warehouse,
    };

    if (config.authMethod === "password" && config.password) {
      connectionConfig.password = config.password;
    } else if (config.authMethod === "keypair" && config.privateKey) {
      connectionConfig.authenticator = "SNOWFLAKE_JWT";
      connectionConfig.privateKey = config.privateKey;
    } else if (config.authMethod === "pat" && config.pat) {
      connectionConfig.password = config.pat;
    }

    const connection = snowflake.createConnection(connectionConfig);

    connection.connect((err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
}

export function executeSQL(
  connection: snowflake.Connection,
  sql: string
): Promise<{ rows: unknown[]; statement: string }> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve({ rows: rows || [], statement: stmt?.getSqlText() || sql });
        }
      },
    });
  });
}

export function destroyConnection(connection: snowflake.Connection): Promise<void> {
  return new Promise((resolve) => {
    connection.destroy((err) => {
      resolve();
    });
  });
}
