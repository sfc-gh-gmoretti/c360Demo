import { NextRequest } from "next/server";
import snowflake from "snowflake-sdk";
import { SNOWFLAKE_OBJECTS, TABLES } from "@/lib/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

const AGE_GROUPS = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"];
const GENDERS = ["Male", "Female", "Other"];
const INCOME_BRACKETS = [
  "Under £25k",
  "£25k-£50k",
  "£50k-£75k",
  "£75k-£100k",
  "£100k-£150k",
  "Over £150k",
];
const HOMEOWNER_STATUSES = ["Owner", "Renter", "Living with family", "Other"];
const REGIONS = [
  "North East",
  "North West",
  "Yorkshire",
  "East Midlands",
  "West Midlands",
  "East of England",
  "London",
  "South East",
  "South West",
  "Wales",
  "Scotland",
  "Northern Ireland",
];
const PENSION_TYPES = [
  "Defined Contribution",
  "Defined Benefit",
  "Personal Pension",
  "SIPP",
  "Workplace Pension",
  "State Pension",
];
const CHANNEL_TYPES = ["Email", "Phone", "Post", "SMS", "Mobile App", "Online Portal"];
const MARKETING_CHANNELS = [
  "Email",
  "Social Media",
  "Direct Mail",
  "TV",
  "Radio",
  "Online Ads",
  "Referral",
];
const CAMPAIGN_RESPONSES = ["Positive", "Negative", "No Response", "Pending"];
const MARKETING_ENGAGEMENTS = ["High", "Medium", "Low", "None"];
const RISK_CATEGORIES = ["Very Low", "Low", "Medium", "High", "Very High"];
const ESG_PREFERENCES = ["Strong Preference", "Some Interest", "Neutral", "Not Important"];
const INVESTMENT_KNOWLEDGE = ["Beginner", "Intermediate", "Advanced", "Expert"];
const SERVICE_QUALITY_INDICATORS = ["Excellent", "Good", "Average", "Poor", "Very Poor"];

function generateCustomerDemographics(customerId: number): string {
  const age = randomInt(18, 85);
  const ageGroup =
    age <= 25
      ? "18-25"
      : age <= 35
      ? "26-35"
      : age <= 45
      ? "36-45"
      : age <= 55
      ? "46-55"
      : age <= 65
      ? "56-65"
      : "65+";
  const gender = randomItem(GENDERS);
  const incomeBracket = randomItem(INCOME_BRACKETS);
  const totalPensionValue = randomDecimal(0, 500000);
  const homeownerStatus = randomItem(HOMEOWNER_STATUSES);
  const region = randomItem(REGIONS);

  return `(${customerId}, ${age}, '${ageGroup}', '${gender}', '${incomeBracket}', ${totalPensionValue}, '${homeownerStatus}', '${region}')`;
}

function generateCustomerPensionDetails(customerId: number): string {
  const pensionType = randomItem(PENSION_TYPES);
  const fundValue = randomDecimal(1000, 300000);
  const annualContribution = randomDecimal(500, 40000);

  return `(${customerId}, '${pensionType}', ${fundValue}, ${annualContribution})`;
}

function generateCustomerCommunication(customerId: number): string {
  const preferredChannel = randomItem(CHANNEL_TYPES);
  const consentEmail = Math.random() > 0.3;
  const consentPhone = Math.random() > 0.5;
  const consentSms = Math.random() > 0.6;

  return `(${customerId}, '${preferredChannel}', ${consentEmail}, ${consentPhone}, ${consentSms})`;
}

function generateCustomerInteractionAndLeads(customerId: number): string {
  const marketingChannel = randomItem(MARKETING_CHANNELS);
  const campaignResponse = randomItem(CAMPAIGN_RESPONSES);
  const leadConverted = Math.random() > 0.7;
  const marketingEngagement = randomItem(MARKETING_ENGAGEMENTS);

  return `(${customerId}, '${marketingChannel}', '${campaignResponse}', ${leadConverted}, '${marketingEngagement}')`;
}

function generateCustomerProducts(customerId: number): string {
  const hasIsa = Math.random() > 0.5;
  const hasPension = Math.random() > 0.3;
  const hasProtectionPolicy = Math.random() > 0.6;
  const isMultiProduct =
    (hasIsa && hasPension) ||
    (hasIsa && hasProtectionPolicy) ||
    (hasPension && hasProtectionPolicy);

  return `(${customerId}, ${hasIsa}, ${hasPension}, ${hasProtectionPolicy}, ${isMultiProduct})`;
}

function generateCustomerMindset(customerId: number): string {
  const riskCategory = randomItem(RISK_CATEGORIES);
  const riskScore = randomInt(1, 100);
  const esgPreference = randomItem(ESG_PREFERENCES);
  const investmentKnowledge = randomItem(INVESTMENT_KNOWLEDGE);

  return `(${customerId}, '${riskCategory}', ${riskScore}, '${esgPreference}', '${investmentKnowledge}')`;
}

function generateCweData(customerId: number): string {
  const totalTouchpoints = randomInt(1, 50);
  const totalCalls = randomInt(0, 20);
  const serviceQualityIndicator = randomItem(SERVICE_QUALITY_INDICATORS);

  return `(${customerId}, ${totalTouchpoints}, ${totalCalls}, '${serviceQualityIndicator}')`;
}

