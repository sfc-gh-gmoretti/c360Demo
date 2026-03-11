# CUSTOMER_DEMO.PUBLIC Table Documentation

## CUSTOMER_DEMOGRAPHICS
Customer demographic and personal information.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| CUSTOMER_ID | VARCHAR(50) | No | Yes |
| ADDRESS | VARCHAR(500) | Yes | No |
| AGE | NUMBER(3,0) | Yes | No |
| AGE_GROUP | VARCHAR(20) | Yes | No |
| DEPENDENTS_AND_CARER_RESPONSIBILITIES | VARCHAR(500) | Yes | No |
| DOB | DATE | Yes | No |
| EDUCATION_LEVEL | VARCHAR(100) | Yes | No |
| EMPLOYMENT_HISTORY | VARCHAR(500) | Yes | No |
| EMPLOYMENT_STATUS | VARCHAR(50) | Yes | No |
| GENDER | VARCHAR(50) | Yes | No |
| HOMEOWNER_STATUS | VARCHAR(10) | Yes | No |
| INCOME_BRACKET | VARCHAR(50) | Yes | No |
| IS_HIGH_WEALTH | VARCHAR(10) | Yes | No |
| MARITAL_STATUS | VARCHAR(50) | Yes | No |
| MORTGAGE_BALANCE | NUMBER(18,0) | Yes | No |
| PRODUCT_COUNT | NUMBER(2,0) | Yes | No |
| STUDENT_OR_OTHER_LOANS | NUMBER(18,0) | Yes | No |
| TOTAL_PENSIONS | NUMBER(2,0) | Yes | No |
| TOTAL_PENSION_VALUE | NUMBER(18,0) | Yes | No |

---

## CUSTOMER_PENSION_DETAILS
Detailed pension and retirement fund information per customer.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| CUSTOMER_ID | VARCHAR(50) | Yes | No |
| ANNUAL_CONTRIBUTION_AMOUNT | NUMBER(18,2) | Yes | No |
| ANY_WITHDRAWALS_FROM_PENSION | VARCHAR(10) | Yes | No |
| CONTRIBUTIONS_CURRENTLY_BEING_MADE_EMPLOYEE | NUMBER(18,0) | Yes | No |
| CONTRIBUTIONS_CURRENTLY_BEING_MADE_EMPLOYER | NUMBER(18,0) | Yes | No |
| CONTRIBUTIONS_LAST_8_TAX_YEARS | NUMBER(18,0) | Yes | No |
| CRYSTALLISED | VARCHAR(10) | Yes | No |
| CURRENT_TAX_FREE_CASH_ENTITLEMENT_AMOUNT | NUMBER(18,0) | Yes | No |
| CURRENT_VALUE_OF_CRYSTALLISED_FUNDS | NUMBER(18,0) | Yes | No |
| CURRENT_VALUE_OF_UNCRYSTALLISED_FUNDS | NUMBER(18,0) | Yes | No |
| DATE_POLICY_COMMENCED | DATE | Yes | No |
| DEATH_BENEFITS | VARCHAR(200) | Yes | No |
| DEATH_BENEFIT_DETAILS | VARCHAR(200) | Yes | No |
| EMPLOYEE_CONTRIBUTIONS | NUMBER(18,2) | Yes | No |
| EMPLOYER_CONTRIBUTIONS | NUMBER(18,0) | Yes | No |
| EMPLOYER_NAME | VARCHAR(200) | Yes | No |
| EXIT_FEES_CHARGES_PENALTIES | NUMBER(18,0) | Yes | No |
| FULLY_CRYSTALLISED | VARCHAR(10) | Yes | No |
| FUND_PERFORMANCE | VARCHAR(50) | Yes | No |
| FUND_VALUE | NUMBER(18,0) | Yes | No |
| HAS_CUSTOMER_MADE_PERSONAL_CONTRIBUTIONS | VARCHAR(10) | Yes | No |
| INCOME_DRAWDOWN | VARCHAR(10) | Yes | No |
| INVESTMENT_TYPE | VARCHAR(100) | Yes | No |
| LIFE_ASSURANCE | VARCHAR(10) | Yes | No |
| PENSION_NAME | VARCHAR(200) | Yes | No |
| PENSION_SCHEME_TAX_REFERENCE | VARCHAR(50) | Yes | No |
| PENSION_TYPE | VARCHAR(100) | Yes | No |
| POLICY_FEES | NUMBER(18,0) | Yes | No |
| POLICY_NUMBER | VARCHAR(50) | Yes | No |
| POWER_OF_ATTORNEY | VARCHAR(10) | Yes | No |
| PRODUCT_TYPE | VARCHAR(100) | Yes | No |
| REMAINING_ISA_ALLOWANCE | NUMBER(18,0) | Yes | No |
| SPOUSE_BENEFITS | VARCHAR(200) | Yes | No |
| TAX_FREE_CASH_AMOUNT | NUMBER(18,0) | Yes | No |
| TOTAL_INVESTABLE_ASSETS | NUMBER(18,0) | Yes | No |
| TOTAL_PENSION_VALUE | NUMBER(18,0) | Yes | No |

---

