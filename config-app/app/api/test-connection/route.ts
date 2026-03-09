import { NextRequest, NextResponse } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/snowflake";

export async function POST(request: NextRequest) {
  let connection = null;
  
  try {
    const formData = await request.formData();
    const configStr = formData.get("config") as string;
    const config = JSON.parse(configStr) as SnowflakeConfig;
    const privateKeyFile = formData.get("privateKey") as File | null;

    if (config.authMethod === "keypair" && privateKeyFile) {
      const keyContent = await privateKeyFile.text();
      config.privateKey = keyContent;
    }

    connection = await createConnection(config);

    const result = await executeSQL(
      connection,
      "SELECT CURRENT_USER() as user, CURRENT_ACCOUNT() as account, CURRENT_WAREHOUSE() as warehouse"
    );

    const row = result.rows[0] as { USER: string; ACCOUNT: string; WAREHOUSE: string } | undefined;

    return NextResponse.json({
      success: true,
      user: row?.USER || config.user,
      account: row?.ACCOUNT || config.account,
      warehouse: row?.WAREHOUSE || config.warehouse,
    });
  } catch (err) {
    const error = err as Error;
    console.error("Connection test failed:", error.message);
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
