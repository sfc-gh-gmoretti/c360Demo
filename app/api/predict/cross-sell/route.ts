import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";

let cachedJwtToken: string | null = null;
let tokenExpiry: number = 0;

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

function getPrivateKey(): string {
  const keyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH || `${process.env.HOME}/.snowflake/keys/rsa_key.p8`;
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key not found at ${keyPath}`);
  }
  return fs.readFileSync(keyPath, "utf8");
}

function generateJwtToken(): string {
  if (cachedJwtToken && Date.now() < tokenExpiry) {
    return cachedJwtToken;
  }

  const user = (process.env.SNOWFLAKE_USER || "admin").toUpperCase();
  const privateKey = getPrivateKey();
  const account = process.env.SNOWFLAKE_ACCOUNT || "";
  const qualifiedAccountName = account.replace(/-/g, "_").replace(/\./g, "_").toUpperCase();

  const privateKeyObj = crypto.createPrivateKey(privateKey);
  const publicKeyDer = crypto.createPublicKey(privateKeyObj).export({ type: "spki", format: "der" });
  const fingerprint = crypto.createHash("sha256").update(publicKeyDer).digest("base64");
  const publicKeyFingerprint = `SHA256:${fingerprint}`;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `${qualifiedAccountName}.${user}.${publicKeyFingerprint}`,
    sub: `${qualifiedAccountName}.${user}`,
    iat: now,
    exp: now + 3600,
  };

  cachedJwtToken = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  tokenExpiry = (now + 3500) * 1000;
  return cachedJwtToken;
}

function getAccountBaseUrl(): string {
  const token = getOAuthToken();
  if (token) {
    const host = process.env.SNOWFLAKE_HOST || `${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`;
    return `https://${host}`;
  }
  const account = process.env.SNOWFLAKE_ACCOUNT || "";
  return `https://${account}.snowflakecomputing.com`;
}

