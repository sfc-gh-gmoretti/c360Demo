"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Package,
  Upload,
  Rocket,
  ExternalLink,
  Box,
  Server,
  Cpu,
} from "lucide-react";
import { SNOWFLAKE_OBJECTS, COMPUTE_POOL_CONFIG, getRegistryUrl } from "@/lib/constants";

type Stage = "idle" | "building" | "pushing" | "deploying" | "complete";

interface DeployLog {
  message: string;
  type: "info" | "success" | "error";
}

export default function DeployPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [appUrl, setAppUrl] = useState("");
  const [infrastructureReady, setInfrastructureReady] = useState(false);
  const [imagePushed, setImagePushed] = useState(false);
  const [serviceStarted, setServiceStarted] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [imageTag, setImageTag] = useState("v1");
  const [snowflakeConfig, setSnowflakeConfig] = useState<{
    account: string;
    user: string;
    password?: string;
    pat?: string;
    authMethod: string;
  } | null>(null);

  const hasLoadedRef = React.useRef(false);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const stored = localStorage.getItem("deployState");
    if (stored) {
      const state = JSON.parse(stored);
      setInfrastructureReady(state.infrastructureReady || false);
      setImagePushed(state.imagePushed || false);
      setServiceStarted(state.serviceStarted || false);
      if (state.appUrl) setAppUrl(state.appUrl);
    }

    const sfConfig = localStorage.getItem("snowflakeConfig");
    if (sfConfig) {
      setSnowflakeConfig(JSON.parse(sfConfig));
    }

    setMounted(true);
    setTimeout(() => setStateLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (stateLoaded) {
      localStorage.setItem(
        "deployState",
        JSON.stringify({
          infrastructureReady,
          imagePushed,
          serviceStarted,
          appUrl,
        })
      );
    }
  }, [infrastructureReady, imagePushed, serviceStarted, appUrl, stateLoaded]);

  const isIdle = stage === "idle" || stage === "complete";

  const prepareInfrastructure = async () => {
    if (currentAction || !snowflakeConfig) return;
    setCurrentAction("prepare");
    setStage("building");
    setLogs([]);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...snowflakeConfig,
          action: "prepare",
          database: SNOWFLAKE_OBJECTS.DATABASE,
          schema: SNOWFLAKE_OBJECTS.SCHEMA,
          warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
          webAppPool: SNOWFLAKE_OBJECTS.WEBAPP_POOL,
          mlInferencePool: SNOWFLAKE_OBJECTS.ML_POOL,
          imageTag,
        }),
      });

      await processStream(response);
      setInfrastructureReady(true);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { message: "Failed: " + (err as Error).message, type: "error" },
      ]);
    }
    setStage("complete");
    setCurrentAction("");
  };

  const buildAndPushImage = async () => {
    if (currentAction || !snowflakeConfig) return;
    setCurrentAction("push");
    setStage("pushing");
    setLogs([]);

    try {
      const response = await fetch("/api/docker-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...snowflakeConfig,
          database: SNOWFLAKE_OBJECTS.DATABASE,
          schema: SNOWFLAKE_OBJECTS.SCHEMA,
          imageTag,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((line) => line.startsWith("data:"));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.log) {
              setLogs((prev) => [...prev, data.log]);
            }
            if (data.success) {
              setImagePushed(true);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { message: "Failed: " + (err as Error).message, type: "error" },
      ]);
    }
    setStage("complete");
    setCurrentAction("");
  };

  const startService = async () => {
    if (currentAction || !snowflakeConfig) return;
    setCurrentAction("deploy");
    setStage("deploying");
    setLogs([]);

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...snowflakeConfig,
          action: "start-service",
          database: SNOWFLAKE_OBJECTS.DATABASE,
          schema: SNOWFLAKE_OBJECTS.SCHEMA,
          warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
          webAppPool: SNOWFLAKE_OBJECTS.WEBAPP_POOL,
          imageTag,
        }),
      });

      await processStream(response);
      setServiceStarted(true);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { message: "Failed: " + (err as Error).message, type: "error" },
      ]);
    }
    setStage("complete");
    setCurrentAction("");
  };

  const processStream = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n").filter((line) => line.startsWith("data:"));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.replace("data: ", ""));
          if (data.log) {
            setLogs((prev) => [...prev, data.log]);
          }
          if (data.url) {
            setAppUrl(data.url);
          }
          if (data.infrastructureReady) {
            setInfrastructureReady(true);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  };

  const steps = [
    {
      id: "prepare",
      label: "1. Prepare Infrastructure",
      description: "Create image repository, network rules, external access",
      icon: Package,
      done: infrastructureReady,
      action: prepareInfrastructure,
      disabled: !isIdle || !snowflakeConfig,
    },
    {
      id: "push",
      label: "2. Build & Push Image",
      description: "Build Docker image and push to Snowflake registry",
      icon: Upload,
      done: imagePushed,
      action: buildAndPushImage,
      disabled: !infrastructureReady || !isIdle,
    },
    {
      id: "deploy",
      label: "3. Start Service",
      description: "Create and start the SPCS service",
      icon: Rocket,
      done: serviceStarted,
      action: startService,
      disabled: !imagePushed || !isIdle,
    },
  ];

  const registryUrl = snowflakeConfig ? getRegistryUrl(snowflakeConfig.account) : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Step 4: Deploy to Snowflake</h2>
        <p className="text-gray-600 mt-1">Build and deploy your Customer 360 app to SPCS</p>
      </div>

      {appUrl && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
              <div>
                <h3 className="text-lg font-bold text-green-800">Deployment Successful!</h3>
                <p className="text-green-700 text-sm">Your Customer 360 app is now live.</p>
              </div>
            </div>
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Open Your App
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Cloud className="h-5 w-5 text-[#29B5E8]" />
            Deployment Configuration
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900 text-sm">Web Application Pool</span>
              </div>
              <div className="text-sm text-gray-600">
                {SNOWFLAKE_OBJECTS.WEBAPP_POOL} ({COMPUTE_POOL_CONFIG.INSTANCE_FAMILY})
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-gray-900 text-sm">ML Inference Pool</span>
              </div>
              <div className="text-sm text-gray-600">
                {SNOWFLAKE_OBJECTS.ML_POOL} ({COMPUTE_POOL_CONFIG.INSTANCE_FAMILY})
              </div>
            </div>

            <div>
              <label className="label">Image Tag</label>
              <input
                type="text"
                className="input"
                value={imageTag}
                onChange={(e) => setImageTag(e.target.value)}
                disabled={!isIdle}
              />
            </div>

            {registryUrl && (
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Registry URL</p>
                <p className="text-sm text-gray-700 font-mono break-all">{registryUrl}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Box className="h-5 w-5 text-[#29B5E8]" />
            Deployment Steps
          </h3>

          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentAction === step.id;
              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    step.done
                      ? "bg-green-50 border-green-200"
                      : isActive
                      ? "bg-blue-50 border-blue-300"
                      : step.disabled
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : isActive ? (
                        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                      ) : (
                        <Icon
                          className={`h-6 w-6 ${step.disabled ? "text-gray-400" : "text-gray-600"}`}
                        />
                      )}
                      <div>
                        <div
                          className={`font-medium ${
                            step.done
                              ? "text-green-700"
                              : step.disabled
                              ? "text-gray-500"
                              : "text-gray-900"
                          }`}
                        >
                          {step.label}
                        </div>
                        <div className="text-sm text-gray-500">{step.description}</div>
                      </div>
                    </div>
                    {(!step.done || step.id === "push") && (
                      <button
                        onClick={step.action}
                        disabled={step.disabled || !!currentAction}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          step.disabled || !!currentAction
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : step.done
                            ? "bg-orange-600 text-white hover:bg-orange-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {isActive ? "Running..." : step.done ? "Rebuild" : "Run"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Logs</h3>
          <div className="bg-slate-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  log.type === "success"
                    ? "text-green-400"
                    : log.type === "error"
                    ? "text-red-400"
                    : "text-gray-300"
                }`}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => router.push("/data")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={() => router.push("/test")}
          disabled={!serviceStarted}
          className="btn-primary flex items-center gap-2"
        >
          Run Network Tests
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
