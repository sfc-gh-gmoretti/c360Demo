import { NextResponse } from "next/server";
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

function getPATToken(): string | null {
  return process.env.SNOWFLAKE_PAT || null;
}

function getAccountBaseUrl(): string {
  const token = getOAuthToken();
  if (token) {
    const host = process.env.SNOWFLAKE_HOST || `${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`;
    return `https://${host}`;
  }
  const host = process.env.SNOWFLAKE_HOST || "sfseeurope-eu-demo86c.snowflakecomputing.com";
  return `https://${host}`;
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
  
  const pat = getPATToken();
  if (pat) {
    return {
      "Authorization": `Bearer ${pat}`,
      "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }
  
  throw new Error("No authentication available. Please run Setup wizard or deploy to SPCS.");
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

export async function GET() {
  try {
    const [
      ageGroupsResult,
      incomeResult,
      totalCustomersResult,
      productsResult,
      channelsResult,
      preferencesResult,
      financialResult,
      segmentValueResult,
      activityResult,
    ] = await Promise.all([
      executeQuery(`
        SELECT AGE_GROUP as NAME, COUNT(*) as VALUE 
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS 
        GROUP BY AGE_GROUP 
        ORDER BY CASE 
          WHEN AGE_GROUP = '18-25' THEN 1 
          WHEN AGE_GROUP = '26-35' THEN 2 
          WHEN AGE_GROUP = '36-45' THEN 3 
          WHEN AGE_GROUP = '46-55' THEN 4 
          WHEN AGE_GROUP = '56-65' THEN 5 
          ELSE 6 END
      `),
      executeQuery(`
        SELECT INCOME_BRACKET as NAME, COUNT(*) as VALUE 
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS 
        GROUP BY INCOME_BRACKET 
        ORDER BY VALUE DESC 
        LIMIT 6
      `),
      executeQuery(`SELECT COUNT(*) as TOTAL FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS`),
      executeQuery(`
        SELECT PENSION_TYPE as NAME, COUNT(*) as VALUE 
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_PENSION_DETAILS 
        GROUP BY PENSION_TYPE 
        ORDER BY VALUE DESC
      `),
      executeQuery(`
        SELECT MARKETING_CHANNEL as NAME, COUNT(*) as VALUE 
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_INTERACTION_AND_LEADS 
        GROUP BY MARKETING_CHANNEL 
        ORDER BY VALUE DESC
      `),
      executeQuery(`
        SELECT PREFERRED_CHANNEL as NAME, COUNT(*) as VALUE 
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_COMMUNICATION 
        GROUP BY PREFERRED_CHANNEL 
        ORDER BY VALUE DESC
      `),
      executeQuery(`
        SELECT 
          SUM(c.TOTAL_PENSION_VALUE) as TOTAL_PENSION,
          AVG(c.TOTAL_PENSION_VALUE) as AVG_PENSION,
          SUM(p.FUND_VALUE) as TOTAL_POLICY
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS c
        LEFT JOIN CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_PENSION_DETAILS p ON c.CUSTOMER_ID = p.CUSTOMER_ID
      `),
      executeQuery(`
        SELECT 
          INCOME_BRACKET as SEGMENT, 
          SUM(TOTAL_PENSION_VALUE) as VALUE 
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS
        GROUP BY INCOME_BRACKET 
        ORDER BY VALUE DESC
      `),
      executeQuery(`
        SELECT 
          MARKETING_CHANNEL as DATE,
          COUNT(*) as INTERACTIONS
        FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_INTERACTION_AND_LEADS 
        GROUP BY MARKETING_CHANNEL
        ORDER BY INTERACTIONS DESC
        LIMIT 8
      `),
    ]);

    const shortenIncomeBracket = (bracket: string): string => {
      const map: Record<string, string> = {
        "£0-£15,000": "0-15k",
        "£15,001-£25,000": "15-25k",
        "£25,001-£35,000": "25-35k",
        "£35,001-£50,000": "35-50k",
        "£50,001-£75,000": "50-75k",
        "£75,001-£100,000": "75-100k",
        "£100,001-£150,000": "100-150k",
        "£150,001+": "150k+",
      };
      return map[bracket] || bracket;
    };

    const dashboardData = {
      demographics: {
        ageGroups: ageGroupsResult.map((r) => ({ name: String(r.NAME), value: Number(r.VALUE) })),
        regions: incomeResult.map((r) => ({ name: shortenIncomeBracket(String(r.NAME)), value: Number(r.VALUE) })),
        totalCustomers: Number(totalCustomersResult[0]?.TOTAL || 0),
      },
      products: {
        distribution: productsResult.map((r) => ({ name: String(r.NAME), value: Number(r.VALUE) })),
        topProducts: productsResult.slice(0, 5).map((r) => ({ name: String(r.NAME), count: Number(r.VALUE) })),
      },
      engagement: {
        channels: channelsResult.map((r) => ({ name: String(r.NAME), value: Number(r.VALUE) })),
        preferences: preferencesResult.map((r) => ({ name: String(r.NAME), value: Number(r.VALUE) })),
        recentActivity: activityResult.map((r) => ({ date: String(r.DATE), interactions: Number(r.INTERACTIONS) })),
      },
      financial: {
        totalPensionValue: Number(financialResult[0]?.TOTAL_PENSION || 0),
        avgPensionValue: Number(financialResult[0]?.AVG_PENSION || 0),
        totalPolicyValue: Number(financialResult[0]?.TOTAL_POLICY || 0),
        valueBySegment: segmentValueResult.map((r) => ({ segment: shortenIncomeBracket(String(r.SEGMENT)), value: Number(r.VALUE) })),
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data", details: (error as Error).message },
      { status: 500 }
    );
  }
}