async function getSqlApiHeaders(): Promise<Record<string, string>> {
  const oauthToken = getOAuthToken();
  
  if (oauthToken) {
    return {
      "Authorization": `Bearer ${oauthToken}`,
      "X-Snowflake-Authorization-Token-Type": "OAUTH",
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }
  
  const jwtToken = generateJwtToken();
  return {
    "Authorization": `Bearer ${jwtToken}`,
    "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

async function getModelServingHeaders(): Promise<Record<string, string>> {
  const jwtToken = generateJwtToken();
  return {
    "Authorization": `Snowflake Token="${jwtToken}"`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
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
  useSpcsService?: boolean;
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

async function executeQuery(sql: string): Promise<Record<string, unknown>[]> {
  const baseUrl = getAccountBaseUrl();
  const headers = await getSqlApiHeaders();
  
  const response = await fetch(`${baseUrl}/api/v2/statements`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      statement: sql,
      timeout: 60,
      database: "CUSTOMER_DEMO",
      schema: "PUBLIC",
      warehouse: "COMPUTE_WH",
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

const ML_REGISTRY_PUBLIC_URL = "https://avey5-sfseeurope-eu-demo86.snowflakecomputing.app/predict-proba";
const ML_REGISTRY_INTERNAL_URL = "http://cross-sell-inference-service.dpg7.svc.spcs.internal:5000/predict-proba";

function getMLRegistryUrl(): string {
  const isSpcs = !!getOAuthToken();
  return isSpcs ? ML_REGISTRY_INTERNAL_URL : ML_REGISTRY_PUBLIC_URL;
}

interface TimingBreakdown {
  authMs: number;
  fetchMs: number;
  parseMs: number;
  totalMs: number;
}

async function callMLRegistryRestApi(features: PredictionInput): Promise<{ probability: number; timing: TimingBreakdown }> {
  const startTotal = Date.now();
  
  const payload = {
    dataframe_split: {
      index: [0],
      columns: [
        "AGE",
        "INCOME_BRACKET_ENC",
        "HOMEOWNER_STATUS_NUM",
        "TOTAL_PENSION_VALUE",
        "TOTAL_PENSIONS",
        "RISK_CATEGORY_ENC",
        "RISK_SCORE",
        "INVESTMENT_KNOWLEDGE_ENC",
        "MARKETING_ENGAGEMENT_ENC",
        "HAS_PENSIONS_NUM",
        "HAS_ISA_NUM",
      ],
      data: [[
        features.age,
        features.incomeBracketEnc,
        features.homeownerStatusNum,
        features.totalPensionValue,
        features.totalPensions,
        features.riskCategoryEnc,
        features.riskScore,
        features.investmentKnowledgeEnc,
        features.marketingEngagementEnc,
        features.hasPensionsNum,
        features.hasIsaNum,
      ]]
    }
  };

  const startAuth = Date.now();
  const authHeaders = await getModelServingHeaders();
  const authMs = Date.now() - startAuth;

  const mlUrl = getMLRegistryUrl();
  console.log(`[ML Inference] Using URL: ${mlUrl}`);
  
  const startFetch = Date.now();
  const response = await fetch(mlUrl, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  const fetchMs = Date.now() - startFetch;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ML Registry REST API failed: ${response.status} - ${errorText}`);
  }

  const startParse = Date.now();
  const result = await response.json();
  const parseMs = Date.now() - startParse;
  
  const totalMs = Date.now() - startTotal;
  const timing: TimingBreakdown = { authMs, fetchMs, parseMs, totalMs };
  
  console.log(`[ML REST API Timing] auth=${authMs}ms, fetch=${fetchMs}ms, parse=${parseMs}ms, total=${totalMs}ms`);
  
  if (result.data && result.data[0] && result.data[0][1]) {
    const prediction = result.data[0][1];
    return { probability: prediction.output_feature_1, timing };
  } else if (result.dataframe_split) {
    return { probability: result.dataframe_split.data[0][1], timing };
  }
  throw new Error(`Unexpected response format: ${JSON.stringify(result)}`);
}

async function callSnowflakeMLSql(features: PredictionInput): Promise<number> {
  const sql = `
    SELECT TO_JSON(CUSTOMER_DEMO.PUBLIC.CROSS_SELL_PROPENSITY!PREDICT_PROBA(
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
    )) AS prediction_json
  `;
  
  const result = await executeQuery(sql);
  
  if (result.length === 0) {
    throw new Error("No prediction returned");
  }
  
  const predictionJson = JSON.parse(result[0].PREDICTION_JSON as string);
  return predictionJson.output_feature_1;
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
    let timing: TimingBreakdown | undefined;
    
    if (useLocal) {
      const localStart = Date.now();
      probability = localPredict(features);
      const localMs = Date.now() - localStart;
      modelSource = "local";
      timing = { authMs: 0, fetchMs: 0, parseMs: 0, totalMs: localMs };
    } else {
      try {
        const result = await callMLRegistryRestApi(features);
        probability = result.probability;
        timing = result.timing;
        modelSource = "snowflake-ml-registry-rest";
      } catch (restError) {
        console.error("REST API failed, falling back to SQL:", restError);
        const sqlStart = Date.now();
        probability = await callSnowflakeMLSql(features);
        const sqlMs = Date.now() - sqlStart;
        modelSource = "snowflake-ml-registry-sql";
        timing = { authMs: 0, fetchMs: sqlMs, parseMs: 0, totalMs: sqlMs };
      }
    }
    
    let recommendation = "Low";
    if (probability > 0.7) {
      recommendation = "High";
    } else if (probability > 0.4) {
      recommendation = "Medium";
    }
    
    const totalRequestMs = Date.now() - requestStart;
    console.log(`[Request Timing] parseBody=${parseBodyMs}ms, model=${timing?.totalMs}ms, totalRequest=${totalRequestMs}ms`);
    
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
