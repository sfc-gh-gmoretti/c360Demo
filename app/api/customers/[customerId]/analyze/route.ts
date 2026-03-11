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
      timeout: 120,
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
    while (pollCount < 60) {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;

    const [demographics, communication, pension, mindset, products, interactions, cwe] = await Promise.all([
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS WHERE CUSTOMER_ID = '${customerId}'`),
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_COMMUNICATION WHERE CUSTOMER_ID = '${customerId}'`),
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_PENSION_DETAILS WHERE CUSTOMER_ID = '${customerId}' LIMIT 1`),
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_MINDSET WHERE CUSTOMER_ID = '${customerId}'`),
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_PRODUCTS WHERE CUSTOMER_ID = '${customerId}'`),
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_INTERACTION_AND_LEADS WHERE CUSTOMER_ID = '${customerId}'`),
      executeQuery(`SELECT * FROM CUSTOMER_360_DEMO.PUBLIC.CWE_DATA WHERE CUSTOMER_ID = '${customerId}'`),
    ]);

    const d = demographics[0] || {};
    const c = communication[0] || {};
    const p = pension[0] || {};
    const m = mindset[0] || {};
    const pr = products[0] || {};
    const int = interactions[0] || {};
    const cweData = cwe[0] || {};

    const companyName = process.env.COMPANY_NAME || "Your Company";

    const prompt = `You are a Senior Financial Adviser at ${companyName}. Analyze this customer's complete profile and provide strategic recommendations.

=== CUSTOMER PROFILE: ${customerId} ===

DEMOGRAPHICS:
- Age: ${d.AGE || 'Unknown'} years (${d.AGE_GROUP || 'Unknown'} group)
- Gender: ${d.GENDER || 'Unknown'}
- Marital Status: ${d.MARITAL_STATUS || 'Unknown'}
- Dependents/Carer Responsibilities: ${d.DEPENDENTS_AND_CARER_RESPONSIBILITIES || 'None specified'}
- Employment Status: ${d.EMPLOYMENT_STATUS || 'Unknown'}
- Employment History: ${d.EMPLOYMENT_HISTORY || 'Unknown'}
- Education Level: ${d.EDUCATION_LEVEL || 'Unknown'}
- Income Bracket: ${d.INCOME_BRACKET || 'Unknown'}
- Homeowner Status: ${d.HOMEOWNER_STATUS || 'Unknown'}
- Address: ${d.ADDRESS || 'Unknown'}
- High Wealth Customer: ${d.IS_HIGH_WEALTH === 'TRUE' ? 'Yes' : 'No'}

FINANCIAL POSITION:
- Total Pension Value: £${Number(d.TOTAL_PENSION_VALUE || 0).toLocaleString()}
- Number of Pensions: ${d.TOTAL_PENSIONS || 0}
- Mortgage Balance: £${Number(d.MORTGAGE_BALANCE || 0).toLocaleString()}
- Student/Other Loans: £${Number(d.STUDENT_OR_OTHER_LOANS || 0).toLocaleString()}
- Current Product Count: ${d.PRODUCT_COUNT || 0}

PENSION DETAILS:
- Pension Type: ${p.PENSION_TYPE || 'N/A'}
- Product Type: ${p.PRODUCT_TYPE || 'N/A'}
- Pension Name: ${p.PENSION_NAME || 'N/A'}
- Employer: ${p.EMPLOYER_NAME || 'N/A'}
- Fund Value: £${Number(p.FUND_VALUE || 0).toLocaleString()}
- Annual Contribution: £${Number(p.ANNUAL_CONTRIBUTION_AMOUNT || 0).toLocaleString()}
- Employee Contributions: £${Number(p.EMPLOYEE_CONTRIBUTIONS || 0).toLocaleString()}
- Employer Contributions: £${Number(p.EMPLOYER_CONTRIBUTIONS || 0).toLocaleString()}
- Fund Performance: ${p.FUND_PERFORMANCE || 'N/A'}
- Investment Type: ${p.INVESTMENT_TYPE || 'N/A'}
- Total Investable Assets: £${Number(p.TOTAL_INVESTABLE_ASSETS || 0).toLocaleString()}
- Remaining ISA Allowance: £${Number(p.REMAINING_ISA_ALLOWANCE || 0).toLocaleString()}
- Crystallised: ${p.CRYSTALLISED || 'N/A'}
- Any Withdrawals: ${p.ANY_WITHDRAWALS_FROM_PENSION || 'N/A'}
- Income Drawdown: ${p.INCOME_DRAWDOWN || 'N/A'}
- Death Benefits: ${p.DEATH_BENEFITS || 'N/A'}
- Life Assurance: ${p.LIFE_ASSURANCE || 'N/A'}

INVESTMENT MINDSET:
- Risk Category: ${m.RISK_CATEGORY || 'Unknown'}
- Risk Score: ${m.RISK_SCORE || 'N/A'}/10
- Attitude to Investment Risk: ${m.ATTITUDE_TOWARDS_INVESTMENT_RISK || 'Unknown'}
- Attitude to Pension Risk: ${m.ATTITUDE_TOWARDS_PENSION_RISK || 'Unknown'}
- Post-Crystallisation Risk Attitude: ${m.ATTITUDE_TOWARDS_RISK_POST_CRYSTALLISATION || 'N/A'}
- Investment Knowledge Level: ${m.INVESTMENT_KNOWLEDGE_LEVEL || 'Unknown'}
- Decision Making Style: ${m.DECISION_MAKING_STYLE || 'Unknown'}
- ESG Preference: ${m.ESG_PREFERENCE || 'Unknown'}
- Marketing Engagement Level: ${m.MARKETING_ENGAGEMENT_LEVEL || 'Unknown'}
- Responsiveness to Marketing: ${m.RESPONSIVENESS_TO_MARKETING || 'Unknown'}

CURRENT PRODUCTS:
- Has Pension (Current/Staff): ${pr.HAS_PENSIONS_CURRENT_OR_STAFF === 'TRUE' ? 'Yes' : 'No'}
- Has ISA: ${pr.HAS_ISA === 'TRUE' ? 'Yes' : 'No'}
- Has Bond: ${pr.HAS_BOND === 'TRUE' ? 'Yes' : 'No'}
- Has Investment Account: ${pr.HAS_INVESTMENT_ACCOUNT === 'TRUE' ? 'Yes' : 'No'}
- Has Protection Policy: ${pr.HAS_PROTECTION_POLICY === 'TRUE' ? 'Yes' : 'No'}
- Has Health Plan: ${pr.HAS_HEALTH_PLAN === 'TRUE' ? 'Yes' : 'No'}
- Has Health Products: ${pr.HAS_HEALTH_PRODUCTS === 'TRUE' ? 'Yes' : 'No'}
- Has Insurance Products: ${pr.HAS_INSURANCE_PRODUCT === 'TRUE' ? 'Yes' : 'No'}
- Has General Insurance: ${pr.HAS_GENERAL_INSURANCE_PRODUCTS === 'TRUE' ? 'Yes' : 'No'}
- Has Investment Products: ${pr.HAS_INVESTMENT_PRODUCTS === 'TRUE' ? 'Yes' : 'No'}
- Is Multi-Product Customer: ${pr.IS_MULTI_PRODUCT === 'TRUE' ? 'Yes' : 'No'}
- Total Product Count: ${pr.PRODUCT_COUNT || 0}

COMMUNICATION PREFERENCES:
- Preferred Channel: ${c.PREFERRED_COMMUNICATION_CHANNEL || 'Unknown'}
- Best Contact Time: ${c.PREFERRED_CONTACT_TIME || 'Unknown'}
- Contact Frequency: ${c.CONTACT_FREQUENCY_AND_METHOD || 'Unknown'}
- Email Consent: ${c.CONSENT_TO_EMAIL || 'Unknown'}
- Phone Consent: ${c.CONSENT_TO_PHONE || 'Unknown'}
- Post Consent: ${c.CONSENT_TO_POST || 'Unknown'}
- SMS Consent: ${c.CONSENT_TO_SMS || 'Unknown'}
- Uses Digital Channels: ${c.USES_DIGITAL_CHANNEL || 'Unknown'}
- Digital Channel Count: ${c.DIGITAL_CHANNEL_COUNT || 0}

INTERACTION & LEAD HISTORY:
- Last Interaction Date: ${int.LAST_INTERACTION_DATE || 'N/A'}
- Marketing Channel: ${int.MARKETING_CHANNEL || 'N/A'}
- Campaign Response: ${int.CAMPAIGN_RESPONSE || 'N/A'}
- Lead Converted: ${int.LEAD_CONVERTED || 'N/A'}
- Lead Conversion Rate: ${int.LEAD_CONVERSION_RATE || 'N/A'}%
- Registered Interest: ${int.REGISTERED_INTEREST || 'N/A'}
- Attended Seminar: ${int.ATTENDED_SEMINAR || 'N/A'}

SERVICE HISTORY (CWE Data):
- Total Touchpoints: ${cweData.TOTAL_TOUCHPOINTS || 0}
- Total Calls: ${cweData.NUMBER_OF_TOTAL_CALLS || 0}
- Inbound Calls: ${cweData.NUMBER_OF_INBOUND_CALLS || 0}
- Outbound Calls: ${cweData.NUMBER_OF_OUTBOUND_CALLS || 0}
- Nurture Calls: ${cweData.NUMBER_OF_NURTURE_CALLS || 0}
- Repeat Customer Calls: ${cweData.NUMBER_OF_REPEAT_CUSTOMER_CALLS || 0}
- Web Callbacks: ${cweData.TOTAL_WEB_CALLBACKS || 0}
- Average Call Time: ${cweData.AVERAGE_CALL_TIME || 0} mins
- Average Hold Time: ${cweData.AVERAGE_HOLD_TIME_MINUTES || 0} mins
- Service Quality Indicator: ${cweData.SERVICE_QUALITY_INDICATOR || 'N/A'}

=== PRODUCT PORTFOLIO ===

Based on the customer data, recommend appropriate financial products including:

**RETIREMENT & PENSIONS:**
- Personal Pension (SIPP) - Flexible pension contributions
- Target-Date Retirement Fund - Risk-adjusted over time
- Pension Consolidation - Combine multiple pensions
- Income Drawdown - Flexible retirement income

**INVESTMENTS & SAVINGS:**
- Stocks & Shares ISA - Tax-free investing up to £20,000/year
- Investment Account - For amounts above ISA allowance
- Ready-Made Funds (by risk level):
  * Cautious Fund
  * Balanced Fund
  * Growth Fund
  * Aggressive Fund

**PROTECTION:**
- Life Insurance - Term and whole of life options
- Income Protection - Protects income if unable to work
- Critical Illness Cover - Lump sum on diagnosis
- Family Income Benefit - Regular payments to family

**HEALTH:**
- Health Insurance - Private medical cover
- Dental Insurance
- Health Assessments

**GENERAL INSURANCE:**
- Car Insurance
- Home Insurance (Buildings & Contents)
- Travel Insurance

=== ANALYSIS REQUIRED ===

Provide a comprehensive analysis with the following sections:

## 1. CUSTOMER SUMMARY
Brief overview of who this customer is, their life stage, financial situation, and relationship with ${companyName}.

## 2. RISK PROFILE ASSESSMENT
- Evaluate if current investments align with their stated risk tolerance
- Identify any portfolio imbalances or concentration risks
- Consider age-appropriate asset allocation

## 3. PRODUCT RECOMMENDATIONS (Prioritized)
For each recommendation, specify:
- **Product Name** (exact Aviva product)
- **Why it suits this customer** (based on their profile data)
- **Estimated benefit/value proposition**
- **Next steps to implement**

Prioritize based on:
1. Immediate gaps in their portfolio
2. Tax efficiency opportunities (ISA allowance, pension tax relief)
3. Protection needs based on dependents/mortgage
4. Growth potential aligned with risk profile

## 4. FUND RECOMMENDATIONS
Based on their risk profile and ESG preferences, recommend specific funds.

## 5. DATA GAPS - ADDITIONAL PRODUCTS
Identify what additional information would be needed to recommend:
- **Car Insurance**: What data is missing? (vehicle details, driving history, annual mileage, etc.)
- **Home Insurance**: What data is missing? (property value, construction type, contents value, flood risk, etc.)
- **Travel Insurance**: What data is missing? (travel frequency, destinations, pre-existing conditions)

## 6. ENGAGEMENT STRATEGY
- Best communication approach based on their preferences and consent
- Optimal timing and channel for outreach
- Key talking points based on their interaction history

## 7. KEY ACTIONS (Top 3 Priority)
Specific, actionable next steps for the relationship manager with:
- Timeline
- Owner
- Expected outcome

Keep the analysis professional, actionable, and focused on deepening the customer relationship while identifying genuine cross-sell opportunities that benefit the customer.`;

    const escapedPrompt = prompt.replace(/'/g, "''");
    
    const analysisResult = await executeQuery(`
      SELECT SNOWFLAKE.CORTEX.COMPLETE('claude-4-sonnet', '${escapedPrompt}') as ANALYSIS
    `);

    const analysis = analysisResult[0]?.ANALYSIS as string || "Unable to generate analysis";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Customer analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze customer" },
      { status: 500 }
    );
  }
}
