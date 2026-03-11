# Aviva Customer 360 Intelligence

AI-powered customer insights platform built on Snowflake Cortex AI and deployed on Snowpark Container Services (SPCS).

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Snowflake](https://img.shields.io/badge/Snowflake-Cortex%20AI-29B5E8)
![SPCS](https://img.shields.io/badge/Deployed-SPCS-00A3E0)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)

## Overview

A comprehensive Customer 360 application for financial advisers that combines natural language querying, AI-powered customer analysis, and ML-driven predictions—all running natively on Snowflake.

**Live Demo:** https://awey5-sfseeurope-eu-demo86.snowflakecomputing.app/

## Features

### 💬 AI Chat Interface
- Natural language queries powered by **Cortex Agent**
- Real-time streaming with thinking display
- Auto-generated charts (bar, pie, line) from query results
- SQL preview for transparency

### 👤 Customer 360 View
- Search customers by ID or attributes
- Complete profile across 7 data tables
- **AI Analysis** using Cortex Complete (Claude) for personalized adviser recommendations

### 📊 Interactive Dashboard
- Customer metrics and KPIs
- Age distribution, product breakdown, income analysis
- Recharts-based visualizations

### 🎯 ML Simulator
- Cross-sell propensity prediction using **XGBoost**
- Interactive feature sliders (age, income, pension value, etc.)
- Real-time probability scoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                            │
│   Chat │ Dashboard │ Customer 360 │ ML Simulator │ Voice    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 NEXT.JS APP (SPCS Container)                 │
│   /api/agent │ /api/dashboard │ /api/customers │ /api/predict│
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        SNOWFLAKE                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Cortex Agent │ │Cortex Analyst│ │ Cortex Complete      │ │
│  │ (Chat)       │ │ (SQL Gen)    │ │ (AI Analysis)        │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────────────────────────────┐  │
│  │ ML Registry  │ │         7 Customer Tables            │  │
│  │ (XGBoost)    │ │ Demographics, Pension, Products...   │  │
│  └──────────────┘ └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React, shadcn/ui, Tailwind CSS |
| **Backend** | Next.js API Routes |
| **AI Agent** | Snowflake Cortex Agent with Claude |
| **Analytics** | Cortex Analyst + Semantic Views |
| **ML** | Snowflake ML Registry (XGBoost) |
| **Deployment** | Snowpark Container Services (SPCS) |

## Getting Started

### Prerequisites

- Node.js 18+
- Snowflake account with Cortex AI enabled
- Docker (for SPCS deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/sfc-gh-gmoretti/Customer360.git
   cd Customer360/aviva-customer360
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Create `.env.local`:
   ```env
   SNOWFLAKE_ACCOUNT=your_account
   SNOWFLAKE_USER=your_user
   SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/rsa_key.p8
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

### SPCS Deployment

1. **Build Docker image**
   ```bash
   docker build --platform linux/amd64 \
     -t <registry>/customer_demo/public/images/aviva-customer360:v1 .
   ```

2. **Push to Snowflake registry**
   ```bash
   snow spcs image-registry login --connection <your_connection>
   docker push <registry>/customer_demo/public/images/aviva-customer360:v1
   ```

3. **Deploy service**
   ```sql
   CREATE SERVICE CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP
     IN COMPUTE POOL TUTORIAL_COMPUTE_POOL
     FROM SPECIFICATION $$
     spec:
       containers:
         - name: app
           image: /customer_demo/public/images/aviva-customer360:v1
     $$
     EXTERNAL_ACCESS_INTEGRATIONS = (ALLOW_ALL_EAI);
   ```

## Project Structure

```
aviva-customer360/
├── app/
│   ├── api/
│   │   ├── agent/route.ts           # Cortex Agent endpoint
│   │   ├── dashboard/route.ts       # Dashboard data
│   │   ├── customers/               # Customer APIs
│   │   │   ├── search/route.ts
│   │   │   └── [customerId]/
│   │   │       ├── route.ts         # Customer details
│   │   │       └── analyze/route.ts # AI analysis
│   │   └── predict/
│   │       └── cross-sell/route.ts  # ML predictions
│   ├── guide/page.tsx               # Build guide
│   └── layout.tsx
├── components/
│   ├── chat-interface.tsx           # AI chat UI
│   ├── customer-360-view.tsx        # Customer profile
│   ├── dashboard.tsx                # Analytics dashboard
│   ├── scenario-simulator.tsx       # ML simulator
│   └── ui/                          # shadcn components
├── lib/
│   └── cortex-agent.ts              # Cortex Agent client
├── docs/
│   └── Customer360_Project_Documentation.md
├── Dockerfile
└── spcs-spec.yaml
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent` | POST | Chat with Cortex Agent |
| `/api/dashboard` | GET | Dashboard metrics |
| `/api/customers/search` | GET | Search customers |
| `/api/customers/[id]` | GET | Customer details |
| `/api/customers/[id]/analyze` | POST | AI customer analysis |
| `/api/predict/cross-sell` | POST | ML prediction |

## Snowflake Objects

```sql
-- Database
CUSTOMER_DEMO.PUBLIC

-- Data Tables (7)
CUSTOMER_DEMOGRAPHICS
CUSTOMER_PENSION_DETAILS
CUSTOMER_COMMUNICATION
CUSTOMER_INTERACTION_AND_LEADS
CUSTOMER_PRODUCTS
CUSTOMER_MINDSET
CWE_DATA

-- AI Objects
CUSTOMER_360 (Semantic View)
CUSTOMER_360 (Cortex Agent)
CROSS_SELL_PROPENSITY v1 (ML Model)

-- SPCS
AVIVA_CUSTOMER360_APP (Service)
TUTORIAL_COMPUTE_POOL (Compute Pool)
```

## Documentation

See [docs/Customer360_Project_Documentation.md](docs/Customer360_Project_Documentation.md) for comprehensive documentation including:
- Detailed architecture diagrams
- Implementation timeline
- Troubleshooting guides
- Deployment procedures

## License

Internal Snowflake Demo Project

---

*Built with Snowflake Cortex AI*
