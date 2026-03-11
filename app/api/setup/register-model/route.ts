import { NextRequest } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/setup/snowflake";
import { SNOWFLAKE_OBJECTS } from "@/lib/setup/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

export async function POST(request: NextRequest) {
  const { account, user, pat, database, schema, warehouse } = await request.json();

  const snowflakeConfig: SnowflakeConfig = {
    account,
    user,
    database: database || DB,
    schema: schema || SCHEMA,
    warehouse: warehouse || SNOWFLAKE_OBJECTS.WAREHOUSE,
    pat,
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let connection = null;

      try {
        send({ progress: "Connecting to Snowflake..." });
        connection = await createConnection(snowflakeConfig);
        send({ progress: "Connected successfully" });

        send({ progress: "Creating ML model stage..." });
        await executeSQL(connection, `CREATE STAGE IF NOT EXISTS ${DB}.${SCHEMA}.ML_MODEL_STAGE`);
        send({ progress: "Stage created" });

        send({ progress: "Creating model registration procedure..." });
        const createProcSql = `
CREATE OR REPLACE PROCEDURE ${DB}.${SCHEMA}.REGISTER_CROSS_SELL_MODEL(stage_path STRING)
RETURNS STRING
LANGUAGE PYTHON
RUNTIME_VERSION = '3.10'
PACKAGES = ('snowflake-snowpark-python', 'snowflake-ml-python', 'joblib', 'xgboost', 'scikit-learn')
HANDLER = 'register_model'
AS
$$
import joblib
import os
from snowflake.ml.registry import Registry
from snowflake.ml.model import Task

def register_model(session, stage_path):
    import pandas as pd
    
    local_path = "/tmp/cross_sell_model.joblib"
    session.file.get(stage_path, "/tmp")
    
    model = joblib.load(local_path)
    
    reg = Registry(session=session, database_name="${DB}", schema_name="${SCHEMA}")
    
    sample_input = pd.DataFrame({
        'AGE': [45.0],
        'INCOME_BRACKET_ENC': [4.0],
        'HOMEOWNER_STATUS_NUM': [1.0],
        'TOTAL_PENSION_VALUE': [150000.0],
        'TOTAL_PENSIONS': [2.0],
        'RISK_CATEGORY_ENC': [1.0],
        'RISK_SCORE': [5.0],
        'INVESTMENT_KNOWLEDGE_ENC': [2.0],
        'MARKETING_ENGAGEMENT_ENC': [1.0],
        'HAS_PENSIONS_NUM': [1.0],
        'HAS_ISA_NUM': [0.0]
    })
    
    try:
        existing = reg.get_model("CROSS_SELL_PROPENSITY")
        existing.delete()
    except:
        pass
    
    mv = reg.log_model(
        model=model,
        model_name="CROSS_SELL_PROPENSITY",
        version_name="V1",
        sample_input_data=sample_input,
        task=Task.TABULAR_BINARY_CLASSIFICATION,
        comment="XGBoost classifier predicting cross-sell propensity"
    )
    
    return f"Model registered: ${DB}.${SCHEMA}.CROSS_SELL_PROPENSITY V1"
$$`;
        await executeSQL(connection, createProcSql);
        send({ progress: "Procedure created" });

        send({ progress: "Model registration procedure is ready. Upload model file to stage and call REGISTER_CROSS_SELL_MODEL." });
        send({ 
          progress: "Setup complete!", 
          instructions: [
            `1. Upload model file: PUT file:///path/to/cross_sell_model.joblib @${DB}.${SCHEMA}.ML_MODEL_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE`,
            `2. Register model: CALL ${DB}.${SCHEMA}.REGISTER_CROSS_SELL_MODEL('@${DB}.${SCHEMA}.ML_MODEL_STAGE/cross_sell_model.joblib')`
          ]
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
