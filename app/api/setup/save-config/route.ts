import { NextRequest, NextResponse } from "next/server";
import { saveConfig } from "@/lib/setup/config-store";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const configStr = formData.get("config") as string;
    const logo = formData.get("logo") as File | null;

    const config = JSON.parse(configStr);

    let configDir = process.env.CONFIG_PATH
      ? path.dirname(process.env.CONFIG_PATH)
      : "/app/config";

    if (!fs.existsSync(configDir)) {
      configDir = path.join(process.cwd(), "config");
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
    }

    if (logo) {
      const logoPath = path.join(configDir, "logo.png");
      const buffer = Buffer.from(await logo.arrayBuffer());
      fs.writeFileSync(logoPath, buffer);
      config.logoPath = "/config/logo.png";
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
