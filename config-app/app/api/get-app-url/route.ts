import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const sfConfigStr = request.headers.get("x-snowflake-config");
  let sfConfig: { account: string; user: string; password?: string; pat?: string; authMethod: string } | null = null;

  if (sfConfigStr) {
    try {
      sfConfig = JSON.parse(sfConfigStr);
    } catch {}
  }

  if (!sfConfig) {
    return NextResponse.json({ error: "No Snowflake configuration found" }, { status: 400 });
  }

  let connection: snowflake.Connection | null = null;

  try {
    const connectionConfig: snowflake.ConnectionOptions = {
      account: sfConfig.account,
      username: sfConfig.user,
      database: SNOWFLAKE_OBJECTS.DATABASE,
      schema: SNOWFLAKE_OBJECTS.SCHEMA,
      warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
    };

    if (sfConfig.authMethod === "pat") {
      connectionConfig.password = sfConfig.pat;
    } else if (sfConfig.authMethod === "password") {
      connectionConfig.password = sfConfig.password;
    }

    connection = snowflake.createConnection(connectionConfig);
    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => (err ? reject(err) : resolve()));
    });

    const executeSQL = (sql: string): Promise<Record<string, unknown>[]> => {
      return new Promise((resolve, reject) => {
        connection!.execute({
          sqlText: sql,
          complete: (err, _stmt, rows) => (err ? reject(err) : resolve(rows || [])),
        });
      });
    };

    const serviceName = `${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}.${SNOWFLAKE_OBJECTS.SERVICE}`;
    const endpoints = await executeSQL(`SHOW ENDPOINTS IN SERVICE ${serviceName}`) as Record<string, unknown>[];
    
    if (endpoints.length > 0) {
      const ingressUrl = (endpoints[0].ingress_url || endpoints[0].INGRESS_URL) as string;
      if (ingressUrl) {
        return NextResponse.json({ url: `https://${ingressUrl}` });
      }
    }

    return NextResponse.json({ error: "No endpoint URL found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    if (connection) {
      connection.destroy(() => {});
    }
  }
}
