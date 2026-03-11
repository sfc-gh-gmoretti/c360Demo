import { NextRequest } from "next/server";
import { createConnection, executeSQL, destroyConnection, SnowflakeConfig } from "@/lib/snowflake";
import { SNOWFLAKE_OBJECTS, TABLES } from "@/lib/constants";

const DB = SNOWFLAKE_OBJECTS.DATABASE;
const SCHEMA = SNOWFLAKE_OBJECTS.SCHEMA;

const AGE_GROUPS = ["Under 30", "30-39", "40-49", "50-59", "60-69", "70+"];
const GENDERS = [
  { val: "Female", weight: 44 },
  { val: "Male", weight: 45 },
  { val: "Non-binary", weight: 5.5 },
  { val: "Prefer not to say", weight: 5.5 },
];
const INCOME_BRACKETS = [
  { val: "£0-£15,000", weight: 10.7 },
  { val: "£15,001-£25,000", weight: 13.8 },
  { val: "£25,001-£35,000", weight: 22 },
  { val: "£35,001-£50,000", weight: 22 },
  { val: "£50,001-£75,000", weight: 11.8 },
  { val: "£75,001-£100,000", weight: 8.6 },
  { val: "£100,001-£150,000", weight: 6.1 },
  { val: "£150,001+", weight: 5 },
];
const MARITAL_STATUS = [
  { val: "Single", weight: 28.2 },
  { val: "Married", weight: 35.5 },
  { val: "Divorced", weight: 12.1 },
  { val: "Widowed", weight: 12.3 },
  { val: "Civil Partnership", weight: 11.9 },
];
const EMPLOYMENT_STATUS = [
  { val: "Employed - Full Time", weight: 50.9 },
  { val: "Employed - Part Time", weight: 11.3 },
  { val: "Self-Employed", weight: 11.5 },
  { val: "Retired", weight: 14.9 },
  { val: "Unemployed", weight: 8.1 },
  { val: "Student", weight: 3.3 },
];
const EDUCATION_LEVELS = [
  { val: "Bachelors Degree", weight: 26.2 },
  { val: "GCSE/O-Level", weight: 17.6 },
  { val: "A-Level", weight: 11 },
  { val: "Masters Degree", weight: 11.5 },
  { val: "Professional Qualification", weight: 11.8 },
  { val: "Vocational Qualification", weight: 11.1 },
  { val: "No Formal Qualifications", weight: 7.4 },
  { val: "Doctorate/PhD", weight: 3.4 },
];
const DEPENDENTS = [
  "No dependents",
  "No children",
  "1 child",
  "2 children",
  "3 children",
  "No children, caring for elderly parent",
  "No children, caring for disabled relative",
];
const EMPLOYMENT_ROLES = ["Manager", "Director", "Financial Advisor", "Teacher", "Doctor", "Engineer", "Nurse", "Consultant", "Accountant", "Analyst"];
const EMPLOYER_NAMES = ["Retail Holdings Ltd", "Engineering Services Ltd", "Healthcare Associates Ltd", "NHS Trust", "Technology Services Ltd", "Self-Employed", "Financial Services PLC", "Manufacturing Corp", "Public Sector"];
const STREETS = ["High Street", "Station Road", "Church Lane", "Park Avenue", "Queens Road", "Oak Drive", "Mill Road", "Victoria Street", "London Road", "Main Street"];
const CITIES = ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Newcastle", "Cardiff", "Edinburgh", "Bristol", "Sheffield"];
const POSTCODES = ["SW15 5DR", "E18 2HW", "N17 5DJ", "L5 2DT", "B5 1AP", "M1 3BB", "G2 4BX", "EH1 1AA", "CF10 1AA", "LS1 2AA"];

const PENSION_TYPES = ["Personal Pension", "Stakeholder Pension", "SIPP", "Defined Contribution", "Executive Pension"];
const PENSION_NAMES = ["Workplace Pension", "Executive Pension Scheme", "Premier Pension", "Lifetime Savings Plan", "Flexible Retirement Plan"];
const PRODUCT_TYPES = ["Personal", "Stakeholder", "SIPP", "Executive", "Workplace"];
const INVESTMENT_TYPES = ["Equity Funds", "Bond Funds", "Property Funds", "Balanced Funds", "Cash Funds"];
const FUND_PERFORMANCE = ["Excellent", "Good", "Average", "Poor"];
const DEATH_BENEFITS = ["Both lump sum and income", "Ongoing pension to dependents", "Lump sum only"];
const DEATH_BENEFIT_DETAILS = ["Lump sum only", "Income to spouse/civil partner", "50% lump sum, 50% income"];
const SPOUSE_BENEFITS = ["Full pension to spouse", "50% of pension to spouse", "66.67% of pension to spouse", "No spouse benefits"];

