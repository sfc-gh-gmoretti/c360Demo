import { NextRequest } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/snowflake";
import { getConfig } from "@/lib/config-store";
import { SNOWFLAKE_OBJECTS, COMPUTE_POOL_CONFIG } from "@/lib/constants";

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
        CUSTOMER_ID VARCHAR(50) NOT NULL PRIMARY KEY,
        ADDRESS VARCHAR(500),
        AGE NUMBER(3,0),
        AGE_GROUP VARCHAR(20),
        DEPENDENTS_AND_CARER_RESPONSIBILITIES VARCHAR(500),
        DOB DATE,
        EDUCATION_LEVEL VARCHAR(100),
        EMPLOYMENT_HISTORY VARCHAR(500),
        EMPLOYMENT_STATUS VARCHAR(50),
        GENDER VARCHAR(50),
        HOMEOWNER_STATUS VARCHAR(10),
        INCOME_BRACKET VARCHAR(50),
        IS_HIGH_WEALTH VARCHAR(10),
        MARITAL_STATUS VARCHAR(50),
        MORTGAGE_BALANCE NUMBER(18,0),
        PRODUCT_COUNT NUMBER(2,0),
        STUDENT_OR_OTHER_LOANS NUMBER(18,0),
        TOTAL_PENSIONS NUMBER(2,0),
        TOTAL_PENSION_VALUE NUMBER(18,0)
      )`,
  },
  {
    name: "Create CUSTOMER_PENSION_DETAILS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_PENSION_DETAILS (
        CUSTOMER_ID VARCHAR(50),
        ANNUAL_CONTRIBUTION_AMOUNT NUMBER(18,2),
        ANY_WITHDRAWALS_FROM_PENSION VARCHAR(10),
        CONTRIBUTIONS_CURRENTLY_BEING_MADE_EMPLOYEE NUMBER(18,0),
        CONTRIBUTIONS_CURRENTLY_BEING_MADE_EMPLOYER NUMBER(18,0),
        CONTRIBUTIONS_LAST_8_TAX_YEARS NUMBER(18,0),
        CRYSTALLISED VARCHAR(10),
        CURRENT_TAX_FREE_CASH_ENTITLEMENT_AMOUNT NUMBER(18,0),
        CURRENT_VALUE_OF_CRYSTALLISED_FUNDS NUMBER(18,0),
        CURRENT_VALUE_OF_UNCRYSTALLISED_FUNDS NUMBER(18,0),
        DATE_POLICY_COMMENCED DATE,
        DEATH_BENEFITS VARCHAR(200),
        DEATH_BENEFIT_DETAILS VARCHAR(200),
        EMPLOYEE_CONTRIBUTIONS NUMBER(18,2),
        EMPLOYER_CONTRIBUTIONS NUMBER(18,0),
        EMPLOYER_NAME VARCHAR(200),
        EXIT_FEES_CHARGES_PENALTIES NUMBER(18,0),
        FULLY_CRYSTALLISED VARCHAR(10),
        FUND_PERFORMANCE VARCHAR(50),
        FUND_VALUE NUMBER(18,0),
        HAS_CUSTOMER_MADE_PERSONAL_CONTRIBUTIONS VARCHAR(10),
        INCOME_DRAWDOWN VARCHAR(10),
        INVESTMENT_TYPE VARCHAR(100),
        LIFE_ASSURANCE VARCHAR(10),
        PENSION_NAME VARCHAR(200),
        PENSION_SCHEME_TAX_REFERENCE VARCHAR(50),
        PENSION_TYPE VARCHAR(100),
        POLICY_FEES NUMBER(18,0),
        POLICY_NUMBER VARCHAR(50),
        POWER_OF_ATTORNEY VARCHAR(10),
        PRODUCT_TYPE VARCHAR(100),
        REMAINING_ISA_ALLOWANCE NUMBER(18,0),
        SPOUSE_BENEFITS VARCHAR(200),
        TAX_FREE_CASH_AMOUNT NUMBER(18,0),
        TOTAL_INVESTABLE_ASSETS NUMBER(18,0),
        TOTAL_PENSION_VALUE NUMBER(18,0)
      )`,
  },
  {
    name: "Create CUSTOMER_COMMUNICATION",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_COMMUNICATION (
        COMMUNICATION_ID VARCHAR(50) NOT NULL PRIMARY KEY,
        CUSTOMER_ID VARCHAR(50),
        CONSENT_TO_EMAIL VARCHAR(10),
        CONSENT_TO_PHONE VARCHAR(10),
        CONSENT_TO_POST VARCHAR(10),
        CONSENT_TO_SMS VARCHAR(10),
        CONTACT_FREQUENCY_AND_METHOD VARCHAR(200),
        DIGITAL_CHANNEL_COUNT NUMBER(2,0),
        PREFERRED_COMMUNICATION_CHANNEL VARCHAR(50),
        PREFERRED_CONTACT_TIME VARCHAR(50),
        USES_DIGITAL_CHANNEL VARCHAR(10)
      )`,
  },
  {
    name: "Create CUSTOMER_INTERACTION_AND_LEADS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_INTERACTION_AND_LEADS (
        CUSTOMER_ID VARCHAR(50) NOT NULL PRIMARY KEY,
        ATTENDED_SEMINAR VARCHAR(10),
        CAMPAIGN_RESPONSE VARCHAR(100),
        LAST_INTERACTION_DATE DATE,
        LEAD_CONVERSION_RATE NUMBER(10,5),
        LEAD_CONVERTED VARCHAR(10),
        MARKETING_CHANNEL VARCHAR(100),
        REGISTERED_INTEREST VARCHAR(10)
      )`,
  },
  {
    name: "Create CUSTOMER_PRODUCTS",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_PRODUCTS (
        CUSTOMER_ID VARCHAR(50) NOT NULL PRIMARY KEY,
        HAS_BOND VARCHAR(10),
        HAS_GENERAL_INSURANCE_PRODUCTS VARCHAR(10),
        HAS_HEALTH_PLAN VARCHAR(10),
        HAS_HEALTH_PRODUCTS VARCHAR(10),
        HAS_INSURANCE_PRODUCT VARCHAR(10),
        HAS_INVESTMENT_ACCOUNT VARCHAR(10),
        HAS_INVESTMENT_PRODUCTS VARCHAR(10),
        HAS_ISA VARCHAR(10),
        HAS_PENSIONS_CURRENT_OR_STAFF VARCHAR(10),
        HAS_PROTECTION_POLICY VARCHAR(10),
        HAS_PROTECTION_PRODUCTS VARCHAR(10),
        IS_MULTI_PRODUCT VARCHAR(10),
        PRODUCT_COUNT NUMBER(2,0)
      )`,
  },
  {
    name: "Create CUSTOMER_MINDSET",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CUSTOMER_MINDSET (
        CUSTOMER_ID VARCHAR(50) NOT NULL PRIMARY KEY,
        ATTITUDE_TOWARDS_INVESTMENT_RISK VARCHAR(100),
        ATTITUDE_TOWARDS_PENSION_RISK VARCHAR(100),
        ATTITUDE_TOWARDS_RISK_POST_CRYSTALLISATION VARCHAR(100),
        DECISION_MAKING_STYLE VARCHAR(100),
        ESG_PREFERENCE VARCHAR(50),
        INVESTMENT_KNOWLEDGE_LEVEL VARCHAR(50),
        MARKETING_ENGAGEMENT_LEVEL VARCHAR(50),
        RESPONSIVENESS_TO_MARKETING VARCHAR(200),
        RISK_CATEGORY VARCHAR(50),
        RISK_SCORE NUMBER(2,0)
      )`,
  },
  {
    name: "Create CWE_DATA",
    sql: () => `
      CREATE TABLE IF NOT EXISTS ${DB}.${SCHEMA}.CWE_DATA (
        CUSTOMER_ID VARCHAR(50) NOT NULL PRIMARY KEY,
        AVERAGE_CALL_TIME NUMBER(5,0),
        AVERAGE_HOLD_TIME NUMBER(5,0),
        AVERAGE_HOLD_TIME_MINUTES NUMBER(10,2),
        GRAND_TOTAL NUMBER(10,0),
        NUMBER_OF_INBOUND_CALLS NUMBER(10,0),
        NUMBER_OF_NURTURE_CALLS NUMBER(10,0),
        NUMBER_OF_OUTBOUND_CALLS NUMBER(10,0),
        NUMBER_OF_REPEAT_CUSTOMER_CALLS NUMBER(10,0),
        NUMBER_OF_TOTAL_CALLS NUMBER(10,0),
        NUMBER_OF_WEB_CALL_BACK_FORMS NUMBER(10,0),
        SERVICE_QUALITY_INDICATOR VARCHAR(50),
        TOTAL_TOUCHPOINTS NUMBER(10,0),
        TOTAL_WEB_CALLBACKS NUMBER(10,0)
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
          demographics.income_bracket AS demographics.INCOME_BRACKET
            COMMENT = 'Income bracket category',
          demographics.homeowner_status AS demographics.HOMEOWNER_STATUS
            COMMENT = 'Home ownership status',
          demographics.marital_status AS demographics.MARITAL_STATUS
            COMMENT = 'Marital status',
          demographics.employment_status AS demographics.EMPLOYMENT_STATUS
            COMMENT = 'Employment status',
          demographics.education_level AS demographics.EDUCATION_LEVEL
            COMMENT = 'Education level',
          pension.pension_type AS pension.PENSION_TYPE
            COMMENT = 'Type of pension plan',
          pension.product_type AS pension.PRODUCT_TYPE
            COMMENT = 'Product type',
          pension.investment_type AS pension.INVESTMENT_TYPE
            COMMENT = 'Investment type',
          mindset.risk_category AS mindset.RISK_CATEGORY
            COMMENT = 'Investment risk category',
          mindset.esg_preference AS mindset.ESG_PREFERENCE
            COMMENT = 'ESG investment preference',
          mindset.investment_knowledge_level AS mindset.INVESTMENT_KNOWLEDGE_LEVEL
            COMMENT = 'Investment knowledge level',
          mindset.marketing_engagement_level AS mindset.MARKETING_ENGAGEMENT_LEVEL
            COMMENT = 'Marketing engagement level',
          communication.preferred_communication_channel AS communication.PREFERRED_COMMUNICATION_CHANNEL
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
          pension.annual_contribution AS SUM(pension.ANNUAL_CONTRIBUTION_AMOUNT)
            COMMENT = 'Total annual contributions',
          engagement.total_touchpoints AS SUM(engagement.TOTAL_TOUCHPOINTS)
            COMMENT = 'Total customer touchpoints',
          engagement.total_calls AS SUM(engagement.NUMBER_OF_TOTAL_CALLS)
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
              "semantic_view": "${DB}.${SCHEMA}.${SNOWFLAKE_OBJECTS.SEMANTIC_VIEW}",
              "execution_environment": {
                "type": "warehouse",
                "warehouse": "${SNOWFLAKE_OBJECTS.WAREHOUSE}",
                "query_timeout": 60
              }
            }
          }
        }
        $$`,
  },
  {
    name: "Create ML Model Stage",
    sql: () => `CREATE STAGE IF NOT EXISTS ${DB}.${SCHEMA}.ML_MODEL_STAGE`,
  },
  {
    name: "Create ML Model Registration Procedure",
    sql: () => `
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
        comment="XGBoost classifier predicting cross-sell propensity"
    )
    
    return "Model registered: ${DB}.${SCHEMA}.CROSS_SELL_PROPENSITY V1"
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
