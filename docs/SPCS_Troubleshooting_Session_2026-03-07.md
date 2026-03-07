# SPCS Troubleshooting Session - March 7, 2026

## Session Overview

**Application:** Aviva Customer 360 Intelligence  
**Endpoint:** https://awey5-sfseeurope-eu-demo86.snowflakecomputing.app/  
**Snowflake Account:** SFSEEUROPE-EU_DEMO86  
**Database/Schema:** CUSTOMER_DEMO.PUBLIC  
**SPCS Service:** AVIVA_CUSTOMER360_APP

---

## Test Results

### Chat Functionality - WORKING

Successfully tested the chat feature with the following query:
- **Query:** "How many customers do we have by age group?"
- **Result:** Agent processed query via Cortex Analyst and returned:
  - 60-69: 1,579 customers
  - 50-59: 1,707 customers
  - 40-49: 1,354 customers
  - 30-39: 1,130 customers
  - Under 30: 718 customers
  - 70+: 512 customers
- **Visualization:** Chart rendered successfully

### Analysis Feature - TROUBLESHOOTING

**Issue Identified:** SPCS IP Whitelist errors in logs

```
IP/Token 153.45.52.130 is not allowed to access Snowflake
IP/Token 153.45.52.129 is not allowed to access Snowflake
```

---

## Network Configuration Status

### Network Policy: ACCOUNT_VPN_POLICY_SE

| Property | Value |
|----------|-------|
| Allowed IP List Entries | 99 |
| Allowed Network Rules | 1 |

### Network Rule: CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS

**Status:** Properly attached to network policy

**IP Range Covered:**
```
153.45.52.128 - 153.45.52.160 (33 IPs)
```

**Blocked IPs from Logs:**
- 153.45.52.129 ✓ (in range)
- 153.45.52.130 ✓ (in range)

---

## Analysis Route Details

**File:** `app/api/customers/[customerId]/analyze/route.ts`

**Function:** Generates comprehensive customer analysis using Cortex COMPLETE

**Model Used:** `claude-4-sonnet`

**Query Structure:**
```sql
SELECT SNOWFLAKE.CORTEX.COMPLETE('claude-4-sonnet', '<prompt>') as ANALYSIS
```

**Data Sources Queried (7 tables):**
1. CUSTOMER_DEMOGRAPHICS
2. CUSTOMER_COMMUNICATION
3. CUSTOMER_PENSION_DETAILS
4. CUSTOMER_MINDSET
5. CUSTOMER_PRODUCTS
6. CUSTOMER_INTERACTION_AND_LEADS
7. CWE_DATA

---

## Findings

### Network Policy Configuration
The SPCS egress IPs network rule IS properly attached to the account network policy:

```json
{
  "ALLOWED_NETWORK_RULE_LIST": [
    {"fullyQualifiedRuleName": "CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS"}
  ]
}
```

The blocked IPs (153.45.52.129, 153.45.52.130) ARE within the allowed range.

### Potential Root Causes to Investigate

1. **Timing/Propagation Issue:** Network policy changes may take time to propagate
2. **Token-based Blocking:** Error mentions "IP/Token" - could be OAuth token validation
3. **Request Origin:** Requests originating from specific container instances
4. **Log Timestamps:** Old log entries from before the fix was applied

---

## Recurring Issue: Network Policy Fix

This is a known recurring issue. When SPCS calls fail, run:

```sql
-- Check if fix is needed
SHOW NETWORK POLICIES
-- Look for entries_in_allowed_network_rules = 0

-- If needed, apply fix:
ALTER NETWORK POLICY ACCOUNT_VPN_POLICY_SE SET 
  ALLOWED_NETWORK_RULE_LIST = ('CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS');
```

---

## Quick Reference Commands

```sql
-- Check service status
SELECT SYSTEM$GET_SERVICE_STATUS('CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP')

-- Get service logs
SELECT SYSTEM$GET_SERVICE_LOGS('CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP', 0, 'app', 200)

-- Check network policies
SHOW NETWORK POLICIES

-- Describe network policy
DESCRIBE NETWORK POLICY ACCOUNT_VPN_POLICY_SE

-- Check SPCS egress rule
DESCRIBE NETWORK RULE CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS

-- Get platform SPCS IPs
SELECT SYSTEM$GET_SNOWFLAKE_PLATFORM_INFO()
```

---

## Next Steps

1. **Verify Analysis Feature:** Test the customer analysis from the UI to confirm current status
2. **Clear Old Logs:** Old error logs may be from before the fix was applied
3. **Monitor for Recurrence:** If issue returns, investigate why network policy loses the rule
4. **Consider Permanent Fix:** Add monitoring/alerting for network policy configuration

---

## Pending Implementation Tasks

From previous session - Voice Recorder Integration:
1. Replace Web Speech API with MediaRecorder API
2. Create audio upload API endpoint
3. Create transcription API endpoint using AI_TRANSCRIBE
4. Update analyze-transcript API for summary extraction
5. Add real-time agent streaming UI

---

## Session Info

- **Date:** March 7, 2026
- **Connection:** Demo86
- **Project Directory:** `/Users/gmoretti/Documents/SnowflakeCOCO/Customer360/aviva-customer360`
