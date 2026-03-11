import { NextRequest } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/snowflake";
import { getConfig } from "@/lib/config-store";
import { SNOWFLAKE_OBJECTS } from "@/lib/constants";
import fs from "fs";
import path from "path";
import snowflake from "snowflake-sdk";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const requestConfig = await request.json();

  const savedConfig = getConfig();
  const snowflakeConfig: SnowflakeConfig = {
    account: requestConfig.account || savedConfig?.snowflake?.account || "",
    user: requestConfig.user || savedConfig?.snowflake?.user || "",
    database: DB,
    schema: SCHEMA,
    warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
    pat: requestConfig.pat || savedConfig?.snowflake?.pat,
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let connection: snowflake.Connection | null = null;

      try {
        const modelPath = "/app/model/cross_sell_model.joblib";
        const localModelPath = path.join(process.cwd(), "model", "cross_sell_model.joblib");
        
        const actualPath = fs.existsSync(modelPath) ? modelPath : 
                          fs.existsSync(localModelPath) ? localModelPath : null;
        
        if (!actualPath) {
          send({ error: "Model file not found. Expected at /app/model/cross_sell_model.joblib or ./model/cross_sell_model.joblib" });
          controller.close();
          return;
        }

        send({ progress: `Found model file at ${actualPath}` });
        
        const modelData = fs.readFileSync(actualPath);
        const modelBase64 = modelData.toString("base64");
        send({ progress: `Model file loaded (${Math.round(modelData.length / 1024)} KB)` });
        
        send({ progress: "Connecting to Snowflake..." });
        connection = await createConnection(snowflakeConfig);
        send({ progress: "Connected successfully" });

        send({ progress: "Creating upload procedure..." });
        await executeSQL(connection, `
CREATE OR REPLACE PROCEDURE ${DB}.${SCHEMA}.UPLOAD_MODEL_BASE64(MODEL_DATA STRING)
RETURNS STRING
LANGUAGE PYTHON
RUNTIME_VERSION = '3.10'
PACKAGES = ('snowflake-snowpark-python')
HANDLER = 'upload_model'
AS
$$
import base64
import os

def upload_model(session, model_data: str) -> str:
    model_bytes = base64.b64decode(model_data)
    
    local_path = "/tmp/cross_sell_model.joblib"
    with open(local_path, "wb") as f:
        f.write(model_bytes)
    
    session.file.put(local_path, "@${DB}.${SCHEMA}.ML_MODEL_STAGE", auto_compress=False, overwrite=True)
    
    return f"Uploaded {len(model_bytes)} bytes to stage"
$$`);
        send({ progress: "Upload procedure created" });

        send({ progress: "Uploading model to stage via procedure..." });
        const uploadResult = await executeSQL(connection, `CALL ${DB}.${SCHEMA}.UPLOAD_MODEL_BASE64('${modelBase64}')`);
        send({ progress: `Upload complete: ${JSON.stringify(uploadResult)}` });

        send({ progress: "Registering model in ML Registry (this may take a minute)..." });
        await executeSQL(connection, `CALL ${DB}.${SCHEMA}.REGISTER_CROSS_SELL_MODEL('@${DB}.${SCHEMA}.ML_MODEL_STAGE/cross_sell_model.joblib')`);
        send({ progress: "Model registered successfully!" });

        send({ 
          progress: "ML Model deployment complete!", 
          model: `${DB}.${SCHEMA}.CROSS_SELL_PROPENSITY V1`
        });
      } catch (err) {
        const error = err as Error;
        send({ error: error.message });
      } finally {
        if (connection) {
          await destroyConnection(connection);
        }
        controller.close();
      }
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
