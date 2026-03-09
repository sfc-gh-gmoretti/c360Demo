import { NextRequest, NextResponse } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/setup/snowflake";
import { SNOWFLAKE_OBJECTS, TABLES, TableDataStatus } from "@/lib/setup/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const { account, user, pat } = await request.json();

  const snowflakeConfig: SnowflakeConfig = {
    account,
    user,
    database: DB,
    schema: SCHEMA,
    warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
    pat,
  };

  let connection = null;

  try {
    connection = await createConnection(snowflakeConfig);

    const tableStatuses: TableDataStatus[] = [];

    for (const table of TABLES) {
      try {
        const { rows } = await executeSQL(
          connection,
          `SELECT COUNT(*) as CNT FROM ${DB}.${SCHEMA}.${table}`
        );
        const rowCount = (rows[0] as { CNT: number })?.CNT || 0;
        tableStatuses.push({
          table,
          rowCount,
          hasData: rowCount > 0,
        });
      } catch {
        tableStatuses.push({
          table,
          rowCount: 0,
          hasData: false,
        });
      }
    }

    return NextResponse.json({ success: true, tables: tableStatuses });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await destroyConnection(connection);
    }
  }
}
