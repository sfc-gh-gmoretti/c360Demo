# Plan: Make Customer 360 App Shareable (White-Label)

**Created:** March 7, 2026  
**Status:** Ready for implementation  
**Estimated Effort:** ~3 hours

---

## Objective

Create a shareable, white-label Customer 360 app package with:
- Configurable company branding (name, colors, logo)
- Automated setup scripts
- One-click deployment to SPCS
- Users configure their company name **before** importing/deploying

---

## Current State Analysis

### Files with "Aviva" References (56 occurrences)

| File | Occurrences | Type |
|------|-------------|------|
| `app/api/customers/[customerId]/analyze/route.ts` | 35 | Product catalog, prompts |
| `docs/Customer360_Project_Documentation.md` | 11 | Documentation |
| `README.md` | 8 | Documentation |
| `app/globals.css` | 6 | CSS variables |
| `app/guide/page.tsx` | 2 | Guide page |
| `app/layout.tsx` | 2 | Metadata |
| `spcs-spec.yaml` | 2 | SPCS config |
| `package.json` | 1 | Package name |
| `package-lock.json` | 2 | Lock file |
| `lib/cortex-agent.ts` | 1 | User-Agent header |
| `components/chat-interface.tsx` | 1 | Logo alt text |

### Other Sharing Barriers

| Barrier | Current State | Impact |
|---------|---------------|--------|
| Hardcoded account references | `SFSEEUROPE-EU_DEMO86` throughout code | Colleagues must manually find/replace |
| Manual SQL setup | 7 tables, semantic view, agent, ML model created separately | Time-consuming, error-prone |
| Embedded private key | `keys/rsa_key.p8` copied into Docker image | Security risk, not portable |
| No deployment automation | Manual docker build/push/service update | Requires SPCS knowledge |
| Sample data not included | No script to generate test data | Colleagues start with empty tables |

---

## Implementation Tasks

### Task 1: Create Centralized Branding Configuration

**New File:** `config/branding.ts`

```typescript
export const config = {
  companyName: process.env.COMPANY_NAME || "Customer",
  companyNameFull: process.env.COMPANY_NAME_FULL || "Customer Corp",
  appName: process.env.APP_NAME || "Customer 360 Intelligence",
  primaryColor: process.env.PRIMARY_COLOR || "#29B5E8",  // Snowflake blue
  secondaryColor: process.env.SECONDARY_COLOR || "#0EA5E9",
  logoPath: process.env.LOGO_PATH || "/logo.png",
};
```

**New File:** `.env.template`

```env
# === BRANDING CONFIGURATION ===
# Set these before running setup
COMPANY_NAME=ACME
COMPANY_NAME_FULL=ACME Financial Services
APP_NAME=ACME Customer 360 Intelligence
PRIMARY_COLOR=#29B5E8
SECONDARY_COLOR=#0EA5E9
LOGO_PATH=/logo.png

# === SNOWFLAKE CONFIGURATION ===
SNOWFLAKE_ACCOUNT=your-account-identifier
SNOWFLAKE_DATABASE=CUSTOMER_DEMO
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_REGISTRY=your-account.registry.snowflakecomputing.com
IMAGE_TAG=v1
COMPUTE_POOL=TUTORIAL_COMPUTE_POOL
```

---

### Task 2: Replace All Aviva References with Config

**`app/api/customers/[customerId]/analyze/route.ts`** (35 references):

Replace Aviva-specific product catalog with generic financial products:

```typescript
import { config } from "@/config/branding";

const prompt = `You are a Senior Financial Adviser at ${config.companyNameFull}. 
Analyze this customer's complete profile and provide strategic recommendations.

## Available Products

### Pension Products
- Personal Pension (SIPP) - Self-invested personal pension
- Workplace Pension - Employer-sponsored retirement savings
- Pension Consolidation Service - Combine multiple pensions

### Investment Products  
- Stocks & Shares ISA - Tax-free investing up to £20,000/year
- General Investment Account - For amounts above ISA allowance
- Ready-Made Funds:
  * Cautious Fund
  * Balanced Fund
  * Growth Fund
  * Aggressive Fund

### Protection Products
- Life Insurance - Term life and whole of life options
- Income Protection - Protects income if unable to work
- Critical Illness Cover - Lump sum on diagnosis
...
`;
```

**`app/layout.tsx`:**
```typescript
import { config } from "@/config/branding";

export const metadata: Metadata = {
  title: config.appName,
  description: `AI-powered customer insights for ${config.companyName}`,
};
```

**`app/globals.css`:**

Rename CSS variables from `--aviva-*` to `--brand-*`:
```css
:root {
  --brand-primary: oklch(0.85 0.17 85);
  --brand-secondary: oklch(0.25 0.05 250);
  --brand-accent: oklch(0.75 0.14 85);
}
```

