import { NextRequest } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/setup/snowflake";
import { SNOWFLAKE_OBJECTS, TABLES } from "@/lib/setup/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

const AGE_GROUPS = ["18-25", "26-35", "36-45", "46-55", "56-65", "65+"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const INCOME_BRACKETS = ["<30k", "30k-50k", "50k-75k", "75k-100k", "100k-150k", "150k+"];
const HOMEOWNER_STATUS = ["Owner", "Renter", "Living with family"];
const REGIONS = ["North East", "North West", "Midlands", "South East", "South West", "Scotland", "Wales", "London"];
const PENSION_TYPES = ["Defined Contribution", "Defined Benefit", "SIPP", "Personal Pension", "Workplace Pension"];
const CHANNELS = ["Email", "Phone", "SMS", "Post", "App"];
const MARKETING_CHANNELS = ["Email", "Social Media", "Direct Mail", "Web", "Referral", "Event"];
const CAMPAIGN_RESPONSES = ["Opened", "Clicked", "Converted", "Ignored", "Unsubscribed"];
const RISK_CATEGORIES = ["Conservative", "Moderate", "Balanced", "Growth", "Aggressive"];
const ESG_PREFERENCES = ["High Priority", "Some Interest", "No Preference", "Not Important"];
const INVESTMENT_KNOWLEDGE = ["Beginner", "Intermediate", "Advanced", "Expert"];
const ENGAGEMENT_LEVELS = ["Low", "Medium", "High", "Very High"];
const SERVICE_QUALITY = ["Excellent", "Good", "Average", "Below Average", "Poor"];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateCustomerDemographics(customerId: number): string {
  const age = randomInt(22, 75);
  const ageGroup = AGE_GROUPS[Math.min(Math.floor((age - 18) / 10), 5)];
  const totalPensionValue = randomFloat(5000, 500000, 2);
  
  return `(${customerId}, ${age}, '${ageGroup}', '${randomChoice(GENDERS)}', '${randomChoice(INCOME_BRACKETS)}', ${totalPensionValue}, '${randomChoice(HOMEOWNER_STATUS)}', '${randomChoice(REGIONS)}')`;
}

function generatePensionDetails(customerId: number): string {
  const fundValue = randomFloat(1000, 250000, 2);
  const annualContribution = randomFloat(500, 30000, 2);
  return `(${customerId}, '${randomChoice(PENSION_TYPES)}', ${fundValue}, ${annualContribution})`;
}

function generateCommunication(customerId: number): string {
  return `(${customerId}, '${randomChoice(CHANNELS)}', ${Math.random() > 0.3}, ${Math.random() > 0.5}, ${Math.random() > 0.4})`;
}

function generateInteractions(customerId: number): string {
  return `(${customerId}, '${randomChoice(MARKETING_CHANNELS)}', '${randomChoice(CAMPAIGN_RESPONSES)}', ${Math.random() > 0.7}, '${randomChoice(ENGAGEMENT_LEVELS)}')`;
}

function generateProducts(customerId: number): string {
  const hasIsa = Math.random() > 0.4;
  const hasPension = Math.random() > 0.2;
  const hasProtection = Math.random() > 0.6;
  const isMulti = (hasIsa ? 1 : 0) + (hasPension ? 1 : 0) + (hasProtection ? 1 : 0) > 1;
  return `(${customerId}, ${hasIsa}, ${hasPension}, ${hasProtection}, ${isMulti})`;
}

function generateMindset(customerId: number): string {
  const riskScore = randomFloat(1, 10, 2);
  return `(${customerId}, '${randomChoice(RISK_CATEGORIES)}', ${riskScore}, '${randomChoice(ESG_PREFERENCES)}', '${randomChoice(INVESTMENT_KNOWLEDGE)}')`;
}

function generateCweData(customerId: number): string {
  return `(${customerId}, ${randomInt(1, 50)}, ${randomInt(0, 20)}, '${randomChoice(SERVICE_QUALITY)}')`;
}

const TABLE_GENERATORS: Record<string, (id: number) => string> = {
  CUSTOMER_DEMOGRAPHICS: generateCustomerDemographics,
  CUSTOMER_PENSION_DETAILS: generatePensionDetails,
  CUSTOMER_COMMUNICATION: generateCommunication,
  CUSTOMER_INTERACTION_AND_LEADS: generateInteractions,
  CUSTOMER_PRODUCTS: generateProducts,
  CUSTOMER_MINDSET: generateMindset,
  CWE_DATA: generateCweData,
};

export async function POST(request: NextRequest) {
  const { count, account, user, pat, database, schema, warehouse } = await request.json();

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
      const stats: { table: string; rows: number }[] = [];

      try {
        send({ progress: "Connecting to Snowflake..." });
        connection = await createConnection(snowflakeConfig);
        send({ progress: "Connected successfully" });

        for (const table of TABLES) {
          const generator = TABLE_GENERATORS[table];
          if (!generator) continue;

          send({ progress: `Truncating ${table}...` });
          await executeSQL(connection, `TRUNCATE TABLE IF EXISTS ${DB}.${SCHEMA}.${table}`);

          send({ progress: `Generating data for ${table}...` });

          const batchSize = 500;
          let totalRows = 0;

          for (let i = 0; i < count; i += batchSize) {
            const batchEnd = Math.min(i + batchSize, count);
            const values: string[] = [];

            for (let j = i; j < batchEnd; j++) {
              values.push(generator(j + 1));
            }

            const insertSql = `INSERT INTO ${DB}.${SCHEMA}.${table} VALUES ${values.join(", ")}`;
            await executeSQL(connection, insertSql);
            totalRows += values.length;

            if (totalRows % 1000 === 0 || totalRows === count) {
              send({ progress: `${table}: Inserted ${totalRows.toLocaleString()} rows` });
            }
          }

          stats.push({ table, rows: totalRows });
          send({ progress: `Completed ${table}: ${totalRows.toLocaleString()} rows` });
        }

        send({ progress: "Data generation complete!", stats });
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