function generateBatchInsertSQL(tableName: string, startId: number, batchSize: number): string {
  const values: string[] = [];
  for (let i = 0; i < batchSize; i++) {
    const customerId = startId + i;
    switch (tableName) {
      case "CUSTOMER_DEMOGRAPHICS":
        values.push(generateCustomerDemographics(customerId));
        break;
      case "CUSTOMER_PENSION_DETAILS":
        values.push(generateCustomerPensionDetails(customerId));
        break;
      case "CUSTOMER_COMMUNICATION":
        values.push(generateCustomerCommunication(customerId));
        break;
      case "CUSTOMER_INTERACTION_AND_LEADS":
        values.push(generateCustomerInteractionAndLeads(customerId));
        break;
      case "CUSTOMER_PRODUCTS":
        values.push(generateCustomerProducts(customerId));
        break;
      case "CUSTOMER_MINDSET":
        values.push(generateCustomerMindset(customerId));
        break;
      case "CWE_DATA":
        values.push(generateCweData(customerId));
        break;
    }
  }

  const columnMap: Record<string, string> = {
    CUSTOMER_DEMOGRAPHICS:
      "(CUSTOMER_ID, AGE, AGE_GROUP, GENDER, INCOME_BRACKET, TOTAL_PENSION_VALUE, HOMEOWNER_STATUS, REGION)",
    CUSTOMER_PENSION_DETAILS: "(CUSTOMER_ID, PENSION_TYPE, FUND_VALUE, ANNUAL_CONTRIBUTION)",
    CUSTOMER_COMMUNICATION:
      "(CUSTOMER_ID, PREFERRED_CHANNEL, CONSENT_TO_EMAIL, CONSENT_TO_PHONE, CONSENT_TO_SMS)",
    CUSTOMER_INTERACTION_AND_LEADS:
      "(CUSTOMER_ID, MARKETING_CHANNEL, CAMPAIGN_RESPONSE, LEAD_CONVERTED, MARKETING_ENGAGEMENT)",
    CUSTOMER_PRODUCTS:
      "(CUSTOMER_ID, HAS_ISA, HAS_PENSION, HAS_PROTECTION_POLICY, IS_MULTI_PRODUCT)",
    CUSTOMER_MINDSET:
      "(CUSTOMER_ID, RISK_CATEGORY, RISK_SCORE, ESG_PREFERENCE, INVESTMENT_KNOWLEDGE)",
    CWE_DATA: "(CUSTOMER_ID, TOTAL_TOUCHPOINTS, TOTAL_CALLS, SERVICE_QUALITY_INDICATOR)",
  };

  return `INSERT INTO ${DB}.${SCHEMA}.${tableName} ${columnMap[tableName]} VALUES ${values.join(", ")}`;
}

export async function POST(request: NextRequest) {
  const { account, user, password, pat, authMethod, count } = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let connection: snowflake.Connection | null = null;
      const stats: { table: string; rows: number }[] = [];

      try {
        send({ progress: "Connecting to Snowflake..." });

        const connectionConfig: snowflake.ConnectionOptions = {
          account,
          username: user,
          database: DB,
          schema: SCHEMA,
          warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
        };

        if (authMethod === "pat") {
          connectionConfig.password = pat;
        } else if (authMethod === "password" || password) {
          connectionConfig.password = password;
        }

        connection = snowflake.createConnection(connectionConfig);

        await new Promise<void>((resolve, reject) => {
          connection!.connect((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        send({ progress: "Connected successfully" });

        const executeSQL = (sql: string): Promise<void> => {
          return new Promise((resolve, reject) => {
            connection!.execute({
              sqlText: sql,
              complete: (err) => {
                if (err) reject(err);
                else resolve();
              },
            });
          });
        };

        await executeSQL(`USE WAREHOUSE ${SNOWFLAKE_OBJECTS.WAREHOUSE}`);
        await executeSQL(`USE DATABASE ${DB}`);
        await executeSQL(`USE SCHEMA ${SCHEMA}`);

        const BATCH_SIZE = 100;

        for (const table of TABLES) {
          send({ progress: `Generating ${table}...` });

          let inserted = 0;
          while (inserted < count) {
            const batchSize = Math.min(BATCH_SIZE, count - inserted);
            const sql = generateBatchInsertSQL(table, inserted + 1, batchSize);

            await executeSQL(sql);
            inserted += batchSize;

            if (inserted % 500 === 0 || inserted === count) {
              send({
                progress: `Inserted ${inserted.toLocaleString()} / ${count.toLocaleString()} rows into ${table}`,
              });
            }
          }

          send({ progress: `Inserted ${count.toLocaleString()} rows into ${table}` });
          stats.push({ table, rows: count });
        }

        send({ progress: "Data generation complete!" });
        send({ stats });
      } catch (error) {
        console.error("Data generation error:", error);
        send({ error: error instanceof Error ? error.message : "Unknown error occurred" });
      } finally {
        if (connection) {
          connection.destroy((err) => {
            if (err) console.error("Error closing connection:", err);
          });
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
