import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS, TABLES, TableDataStatus } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const config = await request.json();
  const results: TableDataStatus[] = [];
  let connection: snowflake.Connection | null = null;

  try {
    const connectionConfig: snowflake.ConnectionOptions = {
      account: config.account,
      username: config.user,
      database: SNOWFLAKE_OBJECTS.DATABASE,
      schema: SNOWFLAKE_OBJECTS.SCHEMA,
      warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
    };

    if (config.authMethod === "pat") {
      connectionConfig.password = config.pat;
    } else if (config.authMethod === "password") {
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

    for (const table of TABLES) {
      try {
        const rows = (await executeSQL(
          `SELECT COUNT(*) as CNT FROM ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}.${table}`
        )) as { CNT: number }[];
        const count = rows[0]?.CNT || 0;
        results.push({
          table,
          rowCount: count,
          hasData: count > 0,
        });
      } catch (err) {
        results.push({
          table,
          rowCount: 0,
          hasData: false,
        });
      }
    }

    return NextResponse.json({ success: true, tables: results });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.destroy(() => {});
    }
  }
}
