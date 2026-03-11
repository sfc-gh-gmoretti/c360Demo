import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

function getOAuthToken(): string | null {
  const tokenPath = "/snowflake/session/token";
  try {
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, "utf8");
    }
  } catch {
    // Not in SPCS environment
  }
  return null;
}

function getAccountBaseUrl(): string {
  const token = getOAuthToken();
  if (token && process.env.SNOWFLAKE_HOST) {
    return `https://${process.env.SNOWFLAKE_HOST}`;
  }
  return "https://SFSEEUROPE-EU_DEMO86C.snowflakecomputing.com";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const oauthToken = getOAuthToken();
  
  if (oauthToken) {
    return {
      "Authorization": `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Snowflake-Authorization-Token-Type": "OAUTH",
    };
  }
  
  throw new Error("No OAuth token available - this endpoint requires SPCS environment");
}

async function executeQuery(sql: string): Promise<Record<string, unknown>[]> {
  const baseUrl = getAccountBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/v2/statements`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      statement: sql,
      timeout: 60,
      database: "CUSTOMER_360_DEMO",
      schema: "PUBLIC",
      warehouse: "C360_WH",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.statementStatusUrl) {
    let pollCount = 0;
    while (pollCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(`${baseUrl}${result.statementStatusUrl}`, { headers });
      const pollResult = await pollResponse.json();
      if (pollResult.statementHandle && pollResult.data) {
        return transformData(pollResult);
      }
      pollCount++;
    }
    throw new Error("Query timed out");
  }
  
  return transformData(result);
}

function transformData(result: { resultSetMetaData?: { rowType?: Array<{ name: string }> }; data?: unknown[][] }): Record<string, unknown>[] {
  if (!result.data || !result.resultSetMetaData?.rowType) {
    return [];
  }
  
  const columns = result.resultSetMetaData.rowType.map((col: { name: string }) => col.name);
  return result.data.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

interface PredictionInput {
  age: number;
  incomeBracketEnc: number;
  homeownerStatusNum: number;
  totalPensionValue: number;
  totalPensions: number;
  riskCategoryEnc: number;
  riskScore: number;
  investmentKnowledgeEnc: number;
  marketingEngagementEnc: number;
  hasPensionsNum: number;
  hasIsaNum: number;
  useLocalModel?: boolean;
}

function localPredict(features: PredictionInput): number {
  const weights = {
    age: 0.008,
    incomeBracket: 0.12,
    homeowner: 0.15,
    pensionValue: 0.00000015,
    numPensions: 0.08,
    riskCategory: 0.05,
    riskScore: 0.03,
    investmentKnowledge: 0.10,
    marketingEngagement: 0.12,
    hasPensions: 0.18,
    hasIsa: -0.10,
  };
  const intercept = -0.3;
  
  const logit = intercept +
    weights.age * (features.age - 45) / 30 +
    weights.incomeBracket * features.incomeBracketEnc / 5 +
    weights.homeowner * features.homeownerStatusNum +
    weights.pensionValue * features.totalPensionValue +
    weights.numPensions * features.totalPensions / 5 +
    weights.riskCategory * features.riskCategoryEnc / 3 +
    weights.riskScore * (features.riskScore - 5) / 5 +
    weights.investmentKnowledge * features.investmentKnowledgeEnc / 3 +
    weights.marketingEngagement * features.marketingEngagementEnc / 3 +
    weights.hasPensions * features.hasPensionsNum +
    weights.hasIsa * features.hasIsaNum;
  
  return 1 / (1 + Math.exp(-logit));
}

interface TimingBreakdown {
  authMs: number;
  fetchMs: number;
  parseMs: number;
  totalMs: number;
}

async function callSnowflakeMLSql(features: PredictionInput): Promise<{ probability: number; timing: TimingBreakdown }> {
  const startTotal = Date.now();
  
  const sql = `
    SELECT TO_JSON(CUSTOMER_360_DEMO.PUBLIC.CROSS_SELL_PROPENSITY!PREDICT_PROBA(
      ${features.age}::FLOAT,
      ${features.incomeBracketEnc}::FLOAT,  
      ${features.homeownerStatusNum}::FLOAT,
      ${features.totalPensionValue}::FLOAT,
      ${features.totalPensions}::FLOAT,
      ${features.riskCategoryEnc}::FLOAT,
      ${features.riskScore}::FLOAT,
      ${features.investmentKnowledgeEnc}::FLOAT,
      ${features.marketingEngagementEnc}::FLOAT,
      ${features.hasPensionsNum}::FLOAT,
      ${features.hasIsaNum}::FLOAT
    )) AS PREDICTION_JSON
  `;
  
  const result = await executeQuery(sql);
  const totalMs = Date.now() - startTotal;
  
  if (result.length === 0) {
    throw new Error("No prediction returned");
  }
  
  const predictionJson = JSON.parse(result[0].PREDICTION_JSON as string);
  return { 
    probability: predictionJson.output_feature_1,
    timing: { authMs: 0, fetchMs: totalMs, parseMs: 0, totalMs }
  };
}

export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  try {
    const parseStart = Date.now();
    const features: PredictionInput = await request.json();
    const parseBodyMs = Date.now() - parseStart;
    const useLocal = features.useLocalModel === true;
    
    let probability: number;
    let modelSource: string;
    let timing: TimingBreakdown;
    
    if (useLocal) {
      const localStart = Date.now();
      probability = localPredict(features);
      const localMs = Date.now() - localStart;
      modelSource = "local";
      timing = { authMs: 0, fetchMs: 0, parseMs: 0, totalMs: localMs };
    } else {
      try {
        const result = await callSnowflakeMLSql(features);
        probability = result.probability;
        timing = result.timing;
        modelSource = "snowflake-ml-registry-sql";
      } catch (sqlError) {
        console.error("SQL ML prediction failed, using local model:", sqlError);
        const localStart = Date.now();
        probability = localPredict(features);
        const localMs = Date.now() - localStart;
        modelSource = "local-fallback";
        timing = { authMs: 0, fetchMs: 0, parseMs: 0, totalMs: localMs };
      }
    }
    
    let recommendation = "Low";
    if (probability > 0.7) {
      recommendation = "High";
    } else if (probability > 0.4) {
      recommendation = "Medium";
    }
    
    const totalRequestMs = Date.now() - requestStart;
    console.log(`[Request Timing] parseBody=${parseBodyMs}ms, model=${timing.totalMs}ms, totalRequest=${totalRequestMs}ms`);
    
    return NextResponse.json({
      probability,
      probabilityPercent: (probability * 100).toFixed(1),
      recommendation,
      modelSource,
      timing: {
        parseBodyMs,
        ...timing,
        totalRequestMs,
      },
    });
  } catch (error) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      { error: "Failed to get prediction" },
      { status: 500 }
    );
  }
}