## CUSTOMER_COMMUNICATION
Customer communication preferences and consent information.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| COMMUNICATION_ID | VARCHAR(50) | No | Yes |
| CUSTOMER_ID | VARCHAR(50) | Yes | No |
| CONSENT_TO_EMAIL | VARCHAR(10) | Yes | No |
| CONSENT_TO_PHONE | VARCHAR(10) | Yes | No |
| CONSENT_TO_POST | VARCHAR(10) | Yes | No |
| CONSENT_TO_SMS | VARCHAR(10) | Yes | No |
| CONTACT_FREQUENCY_AND_METHOD | VARCHAR(200) | Yes | No |
| DIGITAL_CHANNEL_COUNT | NUMBER(2,0) | Yes | No |
| PREFERRED_COMMUNICATION_CHANNEL | VARCHAR(50) | Yes | No |
| PREFERRED_CONTACT_TIME | VARCHAR(50) | Yes | No |
| USES_DIGITAL_CHANNEL | VARCHAR(10) | Yes | No |

---

## CUSTOMER_INTERACTION_AND_LEADS
Customer marketing interactions, lead tracking, and campaign responses.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| CUSTOMER_ID | VARCHAR(50) | No | Yes |
| ATTENDED_SEMINAR | VARCHAR(10) | Yes | No |
| CAMPAIGN_RESPONSE | VARCHAR(100) | Yes | No |
| LAST_INTERACTION_DATE | DATE | Yes | No |
| LEAD_CONVERSION_RATE | NUMBER(10,5) | Yes | No |
| LEAD_CONVERTED | VARCHAR(10) | Yes | No |
| MARKETING_CHANNEL | VARCHAR(100) | Yes | No |
| REGISTERED_INTEREST | VARCHAR(10) | Yes | No |

---

## CUSTOMER_PRODUCTS
Customer product holdings and portfolio flags.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| CUSTOMER_ID | VARCHAR(50) | No | Yes |
| HAS_BOND | VARCHAR(10) | Yes | No |
| HAS_GENERAL_INSURANCE_PRODUCTS | VARCHAR(10) | Yes | No |
| HAS_HEALTH_PLAN | VARCHAR(10) | Yes | No |
| HAS_HEALTH_PRODUCTS | VARCHAR(10) | Yes | No |
| HAS_INSURANCE_PRODUCT | VARCHAR(10) | Yes | No |
| HAS_INVESTMENT_ACCOUNT | VARCHAR(10) | Yes | No |
| HAS_INVESTMENT_PRODUCTS | VARCHAR(10) | Yes | No |
| HAS_ISA | VARCHAR(10) | Yes | No |
| HAS_PENSIONS_CURRENT_OR_STAFF | VARCHAR(10) | Yes | No |
| HAS_PROTECTION_POLICY | VARCHAR(10) | Yes | No |
| HAS_PROTECTION_PRODUCTS | VARCHAR(10) | Yes | No |
| IS_MULTI_PRODUCT | VARCHAR(10) | Yes | No |
| PRODUCT_COUNT | NUMBER(2,0) | Yes | No |

---

## CUSTOMER_MINDSET
Customer behavioral and risk profile attributes.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| CUSTOMER_ID | VARCHAR(50) | No | Yes |
| ATTITUDE_TOWARDS_INVESTMENT_RISK | VARCHAR(100) | Yes | No |
| ATTITUDE_TOWARDS_PENSION_RISK | VARCHAR(100) | Yes | No |
| ATTITUDE_TOWARDS_RISK_POST_CRYSTALLISATION | VARCHAR(100) | Yes | No |
| DECISION_MAKING_STYLE | VARCHAR(100) | Yes | No |
| ESG_PREFERENCE | VARCHAR(50) | Yes | No |
| INVESTMENT_KNOWLEDGE_LEVEL | VARCHAR(50) | Yes | No |
| MARKETING_ENGAGEMENT_LEVEL | VARCHAR(50) | Yes | No |
| RESPONSIVENESS_TO_MARKETING | VARCHAR(200) | Yes | No |
| RISK_CATEGORY | VARCHAR(50) | Yes | No |
| RISK_SCORE | NUMBER(2,0) | Yes | No |

---

## CWE_DATA
Customer service call center metrics and engagement data.

| Column | Data Type | Nullable | Primary Key |
|--------|-----------|----------|-------------|
| CUSTOMER_ID | VARCHAR(50) | No | Yes |
| AVERAGE_CALL_TIME | NUMBER(5,0) | Yes | No |
| AVERAGE_HOLD_TIME | NUMBER(5,0) | Yes | No |
| AVERAGE_HOLD_TIME_MINUTES | NUMBER(10,2) | Yes | No |
| GRAND_TOTAL | NUMBER(10,0) | Yes | No |
| NUMBER_OF_INBOUND_CALLS | NUMBER(10,0) | Yes | No |
| NUMBER_OF_NURTURE_CALLS | NUMBER(10,0) | Yes | No |
| NUMBER_OF_OUTBOUND_CALLS | NUMBER(10,0) | Yes | No |
| NUMBER_OF_REPEAT_CUSTOMER_CALLS | NUMBER(10,0) | Yes | No |
| NUMBER_OF_TOTAL_CALLS | NUMBER(10,0) | Yes | No |
| NUMBER_OF_WEB_CALL_BACK_FORMS | NUMBER(10,0) | Yes | No |
| SERVICE_QUALITY_INDICATOR | VARCHAR(50) | Yes | No |
| TOTAL_TOUCHPOINTS | NUMBER(10,0) | Yes | No |
| TOTAL_WEB_CALLBACKS | NUMBER(10,0) | Yes | No |