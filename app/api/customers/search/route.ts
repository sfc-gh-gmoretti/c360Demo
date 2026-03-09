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

async function getAuthHeaders(): Promise<Record<string, string>> {
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");

    let sql: string;
    if (searchQuery) {
      const escapedQuery = searchQuery.replace(/'/g, "''");
      sql = `
        SELECT CUSTOMER_ID, REGION, AGE, AGE_GROUP, GENDER, INCOME_BRACKET, HOMEOWNER_STATUS
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS
        WHERE CAST(CUSTOMER_ID AS VARCHAR) LIKE '%${escapedQuery}%'
           OR UPPER(REGION) LIKE UPPER('%${escapedQuery}%')
        ORDER BY CUSTOMER_ID
        LIMIT ${limit}
      `;
    } else {
      sql = `
        SELECT CUSTOMER_ID, REGION, AGE, AGE_GROUP, GENDER, INCOME_BRACKET, HOMEOWNER_STATUS
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS
        ORDER BY CUSTOMER_ID
        LIMIT ${limit}
      `;
    }

    const customers = await executeQuery(sql);
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Customer search error:", error);
    return NextResponse.json(
      { error: "Failed to search customers" },
      { status: 500 }
    );
  }
}
