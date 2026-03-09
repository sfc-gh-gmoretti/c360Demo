import { NextRequest, NextResponse } from "next/server";
import { saveConfig } from "@/lib/config-store";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const configStr = formData.get("config") as string;
    const logo = formData.get("logo") as File | null;
    const privateKey = formData.get("privateKey") as File | null;

    const config = JSON.parse(configStr);

    const configDir = process.env.CONFIG_PATH
      ? path.dirname(process.env.CONFIG_PATH)
      : "/app/config";

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (logo) {
      const logoPath = path.join(configDir, "logo.png");
      const buffer = Buffer.from(await logo.arrayBuffer());
      fs.writeFileSync(logoPath, buffer);
      config.logoPath = "/config/logo.png";
    }

    if (privateKey) {
      const keyPath = path.join(configDir, "rsa_key.p8");
      const keyContent = await privateKey.text();
      fs.writeFileSync(keyPath, keyContent);
      
      if (config.snowflake) {
        config.snowflake.privateKeyPath = keyPath;
        config.snowflake.privateKey = keyContent;
      }
    }

    saveConfig(config);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error saving config:", err);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
