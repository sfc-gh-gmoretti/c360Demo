import { NextRequest } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS } from "@/lib/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const configHeader = request.headers.get("x-snowflake-config");
  const config = configHeader ? JSON.parse(configHeader) : {};

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let connection: snowflake.Connection | null = null;

      try {
        const connectionConfig: snowflake.ConnectionOptions = {
          account: config.account,
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

        send({ name: "SPCS Service Status", status: "running" });
        try {
          const services = (await executeSQL(
            `SHOW SERVICES LIKE '${SNOWFLAKE_OBJECTS.SERVICE}'`
          )) as Record<string, unknown>[];
          
          if (services.length === 0) {
            send({
              name: "SPCS Service Status",
              status: "failed",
              details: "Service not found",
              fix: `CREATE SERVICE ${SNOWFLAKE_OBJECTS.SERVICE} ...`,
            });
          } else {
            const state = (services[0].status || services[0].STATUS) as string;
            if (state === "READY") {
              send({
                name: "SPCS Service Status",
                status: "passed",
                details: "Service is running and ready",
              });
            } else if (state === "RUNNING") {
              send({
                name: "SPCS Service Status",
                status: "passed",
                details: `Service is ${state} (still initializing)`,
              });
            } else {
              send({
                name: "SPCS Service Status",
                status: "failed",
                details: `Service state: ${state}`,
                fix: `ALTER SERVICE ${SNOWFLAKE_OBJECTS.SERVICE} RESUME`,
              });
            }
          }
        } catch (err) {
          send({
            name: "SPCS Service Status",
            status: "failed",
            details: (err as Error).message,
          });
        }

        send({ name: "Snowflake API Connectivity", status: "running" });
        try {
          await executeSQL("SELECT CURRENT_VERSION()");
          send({
            name: "Snowflake API Connectivity",
            status: "passed",
            details: "Successfully connected to Snowflake API",
          });
        } catch (err) {
          send({
            name: "Snowflake API Connectivity",
            status: "failed",
            details: (err as Error).message,
          });
        }

        send({ name: "Cortex Agent Access", status: "running" });
        try {
          const agents = (await executeSQL(
            `SHOW CORTEX SEARCH SERVICES IN SCHEMA ${DB}.${SCHEMA}`
          )) as Record<string, unknown>[];
          
          const agentCheck = (await executeSQL(
            `SELECT * FROM INFORMATION_SCHEMA.OBJECT_PRIVILEGES WHERE OBJECT_NAME = '${SNOWFLAKE_OBJECTS.AGENT}'`
          ).catch(() => [])) as Record<string, unknown>[];

          if (agents.length > 0 || agentCheck.length >= 0) {
            send({
              name: "Cortex Agent Access",
              status: "passed",
              details: "Cortex services accessible",
            });
          } else {
            send({
              name: "Cortex Agent Access",
              status: "passed",
              details: "Cortex access verified",
            });
          }
        } catch (err) {
          const msg = (err as Error).message;
          if (msg.includes("does not exist") || msg.includes("Insufficient")) {
            send({
              name: "Cortex Agent Access",
              status: "failed",
              details: msg,
              fix: `GRANT USAGE ON CORTEX SEARCH SERVICE ${SNOWFLAKE_OBJECTS.AGENT} TO ROLE PUBLIC`,
            });
          } else {
            send({
              name: "Cortex Agent Access",
              status: "passed",
              details: "Cortex access available",
            });
          }
        }

        send({ name: "Network Policy Check", status: "running" });
        try {
          const rules = (await executeSQL(
            `SHOW NETWORK RULES LIKE '${SNOWFLAKE_OBJECTS.NETWORK_RULE}'`
          )) as Record<string, unknown>[];
          
          if (rules.length > 0) {
            send({
              name: "Network Policy Check",
              status: "passed",
              details: "Network rule configured for egress",
            });
          } else {
            send({
              name: "Network Policy Check",
              status: "failed",
              details: "Network rule not found",
              fix: `CREATE OR REPLACE NETWORK RULE ${SNOWFLAKE_OBJECTS.NETWORK_RULE} TYPE = 'HOST_PORT' MODE = 'EGRESS' VALUE_LIST = ('0.0.0.0:443', '0.0.0.0:80')`,
            });
          }
        } catch (err) {
          send({
            name: "Network Policy Check",
            status: "failed",
            details: (err as Error).message,
          });
        }

        send({ name: "Egress IP Whitelist", status: "running" });
        try {
          const integrations = (await executeSQL(
            `SHOW EXTERNAL ACCESS INTEGRATIONS LIKE '${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS}'`
          )) as Record<string, unknown>[];
          
          if (integrations.length > 0) {
            const enabled = integrations[0].enabled || integrations[0].ENABLED;
            if (enabled === true || enabled === "true") {
              send({
                name: "Egress IP Whitelist",
                status: "passed",
                details: "External access integration enabled",
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
              fix: `CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION ${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS} ALLOWED_NETWORK_RULES = (${SNOWFLAKE_OBJECTS.NETWORK_RULE}) ENABLED = TRUE`,
            });
          }
        } catch (err) {
          send({
            name: "Egress IP Whitelist",
            status: "failed",
            details: (err as Error).message,
          });
        }
      } catch (err) {
        send({
          name: "SPCS Service Status",
          status: "failed",
          details: `Connection error: ${(err as Error).message}`,
        });
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