**`components/chat-interface.tsx`:**
```typescript
import { config } from "@/config/branding";
// ...
<img src={config.logoPath} alt={config.companyName} className="h-20 lg:h-24" />
```

**`lib/cortex-agent.ts`:**
```typescript
"User-Agent": `${config.companyName}Customer360/1.0`,
```

**`package.json`:**
```json
{
  "name": "customer-360-intelligence",
  ...
}
```

---

### Task 3: Create Interactive Setup Wizard

**New File:** `scripts/setup.sh`

```bash
#!/bin/bash

echo "========================================="
echo "  Customer 360 Intelligence - Setup"
echo "========================================="
echo ""

# Prompt for company name if not set
if [ -z "$COMPANY_NAME" ]; then
  read -p "Enter your company name (e.g., ACME): " COMPANY_NAME
fi

if [ -z "$COMPANY_NAME_FULL" ]; then
  read -p "Enter full company name (e.g., ACME Financial Services): " COMPANY_NAME_FULL
fi

if [ -z "$SNOWFLAKE_ACCOUNT" ]; then
  read -p "Enter Snowflake account identifier: " SNOWFLAKE_ACCOUNT
fi

# Generate .env from template
echo "Generating .env file..."
sed -e "s/COMPANY_NAME=.*/COMPANY_NAME=$COMPANY_NAME/" \
    -e "s/COMPANY_NAME_FULL=.*/COMPANY_NAME_FULL=$COMPANY_NAME_FULL/" \
    -e "s/SNOWFLAKE_ACCOUNT=.*/SNOWFLAKE_ACCOUNT=$SNOWFLAKE_ACCOUNT/" \
    .env.template > .env

echo ""
echo "Configuration saved to .env"
echo ""
echo "Next steps:"
echo "  1. Review .env and add any additional settings"
echo "  2. Run: snow sql -f setup/snowflake_setup.sql"
echo "  3. Run: ./scripts/deploy.sh"
```

---

### Task 4: Create Automated SQL Setup Script

**New File:** `setup/snowflake_setup.sql`

```sql
-- =============================================
-- Customer 360 Intelligence - Snowflake Setup
-- =============================================

-- Configuration (customize these)
SET database_name = 'CUSTOMER_DEMO';
SET schema_name = 'PUBLIC';
SET warehouse_name = 'COMPUTE_WH';

-- Create database and schema
CREATE DATABASE IF NOT EXISTS IDENTIFIER($database_name);
USE DATABASE IDENTIFIER($database_name);
CREATE SCHEMA IF NOT EXISTS IDENTIFIER($schema_name);
USE SCHEMA IDENTIFIER($schema_name);

-- Create 7 customer tables
CREATE OR REPLACE TABLE CUSTOMER_DEMOGRAPHICS (
  CUSTOMER_ID NUMBER PRIMARY KEY,
  AGE NUMBER,
  AGE_GROUP VARCHAR(20),
  GENDER VARCHAR(10),
  INCOME_BRACKET VARCHAR(30),
  TOTAL_PENSION_VALUE NUMBER(15,2),
  HOMEOWNER_STATUS VARCHAR(20),
  REGION VARCHAR(50)
);

CREATE OR REPLACE TABLE CUSTOMER_PENSION_DETAILS (
  CUSTOMER_ID NUMBER,
  PENSION_TYPE VARCHAR(50),
  FUND_VALUE NUMBER(15,2),
  ANNUAL_CONTRIBUTION NUMBER(15,2),
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER_DEMOGRAPHICS(CUSTOMER_ID)
);

CREATE OR REPLACE TABLE CUSTOMER_COMMUNICATION (
  CUSTOMER_ID NUMBER,
  PREFERRED_CHANNEL VARCHAR(30),
  CONSENT_TO_EMAIL BOOLEAN,
  CONSENT_TO_PHONE BOOLEAN,
  CONSENT_TO_SMS BOOLEAN,
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER_DEMOGRAPHICS(CUSTOMER_ID)
);

CREATE OR REPLACE TABLE CUSTOMER_INTERACTION_AND_LEADS (
  CUSTOMER_ID NUMBER,
  MARKETING_CHANNEL VARCHAR(50),
  CAMPAIGN_RESPONSE VARCHAR(20),
  LEAD_CONVERTED BOOLEAN,
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER_DEMOGRAPHICS(CUSTOMER_ID)
);

CREATE OR REPLACE TABLE CUSTOMER_PRODUCTS (
  CUSTOMER_ID NUMBER,
  HAS_ISA BOOLEAN,
  HAS_PENSION BOOLEAN,
  HAS_PROTECTION_POLICY BOOLEAN,
  IS_MULTI_PRODUCT BOOLEAN,
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER_DEMOGRAPHICS(CUSTOMER_ID)
);

CREATE OR REPLACE TABLE CUSTOMER_MINDSET (
  CUSTOMER_ID NUMBER,
  RISK_CATEGORY VARCHAR(20),
  RISK_SCORE NUMBER(5,2),
  ESG_PREFERENCE VARCHAR(30),
  INVESTMENT_KNOWLEDGE VARCHAR(30),
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER_DEMOGRAPHICS(CUSTOMER_ID)
);

CREATE OR REPLACE TABLE CWE_DATA (
  CUSTOMER_ID NUMBER,
  TOTAL_TOUCHPOINTS NUMBER,
  TOTAL_CALLS NUMBER,
  SERVICE_QUALITY_INDICATOR VARCHAR(20),
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER_DEMOGRAPHICS(CUSTOMER_ID)
);

-- Create semantic view (placeholder - customize with your semantic model)
-- CREATE OR REPLACE SEMANTIC VIEW CUSTOMER_360 AS ...;

-- Create Cortex Agent (placeholder - customize with your agent config)
-- CREATE OR REPLACE CORTEX AGENT CUSTOMER_360 ...;

-- Create network rule for SPCS egress
CREATE OR REPLACE NETWORK RULE SPCS_EGRESS_IPS
  MODE = INGRESS
  TYPE = IPV4
  VALUE_LIST = ('153.45.52.128/27');

COMMIT;
```

