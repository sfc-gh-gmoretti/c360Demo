import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS } from "@/lib/setup/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const configHeader = request.headers.get("x-snowflake-config");
  const config = configHeader ? JSON.parse(configHeader) : {};

  let connection: snowflake.Connection | null = null;

  try {
    const account = config.account?.toLowerCase().replace(/_/g, "-");
    const connectionConfig: snowflake.ConnectionOptions = {
      account: account,
      username: config.user,
      database: DB,
      schema: SCHEMA,
      warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
    };

    if (config.pat) {
      connectionConfig.authenticator = "PROGRAMMATIC_ACCESS_TOKEN";
      connectionConfig.token = config.pat;
    } else if (config.password) {
      connectionConfig.password = config.password;
    }

    connection = snowflake.createConnection(connectionConfig);

    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const executeSQL = (sql: string): Promise<unknown[]> => {
      return new Promise((resolve, reject) => {
        connection!.execute({
          sqlText: sql,
          complete: (err, _stmt, rows) => {
            if (err) reject(err);
            else resolve((rows || []) as unknown[]);
          },
        });
      });
    };

    await executeSQL(`USE WAREHOUSE ${SNOWFLAKE_OBJECTS.WAREHOUSE}`);

    const result = await executeSQL(
      `SHOW ENDPOINTS IN SERVICE ${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.SERVICE}`
    ) as Array<Record<string, unknown>>;

    if (result.length > 0) {
      const endpoint = result[0];
      const ingressUrl = endpoint["ingress_url"] as string;
      if (ingressUrl) {
        return NextResponse.json({ url: `https://${ingressUrl}` });
      }
    }

    return NextResponse.json({ error: "No endpoint URL found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.destroy(() => {});
    }
  }
}
