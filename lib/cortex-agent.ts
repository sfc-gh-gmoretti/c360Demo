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

export function getAccountBaseUrl(): string {
  const host = process.env.SNOWFLAKE_HOST;
  const port = process.env.SNOWFLAKE_PORT;
  
  console.log("ENV DEBUG - SNOWFLAKE_HOST:", host);
  console.log("ENV DEBUG - SNOWFLAKE_PORT:", port);
  console.log("ENV DEBUG - SNOWFLAKE_ACCOUNT:", process.env.SNOWFLAKE_ACCOUNT);
  
  if (!host) {
    const account = process.env.SNOWFLAKE_ACCOUNT || "";
    const url = `https://${account}.snowflakecomputing.com`;
    console.log("Using fallback URL from ACCOUNT:", url);
    return url;
  }
  if (port) {
    const url = `https://${host}:${port}`;
    console.log("Using HOST:PORT URL:", url);
    return url;
  }
  const url = `https://${host}`;
  console.log("Using HOST URL:", url);
  return url;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const oauthToken = getOAuthToken();
  
  if (oauthToken) {
    return {
      "Authorization": `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Customer360Intelligence/1.0",
    };
  }
  
  const jwtToken = generateJwtToken();
  return {
    "Authorization": `Bearer ${jwtToken}`,
    "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Customer360Intelligence/1.0",
  };
}

export interface MessageContent {
  type: "text" | "tool_use" | "tool_results" | "data_table" | "thinking";
  text?: string;
  tool_use_id?: string;
  tool_name?: string;
  input?: Record<string, unknown>;
  content?: unknown;
  data?: unknown[];
  thinking?: { text: string };
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: MessageContent[];
}

export interface AgentRunResponse {
  role: string;
  content: MessageContent[];
  metadata?: {
    usage?: {
      tokens_consumed?: Array<{
        model_name: string;
        input_tokens: { total: number };
        output_tokens: { total: number };
      }>;
    };
  };
}

export async function* runAgent(
  agentName: string,
  messages: AgentMessage[]
): AsyncGenerator<AgentRunResponse> {
  const baseUrl = getAccountBaseUrl();
  const headers = await getAuthHeaders();
  
  const [database, schema, name] = agentName.split(".");
  const url = `${baseUrl}/api/v2/databases/${database}/schemas/${schema}/agents/${name}:run`;
  
  console.log("Agent API URL:", url);
  console.log("Using OAuth token:", headers.Authorization?.substring(0, 30) + "...");
  
  console.log("Making request to:", url);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Accept": "text/event-stream",
    },
    body: JSON.stringify({
      messages,
      stream: true,
      experimental: {
        enable_thinking: true,
      },
    }),
  });

  console.log("Response status:", response.status, response.statusText);
  console.log("Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

  if (!response.ok) {
    const error = await response.text();
    console.log("Error response body:", error);
    throw new Error(`Failed to run agent: ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        console.log("SSE data:", data.substring(0, 200));
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          yield parsed;
        } catch {
          console.log("Failed to parse JSON:", data);
        }
      }
    }
  }
}

export async function runAgentNonStreaming(
  agentName: string,
  messages: AgentMessage[]
): Promise<AgentRunResponse> {
  const baseUrl = getAccountBaseUrl();
  const headers = await getAuthHeaders();
  
  const [database, schema, name] = agentName.split(".");
  const url = `${baseUrl}/api/v2/databases/${database}/schemas/${schema}/agents/${name}:run`;
  
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to run agent: ${error}`);
  }

  return response.json();
}