const CHANNELS = ["Email", "Phone", "Post", "Mobile App", "SMS"];
const CONTACT_TIMES = ["Morning (9am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-8pm)", "No preference"];
const CONTACT_FREQUENCIES = ["Monthly email updates", "Quarterly phone reviews", "Annual review only", "Ad-hoc contact preferred"];
const MARKETING_CHANNELS = ["Email", "Website", "Social Media", "Direct Mail", "Phone", "Referral"];
const CAMPAIGN_RESPONSES = ["Converted", "Engaged", "No Response", "Declined"];

const RISK_CATEGORIES = [
  { val: "Conservative", weight: 22 },
  { val: "Moderate", weight: 24.4 },
  { val: "Moderately Conservative", weight: 16.9 },
  { val: "Moderately Aggressive", weight: 15.8 },
  { val: "Aggressive", weight: 8.4 },
  { val: "Balanced", weight: 6.3 },
  { val: "Adventurous", weight: 6.2 },
];
const INVESTMENT_KNOWLEDGE = [
  { val: "Intermediate", weight: 29.6 },
  { val: "Beginner", weight: 23.7 },
  { val: "Advanced", weight: 20.1 },
  { val: "Expert", weight: 13.7 },
  { val: "Basic", weight: 4.5 },
  { val: "Good", weight: 4.1 },
  { val: "Poor", weight: 4.3 },
];
const MARKETING_ENGAGEMENT = [
  { val: "Low", weight: 37.8 },
  { val: "Medium", weight: 37.7 },
  { val: "High", weight: 24.5 },
];
const ESG_PREFERENCES = [
  { val: "Neutral", weight: 38.9 },
  { val: "ESG Interested", weight: 15.8 },
  { val: "Strong ESG Focus", weight: 15.5 },
  { val: "Returns Priority", weight: 15.4 },
  { val: "Yes", weight: 7.2 },
  { val: "No", weight: 7.2 },
];
const DECISION_STYLES = [
  { val: "Analytical", weight: 17.2 },
  { val: "Delegator", weight: 15.6 },
  { val: "Collaborative", weight: 15.7 },
  { val: "Intuitive", weight: 15.6 },
  { val: "Cautious", weight: 14.4 },
  { val: "Delegates to advisor", weight: 5.6 },
  { val: "Likes to be involved", weight: 5.4 },
  { val: "Joint decision with partner", weight: 5.1 },
  { val: "Independent decision maker", weight: 5.4 },
];
const RESPONSIVENESS = [
  "Very Low - Rarely engages",
  "Low - Occasionally responds",
  "High - Frequently responds",
  "Very High - Frequently responds",
];
const RISK_ATTITUDES = ["Very Cautious", "Cautious", "Balanced", "Adventurous", "Very Adventurous"];
const SERVICE_QUALITY = ["Excellent", "Good", "Average", "Poor"];

function weightedChoice<T>(items: { val: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.val;
  }
  return items[items.length - 1].val;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): string {
  return (Math.random() * (max - min) + min).toFixed(decimals);
}

