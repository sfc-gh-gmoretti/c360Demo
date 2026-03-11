import { NextRequest } from "next/server";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { getRegistryUrl, SNOWFLAKE_OBJECTS } from "@/lib/constants";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const config = await request.json();
  const imageTag = config.imageTag || "v1";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const log = (message: string, type: "info" | "success" | "error" = "info") => {
        send({ log: { message, type } });
      };

      try {
        const registryUrl = getRegistryUrl(config.account);
        const fullImageName = `${registryUrl}/c360-app:${imageTag}`;

        log("Checking Docker availability...");
        try {
          await execAsync("docker info");
          log("Docker is running", "success");
        } catch {
          log("Docker is not running. Please start Docker Desktop.", "error");
          return;
        }

        log("Logging into Snowflake registry...");
        try {
          const loginProc = spawn("docker", [
            "login",
            registryUrl,
            "-u", config.user,
            "--password-stdin",
          ]);

          loginProc.stdin.write(config.pat || config.password || "");
          loginProc.stdin.end();

          await new Promise<void>((resolve, reject) => {
            let errorOutput = "";
            loginProc.stderr.on("data", (data) => {
              errorOutput += data.toString();
            });
            loginProc.on("close", (code) => {
              if (code === 0) {
                log("Logged into registry", "success");
                resolve();
              } else {
                reject(new Error(`Login failed: ${errorOutput}`));
              }
            });
          });
        } catch (err) {
          log(`Registry login error: ${(err as Error).message}`, "error");
          return;
        }

        log(`Building Docker image: c360-app:${imageTag} for linux/amd64...`);
        log("This may take several minutes...");

        const buildArgs = [
          "buildx", "build",
          "--platform", "linux/amd64",
          "--no-cache",
          "--load",
          "-t", `c360-app:${imageTag}`,
          "-t", fullImageName,
          "-f", "Dockerfile",
          "."
        ];

        const webappDir = process.env.WEBAPP_DIR || "/webapp";
        const buildProc = spawn("docker", buildArgs, {
          cwd: webappDir,
        });

        await new Promise<void>((resolve, reject) => {
          buildProc.stdout.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean);
            for (const line of lines) {
              if (line.includes("Step") || line.includes("Successfully")) {
                log(line);
              }
            }
          });

          buildProc.stderr.on("data", (data) => {
            const lines = data.toString().split("\n").filter(Boolean);
            for (const line of lines) {
              if (line.includes("#") || line.includes("=>") || line.includes("DONE")) {
                log(line);
              }
            }
          });

          buildProc.on("close", (code) => {
            if (code === 0) {
              log("Docker build completed", "success");
              resolve();
            } else {
              reject(new Error(`Docker build failed with code ${code}`));
            }
          });
        });

        log(`Pushing image to Snowflake: ${fullImageName}...`);
        log("This may take several minutes for the first push...");

        const pushProc = spawn("docker", ["push", fullImageName]);

        await new Promise<void>((resolve, reject) => {
          pushProc.stdout.on("data", (data) => {
            const text = data.toString().trim();
            if (text) log(text);
          });

          pushProc.stderr.on("data", (data) => {
            const text = data.toString().trim();
            if (text && !text.includes("Waiting") && !text.includes("Preparing")) {
              log(text);
            }
          });

          pushProc.on("close", (code) => {
            if (code === 0) {
              log("Image pushed successfully!", "success");
              resolve();
            } else {
              reject(new Error(`Docker push failed with code ${code}`));
            }
          });
        });

        log("", "success");
        log(`Image ready: ${fullImageName}`, "success");
        send({ success: true, imageName: fullImageName });
      } catch (err) {
        log(`Error: ${(err as Error).message}`, "error");
        send({ success: false });
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