---

### Task 5: Create Sample Data Generation Script

**New File:** `setup/sample_data.sql`

```sql
-- =============================================
-- Customer 360 - Sample Data Generator
-- =============================================

SET num_customers = 1500;

-- Generate demographics
INSERT INTO CUSTOMER_DEMOGRAPHICS
SELECT 
  SEQ4() AS customer_id,
  UNIFORM(25, 75, RANDOM()) AS age,
  CASE 
    WHEN age < 35 THEN '25-34'
    WHEN age < 45 THEN '35-44'
    WHEN age < 55 THEN '45-54'
    WHEN age < 65 THEN '55-64'
    ELSE '65+'
  END AS age_group,
  CASE WHEN UNIFORM(0, 1, RANDOM()) > 0.5 THEN 'Male' ELSE 'Female' END AS gender,
  ARRAY_CONSTRUCT('Under £25k', '£25-50k', '£50-75k', '£75-100k', 'Over £100k')[UNIFORM(0, 4, RANDOM())] AS income_bracket,
  UNIFORM(10000, 500000, RANDOM()) AS total_pension_value,
  CASE WHEN UNIFORM(0, 1, RANDOM()) > 0.4 THEN 'Homeowner' ELSE 'Renter' END AS homeowner_status,
  ARRAY_CONSTRUCT('London', 'South East', 'North West', 'Midlands', 'Scotland')[UNIFORM(0, 4, RANDOM())] AS region
FROM TABLE(GENERATOR(ROWCOUNT => $num_customers));

-- Generate related records for other tables
INSERT INTO CUSTOMER_PENSION_DETAILS
SELECT 
  customer_id,
  ARRAY_CONSTRUCT('SIPP', 'Workplace Pension', 'Personal Pension')[UNIFORM(0, 2, RANDOM())] AS pension_type,
  total_pension_value * UNIFORM(0.3, 1.0, RANDOM()) AS fund_value,
  UNIFORM(1000, 20000, RANDOM()) AS annual_contribution
FROM CUSTOMER_DEMOGRAPHICS;

-- ... (similar inserts for other 5 tables)
```

---

### Task 6: Create One-Click Deployment Script

**New File:** `scripts/deploy.sh`