function randomDate(startYear: number, endYear: number): string {
  const year = randomInt(startYear, endYear);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

function generateCustomerDemographics(customerId: number): string {
  const age = randomInt(22, 78);
  let ageGroup: string;
  if (age < 30) ageGroup = "Under 30";
  else if (age < 40) ageGroup = "30-39";
  else if (age < 50) ageGroup = "40-49";
  else if (age < 60) ageGroup = "50-59";
  else if (age < 70) ageGroup = "60-69";
  else ageGroup = "70+";

  const birthYear = 2026 - age;
  const dob = `${birthYear}-${String(randomInt(1, 12)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`;

  const totalPensions = randomInt(1, 4);
  const totalPensionValue = randomInt(5000, 400000);
  const mortgageBalance = Math.random() > 0.6 ? randomInt(50000, 350000) : 0;
  const studentLoans = Math.random() > 0.75 ? randomInt(5000, 50000) : 0;
  const productCount = randomInt(1, 6);
  const isHighWealth = totalPensionValue > 250000 ? "TRUE" : "FALSE";
  const homeownerStatus = Math.random() > 0.4 ? "TRUE" : "FALSE";

  const address = `${randomInt(1, 200)} ${randomChoice(STREETS)}, ${randomChoice(CITIES)}, ${randomChoice(POSTCODES)}`;
  const role = randomChoice(EMPLOYMENT_ROLES);
  const startYear = randomInt(1990, 2020);
  const employmentHistory = `${role} (${startYear}-Present)`;

  const education = escapeString(weightedChoice(EDUCATION_LEVELS));
  const employment = escapeString(weightedChoice(EMPLOYMENT_STATUS));
  const gender = escapeString(weightedChoice(GENDERS));
  const income = escapeString(weightedChoice(INCOME_BRACKETS));
  const marital = escapeString(weightedChoice(MARITAL_STATUS));
  const dependentsVal = escapeString(randomChoice(DEPENDENTS));

  return `('CUST${String(customerId).padStart(4, "0")}', '${escapeString(address)}', ${age}, '${ageGroup}', '${dependentsVal}', '${dob}', '${education}', '${escapeString(employmentHistory)}', '${employment}', '${gender}', '${homeownerStatus}', '${income}', '${isHighWealth}', '${marital}', ${mortgageBalance}, ${productCount}, ${studentLoans}, ${totalPensions}, ${totalPensionValue})`;
}

function generatePensionDetails(customerId: number): string {
  const fundValue = randomInt(3000, 200000);
  const annualContribution = parseFloat(randomFloat(200, 900));
  const employeeContributions = randomInt(1000, 5000);
  const employerContributions = randomInt(40, 10000);
  const contributionsLast8Years = randomInt(20000, 300000);
  const crystallised = Math.random() > 0.6 ? "TRUE" : "FALSE";
  const fullycrystallised = crystallised === "TRUE" && Math.random() > 0.7 ? "TRUE" : "FALSE";
  const taxFreeCashEntitlement = randomInt(500, 50000);
  const crystallisedValue = crystallised === "TRUE" ? randomInt(1000, fundValue) : 0;
  const uncrystallisedValue = crystallised === "TRUE" ? fundValue - crystallisedValue : fundValue;
  const dateCommenced = randomDate(1995, 2023);
  const hasWithdrawals = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const incomeDrawdown = Math.random() > 0.4 ? "TRUE" : "FALSE";
  const lifeAssurance = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const powerOfAttorney = Math.random() > 0.3 ? "TRUE" : "FALSE";
  const policyFees = randomInt(150, 500);
  const exitFees = randomInt(150, 500);
  const remainingIsaAllowance = randomInt(2000, 20000);
  const totalInvestableAssets = fundValue + randomInt(5000, 300000);
  const totalPensionValue = fundValue;
  const pensionSchemeRef = `${randomInt(10000000, 99999999)}RA`;
  const policyNumber = `POL${randomInt(100000, 999999)}`;
  const hasPersonalContributions = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const taxFreeCashAmount = crystallised === "TRUE" ? taxFreeCashEntitlement : 0;

  const deathBenefits = escapeString(randomChoice(DEATH_BENEFITS));
  const deathBenefitDetails = escapeString(randomChoice(DEATH_BENEFIT_DETAILS));
  const employerName = escapeString(randomChoice(EMPLOYER_NAMES));
  const fundPerf = escapeString(randomChoice(FUND_PERFORMANCE));
  const investType = escapeString(randomChoice(INVESTMENT_TYPES));
  const pensionNameVal = escapeString(randomChoice(PENSION_NAMES));
  const pensionTypeVal = escapeString(randomChoice(PENSION_TYPES));
  const productTypeVal = escapeString(randomChoice(PRODUCT_TYPES));
  const spouseBen = escapeString(randomChoice(SPOUSE_BENEFITS));

  return `('CUST${String(customerId).padStart(4, "0")}', ${annualContribution}, '${hasWithdrawals}', ${employeeContributions}, ${employerContributions}, ${contributionsLast8Years}, '${crystallised}', ${taxFreeCashEntitlement}, ${crystallisedValue}, ${uncrystallisedValue}, '${dateCommenced}', '${deathBenefits}', '${deathBenefitDetails}', ${parseFloat(randomFloat(100, 900))}, ${randomInt(1500, 8000)}, '${employerName}', ${exitFees}, '${fullycrystallised}', '${fundPerf}', ${fundValue}, '${hasPersonalContributions}', '${incomeDrawdown}', '${investType}', '${lifeAssurance}', '${pensionNameVal}', '${pensionSchemeRef}', '${pensionTypeVal}', ${policyFees}, '${policyNumber}', '${powerOfAttorney}', '${productTypeVal}', ${remainingIsaAllowance}, '${spouseBen}', ${taxFreeCashAmount}, ${totalInvestableAssets}, ${totalPensionValue})`;
}

function generateCommunication(customerId: number, suffix: string = ""): string {
  const commId = `COMM${String(customerId).padStart(4, "0")}${suffix}`;
  const consentEmail = Math.random() > 0.25 ? "TRUE" : "FALSE";
  const consentPhone = Math.random() > 0.6 ? "TRUE" : "FALSE";
  const consentPost = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const consentSms = Math.random() > 0.6 ? "TRUE" : "FALSE";
  const digitalChannelCount = randomInt(1, 4);
  const usesDigital = Math.random() > 0.2 ? "TRUE" : "FALSE";

  const contactFreq = escapeString(randomChoice(CONTACT_FREQUENCIES));
  const channel = escapeString(randomChoice(CHANNELS));
  const contactTime = escapeString(randomChoice(CONTACT_TIMES));

  return `('${commId}', 'CUST${String(customerId).padStart(4, "0")}', '${consentEmail}', '${consentPhone}', '${consentPost}', '${consentSms}', '${contactFreq}', ${digitalChannelCount}, '${channel}', '${contactTime}', '${usesDigital}')`;
}

function generateInteractions(customerId: number): string {
  const lastInteractionDate = randomDate(2020, 2026);
  const leadConverted = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const leadConversionRate = randomFloat(0, 1, 5);
  const attendedSeminar = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const registeredInterest = Math.random() > 0.5 ? "TRUE" : "FALSE";

  const campaignResp = escapeString(randomChoice(CAMPAIGN_RESPONSES));
  const marketingCh = escapeString(randomChoice(MARKETING_CHANNELS));

  return `('CUST${String(customerId).padStart(4, "0")}', '${attendedSeminar}', '${campaignResp}', '${lastInteractionDate}', ${leadConversionRate}, '${leadConverted}', '${marketingCh}', '${registeredInterest}')`;
}

function generateProducts(customerId: number): string {
  const hasIsa = Math.random() > 0.6 ? "TRUE" : "FALSE";
  const hasPension = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const hasProtection = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const hasBond = Math.random() > 0.85 ? "TRUE" : "FALSE";
  const hasInvestmentAccount = Math.random() > 0.7 ? "TRUE" : "FALSE";
  const hasHealthPlan = Math.random() > 0.7 ? "TRUE" : "FALSE";
  const hasHealthProducts = Math.random() > 0.7 ? "TRUE" : "FALSE";
  const hasInsurance = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const hasGeneralInsurance = Math.random() > 0.6 ? "TRUE" : "FALSE";
  const hasInvestmentProducts = Math.random() > 0.5 ? "TRUE" : "FALSE";
  const hasProtectionProducts = Math.random() > 0.6 ? "TRUE" : "FALSE";

  const productCount = randomInt(1, 6);
  const isMulti = productCount > 1 ? "TRUE" : "FALSE";

  return `('CUST${String(customerId).padStart(4, "0")}', '${hasBond}', '${hasGeneralInsurance}', '${hasHealthPlan}', '${hasHealthProducts}', '${hasInsurance}', '${hasInvestmentAccount}', '${hasInvestmentProducts}', '${hasIsa}', '${hasPension}', '${hasProtection}', '${hasProtectionProducts}', '${isMulti}', ${productCount})`;
}

function generateMindset(customerId: number): string {
  const hasRiskData = Math.random() > 0.4;
  const riskScore = hasRiskData ? randomInt(1, 10) : "NULL";
  const attitudeInvestment = hasRiskData ? `'${randomChoice(RISK_ATTITUDES)}'` : "''";
  const attitudePension = hasRiskData ? `'${randomChoice(RISK_ATTITUDES)}'` : "''";
  const attitudePostCryst = hasRiskData ? `'${randomChoice(RISK_ATTITUDES)}'` : "''";
  const riskCategory = hasRiskData ? `'${weightedChoice(RISK_CATEGORIES)}'` : "''";

  const decisionStyle = escapeString(weightedChoice(DECISION_STYLES));
  const esgPref = escapeString(weightedChoice(ESG_PREFERENCES));
  const investKnowledge = escapeString(weightedChoice(INVESTMENT_KNOWLEDGE));
  const marketingEng = escapeString(weightedChoice(MARKETING_ENGAGEMENT));
  const responsive = escapeString(randomChoice(RESPONSIVENESS));

  return `('CUST${String(customerId).padStart(4, "0")}', ${attitudeInvestment}, ${attitudePension}, ${attitudePostCryst}, '${decisionStyle}', '${esgPref}', '${investKnowledge}', '${marketingEng}', '${responsive}', ${riskCategory}, ${riskScore})`;
}

function generateCweData(customerId: number): string {
  const totalCalls = randomInt(2, 6);
  const inboundCalls = randomInt(1, 3);
  const outboundCalls = randomInt(1, 3);
  const nurtureCalls = randomInt(0, 2);
  const repeatCalls = randomInt(0, 2);
  const webCallbacks = randomInt(1, 3);
  const webCallbackForms = randomInt(0, 2);
  const avgCallTime = randomInt(5, 15);
  const avgHoldTime = randomInt(1, 5);
  const avgHoldTimeMinutes = avgHoldTime.toFixed(2);
  const totalTouchpoints = randomInt(5, 12);
  const grandTotal = randomInt(3, 8);

  const serviceQual = escapeString(randomChoice(SERVICE_QUALITY));

  return `('CUST${String(customerId).padStart(4, "0")}', ${avgCallTime}, ${avgHoldTime}, ${avgHoldTimeMinutes}, ${grandTotal}, ${inboundCalls}, ${nurtureCalls}, ${outboundCalls}, ${repeatCalls}, ${totalCalls}, ${webCallbackForms}, '${serviceQual}', ${totalTouchpoints}, ${webCallbacks})`;
}

const TABLE_COLUMNS: Record<string, string> = {
  CUSTOMER_DEMOGRAPHICS: "CUSTOMER_ID, ADDRESS, AGE, AGE_GROUP, DEPENDENTS_AND_CARER_RESPONSIBILITIES, DOB, EDUCATION_LEVEL, EMPLOYMENT_HISTORY, EMPLOYMENT_STATUS, GENDER, HOMEOWNER_STATUS, INCOME_BRACKET, IS_HIGH_WEALTH, MARITAL_STATUS, MORTGAGE_BALANCE, PRODUCT_COUNT, STUDENT_OR_OTHER_LOANS, TOTAL_PENSIONS, TOTAL_PENSION_VALUE",
  CUSTOMER_PENSION_DETAILS: "CUSTOMER_ID, ANNUAL_CONTRIBUTION_AMOUNT, ANY_WITHDRAWALS_FROM_PENSION, CONTRIBUTIONS_CURRENTLY_BEING_MADE_EMPLOYEE, CONTRIBUTIONS_CURRENTLY_BEING_MADE_EMPLOYER, CONTRIBUTIONS_LAST_8_TAX_YEARS, CRYSTALLISED, CURRENT_TAX_FREE_CASH_ENTITLEMENT_AMOUNT, CURRENT_VALUE_OF_CRYSTALLISED_FUNDS, CURRENT_VALUE_OF_UNCRYSTALLISED_FUNDS, DATE_POLICY_COMMENCED, DEATH_BENEFITS, DEATH_BENEFIT_DETAILS, EMPLOYEE_CONTRIBUTIONS, EMPLOYER_CONTRIBUTIONS, EMPLOYER_NAME, EXIT_FEES_CHARGES_PENALTIES, FULLY_CRYSTALLISED, FUND_PERFORMANCE, FUND_VALUE, HAS_CUSTOMER_MADE_PERSONAL_CONTRIBUTIONS, INCOME_DRAWDOWN, INVESTMENT_TYPE, LIFE_ASSURANCE, PENSION_NAME, PENSION_SCHEME_TAX_REFERENCE, PENSION_TYPE, POLICY_FEES, POLICY_NUMBER, POWER_OF_ATTORNEY, PRODUCT_TYPE, REMAINING_ISA_ALLOWANCE, SPOUSE_BENEFITS, TAX_FREE_CASH_AMOUNT, TOTAL_INVESTABLE_ASSETS, TOTAL_PENSION_VALUE",
  CUSTOMER_COMMUNICATION: "COMMUNICATION_ID, CUSTOMER_ID, CONSENT_TO_EMAIL, CONSENT_TO_PHONE, CONSENT_TO_POST, CONSENT_TO_SMS, CONTACT_FREQUENCY_AND_METHOD, DIGITAL_CHANNEL_COUNT, PREFERRED_COMMUNICATION_CHANNEL, PREFERRED_CONTACT_TIME, USES_DIGITAL_CHANNEL",
  CUSTOMER_INTERACTION_AND_LEADS: "CUSTOMER_ID, ATTENDED_SEMINAR, CAMPAIGN_RESPONSE, LAST_INTERACTION_DATE, LEAD_CONVERSION_RATE, LEAD_CONVERTED, MARKETING_CHANNEL, REGISTERED_INTEREST",
  CUSTOMER_PRODUCTS: "CUSTOMER_ID, HAS_BOND, HAS_GENERAL_INSURANCE_PRODUCTS, HAS_HEALTH_PLAN, HAS_HEALTH_PRODUCTS, HAS_INSURANCE_PRODUCT, HAS_INVESTMENT_ACCOUNT, HAS_INVESTMENT_PRODUCTS, HAS_ISA, HAS_PENSIONS_CURRENT_OR_STAFF, HAS_PROTECTION_POLICY, HAS_PROTECTION_PRODUCTS, IS_MULTI_PRODUCT, PRODUCT_COUNT",
  CUSTOMER_MINDSET: "CUSTOMER_ID, ATTITUDE_TOWARDS_INVESTMENT_RISK, ATTITUDE_TOWARDS_PENSION_RISK, ATTITUDE_TOWARDS_RISK_POST_CRYSTALLISATION, DECISION_MAKING_STYLE, ESG_PREFERENCE, INVESTMENT_KNOWLEDGE_LEVEL, MARKETING_ENGAGEMENT_LEVEL, RESPONSIVENESS_TO_MARKETING, RISK_CATEGORY, RISK_SCORE",
  CWE_DATA: "CUSTOMER_ID, AVERAGE_CALL_TIME, AVERAGE_HOLD_TIME, AVERAGE_HOLD_TIME_MINUTES, GRAND_TOTAL, NUMBER_OF_INBOUND_CALLS, NUMBER_OF_NURTURE_CALLS, NUMBER_OF_OUTBOUND_CALLS, NUMBER_OF_REPEAT_CUSTOMER_CALLS, NUMBER_OF_TOTAL_CALLS, NUMBER_OF_WEB_CALL_BACK_FORMS, SERVICE_QUALITY_INDICATOR, TOTAL_TOUCHPOINTS, TOTAL_WEB_CALLBACKS",
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
          const columns = TABLE_COLUMNS[table];
          if (!columns) continue;

          send({ progress: `Truncating ${table}...` });
          await executeSQL(connection, `TRUNCATE TABLE IF EXISTS ${DB}.${SCHEMA}.${table}`);

          send({ progress: `Generating data for ${table}...` });

          const batchSize = 500;
          let totalRows = 0;

          if (table === "CUSTOMER_DEMOGRAPHICS" || table === "CUSTOMER_PRODUCTS" || table === "CUSTOMER_MINDSET") {
            for (let i = 0; i < count; i += batchSize) {
              const batchEnd = Math.min(i + batchSize, count);
              const values: string[] = [];

              for (let j = i; j < batchEnd; j++) {
                if (table === "CUSTOMER_DEMOGRAPHICS") {
                  values.push(generateCustomerDemographics(j + 1));
                } else if (table === "CUSTOMER_PRODUCTS") {
                  values.push(generateProducts(j + 1));
                } else if (table === "CUSTOMER_MINDSET") {
                  values.push(generateMindset(j + 1));
                }
              }

              const insertSql = `INSERT INTO ${DB}.${SCHEMA}.${table} (${columns}) VALUES ${values.join(", ")}`;
              await executeSQL(connection, insertSql);
              totalRows += values.length;

              if (totalRows % 1000 === 0 || totalRows === count) {
                send({ progress: `${table}: Inserted ${totalRows.toLocaleString()} rows` });
              }
            }
          } else if (table === "CUSTOMER_PENSION_DETAILS") {
            for (let i = 0; i < count; i += batchSize) {
              const batchEnd = Math.min(i + batchSize, count);
              const values: string[] = [];

              for (let j = i; j < batchEnd; j++) {
                const custId = j + 1;
                values.push(generatePensionDetails(custId));
                const rand = Math.random();
                if (rand < 0.053) {
                  values.push(generatePensionDetails(custId));
                } else if (rand < 0.106) {
                  values.push(generatePensionDetails(custId));
                  values.push(generatePensionDetails(custId));
                } else if (rand < 0.161) {
                  values.push(generatePensionDetails(custId));
                  values.push(generatePensionDetails(custId));
                  values.push(generatePensionDetails(custId));
                }
              }

              const insertSql = `INSERT INTO ${DB}.${SCHEMA}.${table} (${columns}) VALUES ${values.join(", ")}`;
              await executeSQL(connection, insertSql);
              totalRows += values.length;

              send({ progress: `${table}: Inserted ${totalRows.toLocaleString()} rows` });
            }
          } else if (table === "CUSTOMER_COMMUNICATION") {
            for (let i = 0; i < count; i += batchSize) {
              const batchEnd = Math.min(i + batchSize, count);
              const values: string[] = [];

              for (let j = i; j < batchEnd; j++) {
                const custId = j + 1;
                values.push(generateCommunication(custId, "X"));
                const rand = Math.random();
                if (rand < 0.08) {
                  values.push(generateCommunication(custId, "Y"));
                } else if (rand < 0.15) {
                  values.push(generateCommunication(custId, "Y"));
                  values.push(generateCommunication(custId, "Z"));
                }
              }

              const insertSql = `INSERT INTO ${DB}.${SCHEMA}.${table} (${columns}) VALUES ${values.join(", ")}`;
              await executeSQL(connection, insertSql);
              totalRows += values.length;

              send({ progress: `${table}: Inserted ${totalRows.toLocaleString()} rows` });
            }
          } else if (table === "CUSTOMER_INTERACTION_AND_LEADS") {
            for (let i = 0; i < count; i += batchSize) {
              const batchEnd = Math.min(i + batchSize, count);
              const values: string[] = [];

              for (let j = i; j < batchEnd; j++) {
                const custId = j + 1;
                values.push(generateInteractions(custId));
                const rand = Math.random();
                if (rand < 0.052) {
                  values.push(generateInteractions(custId));
                } else if (rand < 0.106) {
                  values.push(generateInteractions(custId));
                  values.push(generateInteractions(custId));
                } else if (rand < 0.161) {
                  values.push(generateInteractions(custId));
                  values.push(generateInteractions(custId));
                  values.push(generateInteractions(custId));
                }
              }

              const insertSql = `INSERT INTO ${DB}.${SCHEMA}.${table} (${columns}) VALUES ${values.join(", ")}`;
              await executeSQL(connection, insertSql);
              totalRows += values.length;

              send({ progress: `${table}: Inserted ${totalRows.toLocaleString()} rows` });
            }
          } else if (table === "CWE_DATA") {
            for (let i = 0; i < count; i += batchSize) {
              const batchEnd = Math.min(i + batchSize, count);
              const values: string[] = [];

              for (let j = i; j < batchEnd; j++) {
                const custId = j + 1;
                values.push(generateCweData(custId));
                const rand = Math.random();
                if (rand < 0.214) {
                  const extraCount = randomInt(4, 9);
                  for (let k = 0; k < extraCount; k++) {
                    values.push(generateCweData(custId));
                  }
                }
              }

              const insertSql = `INSERT INTO ${DB}.${SCHEMA}.${table} (${columns}) VALUES ${values.join(", ")}`;
              await executeSQL(connection, insertSql);
              totalRows += values.length;

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
