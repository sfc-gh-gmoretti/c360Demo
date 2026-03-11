import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const config = await request.json();
  let connection: snowflake.Connection | null = null;
  
  try {
    const connectionConfig: snowflake.ConnectionOptions = {
      account: config.account,
      username: config.user,
    };

    if (config.pat) {
      connectionConfig.authenticator = "PROGRAMMATIC_ACCESS_TOKEN";
      connectionConfig.token = config.pat;
    }

    connection = snowflake.createConnection(connectionConfig);

    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const executeSQL = (sql: string): Promise<Record<string, unknown>[]> => {
      return new Promise((resolve, reject) => {
        connection!.execute({
          sqlText: sql,
          complete: (err, _stmt, rows) => {
            if (err) reject(err);
            else resolve((rows || []) as Record<string, unknown>[]);
          },
        });
      });
    };
    
    const result = await executeSQL(
      `SHOW IMAGES IN IMAGE REPOSITORY ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}.${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY}`
    );

    const images = result
      .filter((row) => row.image_name === "c360-app")
      .map((row) => ({
        tag: row.tags as string,
        createdOn: row.created_on as string,
        digest: ((row.digest as string) || "").substring(0, 20) + "...",
      }))
      .sort((a, b) => 
        new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()
      );

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error listing images:", error);
    return NextResponse.json({ images: [], error: String(error) });
  } finally {
    if (connection) {
      connection.destroy(() => {});
    }
  }
}
