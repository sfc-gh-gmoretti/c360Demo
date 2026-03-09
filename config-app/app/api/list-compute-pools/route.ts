import { NextRequest, NextResponse } from "next/server";
import snowflake from "snowflake-sdk";

export async function POST(request: NextRequest) {
  const { account, user, password, database, schema, warehouse } = await request.json();

  let connection: snowflake.Connection | null = null;

  try {
    connection = snowflake.createConnection({
      account,
      username: user,
      password,
      database,
      schema,
      warehouse,
    });

    await new Promise<void>((resolve, reject) => {
      connection!.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const executeSQL = <T>(sql: string): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        connection!.execute({
          sqlText: sql,
          complete: (err, _stmt, rows) => {
            if (err) reject(err);
            else resolve((rows || []) as T[]);
          },
        });
      });
    };

    await executeSQL(`USE WAREHOUSE ${warehouse}`);

    const pools = await executeSQL<{ name: string; state: string; instance_family: string; min_nodes: number; max_nodes: number }>(
      `SHOW COMPUTE POOLS`
    );

    const computePools = pools.map((pool: Record<string, unknown>) => ({
      name: pool.name || pool.NAME,
      state: pool.state || pool.STATE,
      instanceFamily: pool.instance_family || pool.INSTANCE_FAMILY,
      minNodes: pool.min_nodes || pool.MIN_NODES,
      maxNodes: pool.max_nodes || pool.MAX_NODES,
    }));

    return NextResponse.json({ computePools });
  } catch (error) {
    console.error("Error listing compute pools:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list compute pools" },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.destroy(() => {});
    }
  }
}
