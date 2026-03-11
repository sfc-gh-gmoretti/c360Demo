import fs from "fs";

export interface BrandConfig {
  companyName: string;
  companyNameFull: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
}

const CONFIG_PATH = process.env.CONFIG_PATH || "/app/config/settings.json";

let cachedConfig: BrandConfig | null = null;

export function getBrandConfig(): BrandConfig {
  if (cachedConfig) return cachedConfig;

  const defaults: BrandConfig = {
    companyName: process.env.COMPANY_NAME || "Customer",
    companyNameFull: process.env.COMPANY_NAME_FULL || "Customer Corp",
    primaryColor: process.env.PRIMARY_COLOR || "#29B5E8",
    secondaryColor: process.env.SECONDARY_COLOR || "#0EA5E9",
    logoPath: "/api/config/logo",
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(data);
      cachedConfig = { 
        ...defaults, 
        ...config,
        logoPath: "/api/config/logo",
      };
      return cachedConfig as BrandConfig;
    }
  } catch (err) {
    console.error("Error reading brand config:", err);
  }

  return defaults;
}

export const config = getBrandConfig();
