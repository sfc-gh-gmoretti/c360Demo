import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import { getRegistryUrl } from "@/lib/constants";

function getCustomer360Path(): string {
  if (existsSync("/app/customer-360/Dockerfile")) {
    return "/app/customer-360";
  }
  const localPath = resolve(process.cwd(), "..");
  if (existsSync(resolve(localPath, "Dockerfile"))) {
    return localPath;
  }
  return process.cwd();
}

export async function POST(request: NextRequest) {
  const { account, imageTag } = await request.json();

  const encoder = new TextEncoder();
  const repoUrl = getRegistryUrl(account);
  const fullImageName = `${repoUrl}/c360-app:${imageTag}`;
  const dockerContext = getCustomer360Path();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const log = (message: string, type: "info" | "success" | "error" = "info") => {
        send({ log: { message, type } });
      };

      const runCommand = (
        cmd: string,
        args: string[]
      ): Promise<void> => {
        return new Promise((resolve, reject) => {
          const proc = spawn(cmd, args, {
            env: process.env,
            cwd: dockerContext,
            shell: true,
          });

          proc.stdout.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean);
            lines.forEach((line: string) => log(line));
          });

          proc.stderr.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean);
            lines.forEach((line: string) => log(line));
          });

          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
          });

          proc.on("error", reject);
        });
      };

      const runShellScript = (script: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const proc = spawn("bash", ["-c", script], {
            env: process.env,
            cwd: dockerContext,
          });

          proc.stdout.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean);
            lines.forEach((line: string) => log(line));
          });

          proc.stderr.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean);
            lines.forEach((line: string) => log(line));
          });

          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
          });

          proc.on("error", reject);
        });
      };

      try {
        send({ stage: "building" });
        log("Building Docker image for linux/amd64 using buildx...");
        log(`Context: ${dockerContext}`);
        await runCommand("docker", [
          "buildx", "build", "--platform", "linux/amd64", "--load",
          "-t", "c360-app:latest", "."
        ]);
        log("Docker image built successfully", "success");

        send({ stage: "tagging" });
        log(`Tagging image as ${fullImageName}...`);
        await runCommand("docker", ["tag", "c360-app:latest", fullImageName]);
        log("Image tagged", "success");

        send({ stage: "pushing" });
        log("Logging in and pushing to Snowflake registry...");
        log("This may take a few minutes...");
        await runShellScript(`snow spcs image-registry login && docker push "${fullImageName}"`);
        log("Image pushed successfully!", "success");

        send({ stage: "complete", success: true });
        log("Image is now available in Snowflake", "success");
      } catch (err) {
        log(`Error: ${(err as Error).message}`, "error");
        send({ stage: "error", success: false });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
