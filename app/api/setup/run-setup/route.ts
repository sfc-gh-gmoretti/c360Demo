import { NextRequest } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/setup/snowflake";
import { getConfig } from "@/lib/setup/config-store";
import { SNOWFLAKE_OBJECTS, COMPUTE_POOL_CONFIG } from "@/lib/setup/constants";

interface SetupStep {
  name: string;
  sql: () => string;
}

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

const SETUP_STEPS: SetupStep[] = [
  {
    name: "Create Database",
    sql: () => `CREATE DATABASE IF NOT EXISTS ${DB}`,
  },
  {
    name: "Create Schema",
    sql: () => `CREATE SCHEMA IF NOT EXISTS ${DB}.${SCHEMA}`,
  },
  {
    name: "Create Warehouse",
    sql: () => `CREATE WAREHOUSE IF NOT EXISTS ${SNOWFLAKE_OBJECTS.WAREHOUSE} 
      WAREHOUSE_SIZE = 'XSMALL' 
      AUTO_SUSPEND = 60 
      AUTO_RESUME = TRUE`,
  },
  {
    name: "Create Web App Compute Pool",
    sql: () => `CREATE COMPUTE POOL IF NOT EXISTS ${SNOWFLAKE_OBJECTS.WEBAPP_POOL}
      MIN_NODES = ${COMPUTE_POOL_CONFIG.MIN_NODES}
      MAX_NODES = ${COMPUTE_POOL_CONFIG.MAX_NODES}
      INSTANCE_FAMILY = ${COMPUTE_POOL_CONFIG.INSTANCE_FAMILY}
      AUTO_RESUME = TRUE
      AUTO_SUSPEND_SECS = ${COMPUTE_POOL_CONFIG.AUTO_SUSPEND_SECS}`,
  },
  {
    name: "Create ML Compute Pool",
    sql: () => `CREATE COMPUTE POOL IF NOT EXISTS ${SNOWFLAKE_OBJECTS.ML_POOL}
      MIN_NODES = ${COMPUTE_POOL_CONFIG.MIN_NODES}
      MAX_NODES = ${COMPUTE_POOL_CONFIG.MAX_NODES}
      INSTANCE_FAMILY = ${COMPUTE_POOL_CONFIG.INSTANCE_FAMILY}
      AUTO_RESUME = TRUE
      AUTO_SUSPEND_SECS = ${COMPUTE_POOL_CONFIG.AUTO_SUSPEND_SECS}`,
  },
  {
    name: "Create Image Repository",
    sql: () => `CREATE IMAGE REPOSITORY IF NOT EXISTS ${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY}`,
  },
  {
    name: "Create CUSTOMER_DEMOGRAPHICS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_DEMOGRAPHICS (
        CUSTOMER_ID NUMBER PRIMARY KEY,
        AGE NUMBER,
        AGE_GROUP VARCHAR(20),
        GENDER VARCHAR(30),
        INCOME_BRACKET VARCHAR(30),
        TOTAL_PENSION_VALUE NUMBER(15,2),
        HOMEOWNER_STATUS VARCHAR(30),
        REGION VARCHAR(50)
      )`,
  },
  {
    name: "Create CUSTOMER_PENSION_DETAILS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_PENSION_DETAILS (
        CUSTOMER_ID NUMBER,
        PENSION_TYPE VARCHAR(50),
        FUND_VALUE NUMBER(15,2),
        ANNUAL_CONTRIBUTION NUMBER(15,2)
      )`,
  },
  {
    name: "Create CUSTOMER_COMMUNICATION",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_COMMUNICATION (
        CUSTOMER_ID NUMBER,
        PREFERRED_CHANNEL VARCHAR(30),
        CONSENT_TO_EMAIL BOOLEAN,
        CONSENT_TO_PHONE BOOLEAN,
        CONSENT_TO_SMS BOOLEAN
      )`,
  },
  {
    name: "Create CUSTOMER_INTERACTION_AND_LEADS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_INTERACTION_AND_LEADS (
        CUSTOMER_ID NUMBER,
        MARKETING_CHANNEL VARCHAR(50),
        CAMPAIGN_RESPONSE VARCHAR(20),
        LEAD_CONVERTED BOOLEAN,
        MARKETING_ENGAGEMENT VARCHAR(30)
      )`,
  },
  {
    name: "Create CUSTOMER_PRODUCTS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_PRODUCTS (
        CUSTOMER_ID NUMBER,
        HAS_ISA BOOLEAN,
        HAS_PENSION BOOLEAN,
        HAS_PROTECTION_POLICY BOOLEAN,
        IS_MULTI_PRODUCT BOOLEAN
      )`,
  },
  {
    name: "Create CUSTOMER_MINDSET",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_MINDSET (
        CUSTOMER_ID NUMBER,
        RISK_CATEGORY VARCHAR(20),
        RISK_SCORE NUMBER(5,2),
        ESG_PREFERENCE VARCHAR(30),
        INVESTMENT_KNOWLEDGE VARCHAR(30)
      )`,
  },
  {
    name: "Create CWE_DATA",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CWE_DATA (
        CUSTOMER_ID NUMBER,
        TOTAL_TOUCHPOINTS NUMBER,
        TOTAL_CALLS NUMBER,
        SERVICE_QUALITY_INDICATOR VARCHAR(20)
      )`,
  },
  {
    name: "Create Network Rule",
    sql: () => `
      CREATE NETWORK RULE IF NOT EXISTS ${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.NETWORK_RULE}
        MODE = EGRESS
        TYPE = HOST_PORT
        VALUE_LIST = ('0.0.0.0:443', '0.0.0.0:80')`,
  },
  {
    name: "Create Semantic View",
    sql: () => `
      CREATE OR REPLACE SEMANTIC VIEW ${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW}
        TABLES (
          demographics AS ${DB}.${SCHEMA}.CUSTOMER_DEMOGRAPHICS
            PRIMARY KEY (CUSTOMER_ID)
            WITH SYNONYMS = ('customers', 'customer info', 'customer data'),
          pension AS ${DB}.${SCHEMA}.CUSTOMER_PENSION_DETAILS
            WITH SYNONYMS = ('pensions', 'retirement', 'pension funds'),
          communication AS ${DB}.${SCHEMA}.CUSTOMER_COMMUNICATION
            WITH SYNONYMS = ('contact preferences', 'communication preferences'),
          interactions AS ${DB}.${SCHEMA}.CUSTOMER_INTERACTION_AND_LEADS
            WITH SYNONYMS = ('leads', 'marketing', 'campaigns'),
          products AS ${DB}.${SCHEMA}.CUSTOMER_PRODUCTS
            WITH SYNONYMS = ('holdings', 'product ownership'),
          mindset AS ${DB}.${SCHEMA}.CUSTOMER_MINDSET
            WITH SYNONYMS = ('risk profile', 'investment preferences'),
          engagement AS ${DB}.${SCHEMA}.CWE_DATA
            WITH SYNONYMS = ('touchpoints', 'service data', 'call data')
        )
        RELATIONSHIPS (
          pension (CUSTOMER_ID) REFERENCES demographics (CUSTOMER_ID),
          communication (CUSTOMER_ID) REFERENCES demographics (CUSTOMER_ID),
          interactions (CUSTOMER_ID) REFERENCES demographics (CUSTOMER_ID),
          products (CUSTOMER_ID) REFERENCES demographics (CUSTOMER_ID),
          mindset (CUSTOMER_ID) REFERENCES demographics (CUSTOMER_ID),
          engagement (CUSTOMER_ID) REFERENCES demographics (CUSTOMER_ID)
        )
        DIMENSIONS (
          demographics.customer_id AS demographics.CUSTOMER_ID
            COMMENT = 'Unique customer identifier',
          demographics.age AS demographics.AGE
            COMMENT = 'Customer age',
          demographics.age_group AS demographics.AGE_GROUP
            COMMENT = 'Age group category',
          demographics.gender AS demographics.GENDER
            COMMENT = 'Customer gender',
          demographics.region AS demographics.REGION
            COMMENT = 'Geographic region',
          demographics.income_bracket AS demographics.INCOME_BRACKET
            COMMENT = 'Income bracket category',
          demographics.homeowner_status AS demographics.HOMEOWNER_STATUS
            COMMENT = 'Home ownership status',
          pension.pension_type AS pension.PENSION_TYPE
            COMMENT = 'Type of pension plan',
          mindset.risk_category AS mindset.RISK_CATEGORY
            COMMENT = 'Investment risk category',
          mindset.esg_preference AS mindset.ESG_PREFERENCE
            COMMENT = 'ESG investment preference',
          communication.preferred_channel AS communication.PREFERRED_CHANNEL
            COMMENT = 'Preferred communication channel',
          interactions.marketing_channel AS interactions.MARKETING_CHANNEL
            COMMENT = 'Marketing channel',
          interactions.campaign_response AS interactions.CAMPAIGN_RESPONSE
            COMMENT = 'Campaign response status'
        )
        METRICS (
          demographics.total_pension_value AS SUM(demographics.TOTAL_PENSION_VALUE)
            COMMENT = 'Total pension value',
          pension.fund_value AS SUM(pension.FUND_VALUE)
            COMMENT = 'Total fund value',
          pension.annual_contribution AS SUM(pension.ANNUAL_CONTRIBUTION)
            COMMENT = 'Total annual contributions',
          engagement.total_touchpoints AS SUM(engagement.TOTAL_TOUCHPOINTS)
            COMMENT = 'Total customer touchpoints',
          engagement.total_calls AS SUM(engagement.TOTAL_CALLS)
            COMMENT = 'Total customer calls',
          demographics.customer_count AS COUNT(DISTINCT demographics.CUSTOMER_ID)
            COMMENT = 'Number of customers'
        )`,
  },
  {
    name: "Create Cortex Agent",
    sql: () => `
      CREATE OR REPLACE AGENT ${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.AGENT}
        COMMENT = 'Customer 360 AI Assistant for querying customer data'
        FROM SPECIFICATION $$
        {
          "models": {
            "orchestration": "claude-3-5-sonnet"
          },
          "instructions": {
            "orchestration": "You are a helpful Customer 360 assistant. Use the customer_data tool to answer questions about customers, demographics, pensions, and products.",
            "response": "Be concise and professional. Format numbers clearly and provide helpful insights."
          },
          "tools": [
            {
              "tool_spec": {
                "type": "cortex_analyst_text_to_sql",
                "name": "customer_data",
                "description": "Query customer demographics, pension details, products, and engagement data"
              }
            }
          ],
          "tool_resources": {
            "customer_data": {
              "semantic_view": "${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW}"
            }
          }
        }
        $$`,
  },
];

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

      let connection = null;

      try {
        send({ name: "Connecting to Snowflake", status: "running" });

        try {
          connection = await createConnection(snowflakeConfig);
          send({ name: "Connecting to Snowflake", status: "done" });
        } catch (connErr) {
          send({
            name: "Connecting to Snowflake",
            status: "error",
            message: `Connection failed: ${(connErr as Error).message}. Running in simulation mode.`,
          });

          for (const step of SETUP_STEPS) {
            send({ name: step.name, status: "running" });
            await new Promise((resolve) => setTimeout(resolve, 300));
            send({ name: step.name, status: "done", message: "(simulated)" });
          }
          controller.close();
          return;
        }

        for (const step of SETUP_STEPS) {
          send({ name: step.name, status: "running" });

          try {
            const sql = step.sql();
            await executeSQL(connection, sql);
            send({ name: step.name, status: "done" });
          } catch (err) {
            const error = err as Error;
            if (error.message.includes("already exists")) {
              send({ name: step.name, status: "done", message: "(already exists)" });
            } else {
              send({
                name: step.name,
                status: "error",
                message: error.message,
              });
            }
          }
        }
      } catch (err) {
        const error = err as Error;
        send({ name: "Setup", status: "error", message: error.message });
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
