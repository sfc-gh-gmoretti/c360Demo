import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS, ObjectStatus } from "@/lib/setup/constants";

export async function POST(request: NextRequest) {
  const config = await request.json();

  const results: ObjectStatus[] = [];
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

    const checkObject = async (
      name: string,
      type: ObjectStatus["type"],
      sql: string
    ): Promise<ObjectStatus> => {
      try {
        const rows = await executeSQL(sql);
        return { name, type, exists: rows.length > 0 };
      } catch (err) {
        return { name, type, exists: false, error: (err as Error).message };
      }
    };

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.DATABASE,
        "database",
        `SHOW DATABASES LIKE '${SNOWFLAKE_OBJECTS.DATABASE}'`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.SCHEMA,
        "schema",
        `SHOW SCHEMAS LIKE '${SNOWFLAKE_OBJECTS.SCHEMA}' IN DATABASE ${SNOWFLAKE_OBJECTS.DATABASE}`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.WAREHOUSE,
        "warehouse",
        `SHOW WAREHOUSES LIKE '${SNOWFLAKE_OBJECTS.WAREHOUSE}'`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.WEBAPP_POOL,
        "compute_pool",
        `SHOW COMPUTE POOLS LIKE '${SNOWFLAKE_OBJECTS.WEBAPP_POOL}'`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.ML_POOL,
        "compute_pool",
        `SHOW COMPUTE POOLS LIKE '${SNOWFLAKE_OBJECTS.ML_POOL}'`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY,
        "image_repository",
        `SHOW IMAGE REPOSITORIES LIKE '${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY}' IN SCHEMA ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.SEMANTIC_VIEW,
        "semantic_view",
        `SHOW SEMANTIC VIEWS LIKE '${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW}' IN SCHEMA ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.AGENT,
        "agent",
        `SHOW AGENTS LIKE '${SNOWFLAKE_OBJECTS.AGENT}' IN SCHEMA ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.NETWORK_RULE,
        "network_rule",
        `SHOW NETWORK RULES LIKE '${SNOWFLAKE_OBJECTS.NETWORK_RULE}' IN SCHEMA ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS,
        "external_access",
        `SHOW EXTERNAL ACCESS INTEGRATIONS LIKE '${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS}'`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.ML_MODEL_STAGE,
        "stage",
        `SHOW STAGES LIKE '${SNOWFLAKE_OBJECTS.ML_MODEL_STAGE}' IN SCHEMA ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}`
      )
    );

    results.push(
      await checkObject(
        SNOWFLAKE_OBJECTS.ML_MODEL,
        "ml_model",
        `SHOW MODELS LIKE '${SNOWFLAKE_OBJECTS.ML_MODEL}' IN SCHEMA ${SNOWFLAKE_OBJECTS.DATABASE}.${SNOWFLAKE_OBJECTS.SCHEMA}`
      )
    );

    return NextResponse.json({ success: true, objects: results });
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
