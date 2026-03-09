import { NextRequest } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS } from "@/lib/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const sfConfigStr = request.headers.get("x-snowflake-config");
  let sfConfig: { account: string; user: string; password?: string; pat?: string; authMethod: string } | null = null;

  if (sfConfigStr) {
    try {
      sfConfig = JSON.parse(sfConfigStr);
    } catch {}
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      if (!sfConfig) {
        send({ name: "SPCS Service Status", status: "failed", details: "No Snowflake configuration found" });
        send({ name: "Snowflake API Connectivity", status: "failed", details: "No Snowflake configuration found" });
        send({ name: "Cortex Agent Access", status: "failed", details: "No Snowflake configuration found" });
        send({ name: "Network Policy Check", status: "failed", details: "No Snowflake configuration found" });
        send({ name: "Egress IP Whitelist", status: "failed", details: "No Snowflake configuration found" });
        controller.close();
        return;
      }

      let connection: snowflake.Connection | null = null;

      try {
        const connectionConfig: snowflake.ConnectionOptions = {
          account: sfConfig.account,
          username: sfConfig.user,
          database: DB,
          schema: SCHEMA,
          warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
        };

        if (sfConfig.authMethod === "pat") {
          connectionConfig.password = sfConfig.pat;
        } else if (sfConfig.authMethod === "password") {
          connectionConfig.password = sfConfig.password;
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

        await executeSQL(`USE WAREHOUSE ${SNOWFLAKE_OBJECTS.WAREHOUSE}`);

        send({ name: "SPCS Service Status", status: "running" });
        try {
          const services = await executeSQL(`SHOW SERVICES LIKE '${SNOWFLAKE_OBJECTS.SERVICE}'`);
          if (services.length > 0) {
            const status = (services[0].status || services[0].STATUS) as string;
            if (status === "READY") {
              send({ name: "SPCS Service Status", status: "passed", details: `Service is ${status}` });
            } else if (status === "RUNNING") {
              send({ name: "SPCS Service Status", status: "passed", details: `Service is ${status} (still starting)` });
            } else {
              send({ name: "SPCS Service Status", status: "failed", details: `Service status: ${status}` });
            }
          } else {
            send({
              name: "SPCS Service Status",
              status: "failed",
              details: "Service not found",
              fix: `CREATE SERVICE ${SNOWFLAKE_OBJECTS.SERVICE} ...`,
            });
          }
        } catch (err) {
          send({ name: "SPCS Service Status", status: "failed", details: (err as Error).message });
        }

        send({ name: "Snowflake API Connectivity", status: "running" });
        try {
          const result = await executeSQL("SELECT CURRENT_ACCOUNT(), CURRENT_USER(), CURRENT_ROLE()");
          if (result.length > 0) {
            send({
              name: "Snowflake API Connectivity",
              status: "passed",
              details: `Connected as ${result[0]["CURRENT_USER()"]} with role ${result[0]["CURRENT_ROLE()"]}`,
            });
          }
        } catch (err) {
          send({ name: "Snowflake API Connectivity", status: "failed", details: (err as Error).message });
        }

        send({ name: "Cortex Agent Access", status: "running" });
        try {
          const agents = await executeSQL(`SHOW AGENTS LIKE '${SNOWFLAKE_OBJECTS.AGENT}' IN SCHEMA ${DB}.${SCHEMA}`);
          const semanticViews = await executeSQL(`SHOW SEMANTIC VIEWS LIKE '${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW}' IN SCHEMA ${DB}.${SCHEMA}`);
          
          if (agents.length > 0 && semanticViews.length > 0) {
            send({
              name: "Cortex Agent Access",
              status: "passed",
              details: `Agent ${SNOWFLAKE_OBJECTS.AGENT} and semantic view ${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW} found`,
            });
          } else if (agents.length > 0) {
            send({
              name: "Cortex Agent Access",
              status: "passed",
              details: `Agent ${SNOWFLAKE_OBJECTS.AGENT} found`,
            });
          } else if (semanticViews.length > 0) {
            send({
              name: "Cortex Agent Access",
              status: "passed",
              details: `Semantic view ${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW} found`,
            });
          } else {
            send({
              name: "Cortex Agent Access",
              status: "failed",
              details: "No Cortex agent or semantic view found",
            });
          }
        } catch (err) {
          send({ name: "Cortex Agent Access", status: "failed", details: (err as Error).message });
        }

        send({ name: "Network Policy Check", status: "running" });
        try {
          const rules = await executeSQL(`SHOW NETWORK RULES LIKE '${SNOWFLAKE_OBJECTS.NETWORK_RULE}'`);
          if (rules.length > 0) {
            send({
              name: "Network Policy Check",
              status: "passed",
              details: `Network rule ${SNOWFLAKE_OBJECTS.NETWORK_RULE} exists`,
            });
          } else {
            send({
              name: "Network Policy Check",
              status: "failed",
              details: "Network rule not found",
              fix: `CREATE NETWORK RULE ${SNOWFLAKE_OBJECTS.NETWORK_RULE} TYPE='HOST_PORT' MODE='EGRESS' VALUE_LIST=('0.0.0.0:443','0.0.0.0:80')`,
            });
          }
        } catch (err) {
          send({ name: "Network Policy Check", status: "failed", details: (err as Error).message });
        }

        send({ name: "Egress IP Whitelist", status: "running" });
        try {
          const eai = await executeSQL(`SHOW EXTERNAL ACCESS INTEGRATIONS LIKE '${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS}'`);
          if (eai.length > 0) {
            const enabled = eai[0].enabled || eai[0].ENABLED;
            if (enabled) {
              send({
                name: "Egress IP Whitelist",
                status: "passed",
                details: `External access integration ${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS} is enabled`,
              });
            } else {
              send({
                name: "Egress IP Whitelist",
                status: "failed",
                details: "External access integration is disabled",
                fix: `ALTER EXTERNAL ACCESS INTEGRATION ${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS} SET ENABLED = TRUE`,
              });
            }
          } else {
            send({
              name: "Egress IP Whitelist",
              status: "failed",
              details: "External access integration not found",
              fix: `CREATE EXTERNAL ACCESS INTEGRATION ${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS} ALLOWED_NETWORK_RULES=(${SNOWFLAKE_OBJECTS.NETWORK_RULE}) ENABLED=TRUE`,
            });
          }
        } catch (err) {
          send({ name: "Egress IP Whitelist", status: "failed", details: (err as Error).message });
        }
      } catch (err) {
        send({ name: "SPCS Service Status", status: "failed", details: `Connection error: ${(err as Error).message}` });
        send({ name: "Snowflake API Connectivity", status: "failed", details: `Connection error: ${(err as Error).message}` });
        send({ name: "Cortex Agent Access", status: "failed", details: "Could not connect" });
        send({ name: "Network Policy Check", status: "failed", details: "Could not connect" });
        send({ name: "Egress IP Whitelist", status: "failed", details: "Could not connect" });
      } finally {
        if (connection) {
          connection.destroy(() => {});
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
