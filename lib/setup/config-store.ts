import fs from "fs";
import path from "path";

export interface Config {
  companyName: string;
  companyNameFull: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
  snowflake: {
    account: string;
    user: string;
    database: string;
    schema: string;
    warehouse: string;
    pat?: string;
  };
  deployment: {
    computePool: string;
    imageTag: string;
    registry: string;
  };
}

const CONFIG_PATH = process.env.CONFIG_PATH || "/app/config/settings.json";

export function getConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading config:", err);
  }

  return {
    companyName: "",
    companyNameFull: "",
    primaryColor: "#29B5E8",
    secondaryColor: "#0EA5E9",
    logoPath: "/logo.png",
    snowflake: {
      account: "",
      user: "",
      database: "CUSTOMER_360_DEMO",
      schema: "PUBLIC",
      warehouse: "C360_WH",
    },
    deployment: {
      computePool: "C360_WEBAPP_POOL",
      imageTag: "v1",
      registry: "",
    },
  };
}

export function saveConfig(config: Partial<Config>): void {
  const existing = getConfig();
  const merged = { ...existing, ...config };

  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
}

export function updateConfigSection<K extends keyof Config>(
  section: K,
  data: Partial<Config[K]>
): void {
  const existing = getConfig();
  const merged = {
    ...existing,
    [section]: { ...(existing[section] as object), ...data },
  };
  saveConfig(merged);
}
