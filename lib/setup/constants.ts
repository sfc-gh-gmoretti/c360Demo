export const SNOWFLAKE_OBJECTS = {
  DATABASE: "CUSTOMER_360_DEMO",
  SCHEMA: "PUBLIC",
  WAREHOUSE: "C360_WH",
  IMAGE_REPOSITORY: "C360_IMAGES",
  WEBAPP_POOL: "C360_WEBAPP_POOL",
  ML_POOL: "C360_ML_POOL",
  SEMANTIC_VIEW: "CUSTOMER_360_SEMANTIC_VIEW",
  AGENT: "CUSTOMER_360_AGENT",
  NETWORK_RULE: "C360_EGRESS_RULE",
  EXTERNAL_ACCESS: "C360_EXTERNAL_ACCESS",
  SERVICE: "CUSTOMER_360_APP",
  PAT_SECRET: "C360_PAT",
} as const;

export const COMPUTE_POOL_CONFIG = {
  INSTANCE_FAMILY: "CPU_X64_S",
  MIN_NODES: 1,
  MAX_NODES: 1,
  AUTO_SUSPEND_SECS: 300,
} as const;

export const TABLES = [
  "CUSTOMER_DEMOGRAPHICS",
  "CUSTOMER_PENSION_DETAILS",
  "CUSTOMER_COMMUNICATION",
  "CUSTOMER_INTERACTION_AND_LEADS",
  "CUSTOMER_PRODUCTS",
  "CUSTOMER_MINDSET",
  "CWE_DATA",
] as const;

export type SnowflakeObjectType = 
  | "database"
  | "schema"
  | "warehouse"
  | "compute_pool"
  | "image_repository"
  | "semantic_view"
  | "agent"
  | "network_rule"
  | "external_access"
  | "secret";

export interface ObjectStatus {
  name: string;
  type: SnowflakeObjectType;
  exists: boolean;
  error?: string;
}

export interface TableDataStatus {
  table: string;
  rowCount: number;
  hasData: boolean;
}

export function getRegistryUrl(account: string): string {
  const accountForRegistry = account.toLowerCase().replace(/_/g, "-");
  return `${accountForRegistry}.registry.snowflakecomputing.com/${SNOWFLAKE_OBJECTS.DATABASE.toLowerCase()}/${SNOWFLAKE_OBJECTS.SCHEMA.toLowerCase()}/${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY.toLowerCase()}`;
}

export function getImagePath(imageTag: string = "latest"): string {
  return `/${SNOWFLAKE_OBJECTS.DATABASE}/${SNOWFLAKE_OBJECTS.SCHEMA}/${SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY}/c360-app:${imageTag}`;
}