```bash
#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found. Run ./scripts/setup.sh first."
  exit 1
fi

# Validate required variables
: "${SNOWFLAKE_ACCOUNT:?Must set SNOWFLAKE_ACCOUNT in .env}"
: "${SNOWFLAKE_REGISTRY:?Must set SNOWFLAKE_REGISTRY in .env}"
: "${SNOWFLAKE_DATABASE:?Must set SNOWFLAKE_DATABASE in .env}"
: "${IMAGE_TAG:?Must set IMAGE_TAG in .env}"

IMAGE_NAME="${SNOWFLAKE_REGISTRY}/${SNOWFLAKE_DATABASE}/${SNOWFLAKE_SCHEMA}/images/customer-360:${IMAGE_TAG}"

echo "========================================="
echo "  Customer 360 - Deployment"
echo "========================================="
echo ""
echo "Image: $IMAGE_NAME"
echo ""

# Build Docker image
echo "Step 1: Building Docker image..."
docker build --platform linux/amd64 \
  --build-arg COMPANY_NAME="$COMPANY_NAME" \
  -t "$IMAGE_NAME" .

# Login to registry
echo ""
echo "Step 2: Logging into Snowflake registry..."
snow spcs image-registry login

# Push image
echo ""
echo "Step 3: Pushing image to registry..."
docker push "$IMAGE_NAME"

# Generate SPCS spec from template
echo ""
echo "Step 4: Generating SPCS specification..."
envsubst < spcs-spec.template.yaml > spcs-spec.yaml

# Deploy service
echo ""
echo "Step 5: Deploying SPCS service..."
snow sql -q "
ALTER SERVICE ${SNOWFLAKE_DATABASE}.${SNOWFLAKE_SCHEMA}.CUSTOMER_360_APP
FROM SPECIFICATION \$\$
$(cat spcs-spec.yaml)
\$\$;
" || snow sql -q "
CREATE SERVICE ${SNOWFLAKE_DATABASE}.${SNOWFLAKE_SCHEMA}.CUSTOMER_360_APP
IN COMPUTE POOL ${COMPUTE_POOL}
FROM SPECIFICATION \$\$
$(cat spcs-spec.yaml)
\$\$
EXTERNAL_ACCESS_INTEGRATIONS = (ALLOW_ALL_EAI);
"

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "Your app will be available shortly at:"
echo "  https://<endpoint>-${SNOWFLAKE_ACCOUNT}.snowflakecomputing.app/"
echo ""
echo "Check service status with:"
echo "  snow sql -q \"SELECT SYSTEM\\\$GET_SERVICE_STATUS('${SNOWFLAKE_DATABASE}.${SNOWFLAKE_SCHEMA}.CUSTOMER_360_APP')\""
```

---

### Task 7: Update All Documentation

**`README.md`** - Complete rewrite:

```markdown
# Customer 360 Intelligence

AI-powered customer insights platform built on Snowflake Cortex AI and SPCS.

## Quick Start (5 Minutes)

### Prerequisites
- Snowflake account with Cortex AI enabled
- Docker installed
- Snowflake CLI (`snow`) installed
- Node.js 18+ (for local development)

### Step 1: Clone and Configure
```bash
git clone https://github.com/your-org/customer360.git
cd customer360
./scripts/setup.sh
# Enter your company name and Snowflake account when prompted
```

### Step 2: Set Up Snowflake Objects
```bash
snow sql -f setup/snowflake_setup.sql
```

### Step 3: Load Sample Data (Optional)
```bash
snow sql -f setup/sample_data.sql
```

### Step 4: Deploy to SPCS
```bash
./scripts/deploy.sh
```

### Step 5: Access Your App
Open the URL printed by the deploy script.

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Troubleshooting

### Chat fails silently
Check network policy includes SPCS egress IPs:
```sql
ALTER NETWORK POLICY <your_policy> SET 
  ALLOWED_NETWORK_RULE_LIST = ('CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS');
```

### ML predictions are slow (~11s)
Ensure ML inference service uses REST endpoint, not SQL API polling.
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `config/branding.ts` | **Create** | Centralized branding configuration |
| `.env.template` | **Create** | Configuration template with branding |
| `scripts/setup.sh` | **Create** | Interactive setup wizard |
| `scripts/deploy.sh` | **Create** | One-click deployment |
| `setup/snowflake_setup.sql` | **Create** | All Snowflake objects |
| `setup/sample_data.sql` | **Create** | Synthetic data generator |
| `spcs-spec.template.yaml` | **Create** | SPCS spec with variables |
| `app/api/.../analyze/route.ts` | **Modify** | Generic product catalog |
| `app/layout.tsx` | **Modify** | Use config for metadata |
| `app/globals.css` | **Modify** | Rename `--aviva-*` to `--brand-*` |
| `components/chat-interface.tsx` | **Modify** | Use config for logo |
| `lib/cortex-agent.ts` | **Modify** | Use config for User-Agent |
| `package.json` | **Modify** | Rename to `customer-360-intelligence` |
| `README.md` | **Modify** | Generic quick start guide |
| `docs/*.md` | **Modify** | Remove Aviva references |
| `spcs-spec.yaml` | **Delete** | Replaced by template |
| `.gitignore` | **Modify** | Exclude secrets |

---

## User Workflow After Implementation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Clone Repo │ --> │ Run setup.sh│ --> │ Enter Name  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               v
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  App Live!  │ <-- │Run deploy.sh│ <-- │ Run SQL     │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Estimated Time

| Task | Duration |
|------|----------|
| Create branding config system | 15 min |
| Replace Aviva references (12 files) | 45 min |
| Create setup script | 15 min |
| SQL setup script | 30 min |
| Sample data script | 25 min |
| Deploy script | 20 min |
| Update documentation | 20 min |
| **Total** | **~3 hours** |

---

*Plan created: March 7, 2026*
