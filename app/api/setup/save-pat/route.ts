import { NextRequest, NextResponse } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/setup/snowflake";
import { SNOWFLAKE_OBJECTS } from "@/lib/setup/constants";

export async function POST(request: NextRequest) {
  let connection = null;
  
  try {
    const body = await request.json();
    const { account, user, pat } = body;

    if (!account || !user || !pat) {
      return NextResponse.json(
        { success: false, error: "Account, user, and PAT are required" },
        { status: 400 }
      );
    }

    const config: SnowflakeConfig = {
      account,
      user,
      pat,
      database: SNOWFLAKE_OBJECTS.DATABASE,
      schema: SNOWFLAKE_OBJECTS.SCHEMA,
      warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
    };

    connection = await createConnection(config);

    const createSecretSQL = `
      CREATE OR REPLACE SECRET ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}.${SNOWFLAKE_OBJECTS.PAT_SECRET}
        TYPE = GENERIC_STRING
        SECRET_STRING = '${pat.replace(/'/g, "''")}';
    `;

    await executeSQL(connection, createSecretSQL);

    const grantSQL = `
      GRANT READ ON SECRET ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}.${SNOWFLAKE_OBJECTS.PAT_SECRET}
        TO APPLICATION ROLE IF EXISTS C360_ROLE;
    `;

    try {
      await executeSQL(connection, grantSQL);
    } catch {
      // Role may not exist yet, ignore
    }

    return NextResponse.json({
      success: true,
      message: "PAT stored securely as Snowflake Secret",
      secretName: `${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}.${SNOWFLAKE_OBJECTS.PAT_SECRET}`,
    });
  } catch (err) {
    const error = err as Error;
    console.error("Failed to store PAT:", error.message);
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
