import { NextRequest } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS, COMPUTE_POOL_CONFIG, getImagePath } from "@/lib/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const config = await request.json();
  const action = config.action || "prepare";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const log = (message: string, type: "info" | "success" | "error" = "info") => {
        send({ log: { message, type } });
      };

      let connection: snowflake.Connection | null = null;

      try {
        log("Connecting to Snowflake...");

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
        log("Connected to Snowflake", "success");

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

        if (action === "prepare") {
          send({ stage: "building" });

          log(`Creating compute pool: ${SNOWFLAKE_OBJECTS.WEBAPP_POOL}...`);
          try {
            await executeSQL(`
              CREATE COMPUTE POOL IF NOT EXISTS ${SNOWFLAKE_OBJECTS.WEBAPP_POOL}
              MIN_NODES = ${COMPUTE_POOL_CONFIG.MIN_NODES}
              MAX_NODES = ${COMPUTE_POOL_CONFIG.MAX_NODES}
              INSTANCE_FAMILY = ${COMPUTE_POOL_CONFIG.INSTANCE_FAMILY}
              AUTO_RESUME = TRUE
              AUTO_SUSPEND_SECS = ${COMPUTE_POOL_CONFIG.AUTO_SUSPEND_SECS}
            `);
            log(`Compute pool ${SNOWFLAKE_OBJECTS.WEBAPP_POOL} ready`, "success");
          } catch (err) {
            const errorMsg = (err as Error).message;
            if (errorMsg.includes("already exists")) {
              log(`Compute pool ${SNOWFLAKE_OBJECTS.WEBAPP_POOL} already exists`, "info");
            } else {
              throw err;
            }
          }

          log(`Creating ML compute pool: ${SNOWFLAKE_OBJECTS.ML_POOL}...`);
          try {
            await executeSQL(`
              CREATE COMPUTE POOL IF NOT EXISTS ${SNOWFLAKE_OBJECTS.ML_POOL}
              MIN_NODES = ${COMPUTE_POOL_CONFIG.MIN_NODES}
              MAX_NODES = ${COMPUTE_POOL_CONFIG.MAX_NODES}
              INSTANCE_FAMILY = ${COMPUTE_POOL_CONFIG.INSTANCE_FAMILY}
              AUTO_RESUME = TRUE
              AUTO_SUSPEND_SECS = ${COMPUTE_POOL_CONFIG.AUTO_SUSPEND_SECS}
            `);
            log(`Compute pool ${SNOWFLAKE_OBJECTS.ML_POOL} ready`, "success");
          } catch (err) {
            const errorMsg = (err as Error).message;
            if (errorMsg.includes("already exists")) {
              log(`Compute pool ${SNOWFLAKE_OBJECTS.ML_POOL} already exists`, "info");
            } else {
              throw err;
            }
          }

          send({ stage: "pushing" });
          log("Creating image repository...");
          await executeSQL(`CREATE IMAGE REPOSITORY IF NOT EXISTS ${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY}`);
          log("Image repository ready", "success");

          const repoUrl = `${config.account.toLowerCase().replace(/_/g, "-")}.registry.snowflakecomputing.com/${DB.toLowerCase()}/${SCHEMA.toLowerCase()}/${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY.toLowerCase()}`;
          send({ repoUrl });

          send({ stage: "deploying" });
          log("Creating network rule for external access...");
          await executeSQL(`
            CREATE OR REPLACE NETWORK RULE ${SNOWFLAKE_OBJECTS.NETWORK_RULE}
            TYPE = 'HOST_PORT'
            MODE = 'EGRESS'
            VALUE_LIST = ('0.0.0.0:443', '0.0.0.0:80')
          `);
          log("Network rule created", "success");

          log("Creating external access integration...");
          try {
            await executeSQL(`
              CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION ${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS}
              ALLOWED_NETWORK_RULES = (${SNOWFLAKE_OBJECTS.NETWORK_RULE})
              ENABLED = TRUE
            `);
            log("External access integration created", "success");
          } catch (err) {
            log(`External access: ${(err as Error).message}`, "info");
          }

          send({ stage: "complete" });
          log("", "success");
          log("Infrastructure ready! Now push your Docker image:", "success");
          log(`  1. docker login ${repoUrl}`, "info");
          log(`  2. docker tag c360-app:latest ${repoUrl}/c360-app:${config.imageTag}`, "info");
          log(`  3. docker push ${repoUrl}/c360-app:${config.imageTag}`, "info");
          log("", "info");
          log("Then click 'Start Service' to deploy.", "info");
          send({ infrastructureReady: true });
        } else if (action === "start-service") {
          send({ stage: "deploying" });
          log(`Creating SPCS service on pool ${SNOWFLAKE_OBJECTS.WEBAPP_POOL}...`);

          const serviceName = SNOWFLAKE_OBJECTS.SERVICE;

          try {
            await executeSQL(`DROP SERVICE IF EXISTS ${serviceName}`);
          } catch {
            // Ignore
          }

          const imagePath = getImagePath(config.imageTag || "latest");

          const snowflakeHost = `${config.account.toLowerCase().replace(/_/g, "-")}.snowflakecomputing.com`;
          const agentName = `${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.AGENT}`;
          const serviceSpec = {
            spec: {
              containers: [
                {
                  name: "c360-app",
                  image: imagePath,
                  env: {
                    SNOWFLAKE_HOST: snowflakeHost,
                    SNOWFLAKE_ACCOUNT: config.account,
                    SNOWFLAKE_DATABASE: DB,
                    SNOWFLAKE_SCHEMA: SCHEMA,
                    SNOWFLAKE_WAREHOUSE: SNOWFLAKE_OBJECTS.WAREHOUSE,
                    CORTEX_AGENT_NAME: agentName,
                  },
                },
              ],
              endpoints: [
                {
                  name: "app",
                  port: 3000,
                  public: true,
                },
              ],
            },
          };

          await executeSQL(`
            CREATE SERVICE ${serviceName}
            IN COMPUTE POOL ${SNOWFLAKE_OBJECTS.WEBAPP_POOL}
            FROM SPECIFICATION '${JSON.stringify(serviceSpec)}'
            EXTERNAL_ACCESS_INTEGRATIONS = (${SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS})
          `);
          log(`Service ${serviceName} created`, "success");

          log("Waiting for service to start...");
          let retries = 0;
          let serviceReady = false;
          let serviceUrl = "";

          while (retries < 30 && !serviceReady) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              const status = (await executeSQL(
                `SHOW SERVICES LIKE '${serviceName}'`
              )) as Record<string, unknown>[];
              if (status.length > 0) {
                const svc = status[0];
                const state = (svc.status || svc.STATUS) as string;
                log(`Service status: ${state}`);
                if (state === "READY") {
                  serviceReady = true;
                  const endpoints = (await executeSQL(
                    `SHOW ENDPOINTS IN SERVICE ${serviceName}`
                  )) as Record<string, unknown>[];
                  if (endpoints.length > 0) {
                    serviceUrl = (endpoints[0].ingress_url || endpoints[0].INGRESS_URL) as string;
                  }
                } else if (state === "FAILED") {
                  const logs = (await executeSQL(
                    `CALL SYSTEM$GET_SERVICE_LOGS('${serviceName}', '0', 'c360-app', 100)`
                  )) as Record<string, unknown>[];
                  if (logs.length > 0) {
                    log(`Service logs: ${JSON.stringify(logs[0])}`, "error");
                  }
                  throw new Error("Service failed to start");
                }
              }
            } catch (err) {
              if ((err as Error).message.includes("failed")) throw err;
              log(`Checking status...`);
            }
            retries++;
          }

          send({ stage: "complete" });
          if (serviceUrl) {
            send({ url: `https://${serviceUrl}` });
            log(`Service available at: https://${serviceUrl}`, "success");
          } else {
            log("Service created but still starting...", "info");
            log(`Check status with: SHOW SERVICES LIKE '${SNOWFLAKE_OBJECTS.SERVICE}'`, "info");
          }
          log("Deployment complete!", "success");
        }
      } catch (err) {
        log(`Error: ${(err as Error).message}`, "error");
        send({ stage: "idle" });
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
