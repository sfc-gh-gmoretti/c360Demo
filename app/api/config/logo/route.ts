import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const possiblePaths = [
    "/app/config/logo.png",
    path.join(process.cwd(), "config", "logo.png"),
  ];

  for (const logoPath of possiblePaths) {
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return new NextResponse(logoBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}
