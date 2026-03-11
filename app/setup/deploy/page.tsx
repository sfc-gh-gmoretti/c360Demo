"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  CheckCircle,
  XCircle,
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
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { SNOWFLAKE_OBJECTS, COMPUTE_POOL_CONFIG, getRegistryUrl, ObjectStatus } from "@/lib/setup/constants";

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
    pat?: string;
  } | null>(null);

  const [checkingInfra, setCheckingInfra] = useState(false);
  const [infraStatus, setInfraStatus] = useState<ObjectStatus[]>([]);
  const [infraChecked, setInfraChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [availableImages, setAvailableImages] = useState<{tag: string; createdOn: string; digest: string}[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const hasLoadedRef = React.useRef(false);
  const [stateLoaded, setStateLoaded] = useState(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const sfConfig = localStorage.getItem("snowflakeConfig");
    let currentAccount = "";
    if (sfConfig) {
      const config = JSON.parse(sfConfig);
      setSnowflakeConfig(config);
      currentAccount = config.account || "";
    }

    const stored = localStorage.getItem("deployState");
    if (stored) {
      const state = JSON.parse(stored);
      if (state.account === currentAccount) {
        setInfrastructureReady(state.infrastructureReady || false);
        setImagePushed(state.imagePushed || false);
        setServiceStarted(state.serviceStarted || false);
        if (state.appUrl) setAppUrl(state.appUrl);
      } else {
        localStorage.removeItem("deployState");
      }
    }

    setMounted(true);
    setTimeout(() => setStateLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (stateLoaded && snowflakeConfig && !infraChecked) {
      checkInfrastructure();
    }
  }, [stateLoaded, snowflakeConfig, infraChecked]);

  useEffect(() => {
    if (stateLoaded && snowflakeConfig) {
      localStorage.setItem(
        "deployState",
        JSON.stringify({
          account: snowflakeConfig.account,
          infrastructureReady,
          imagePushed,
          serviceStarted,
          appUrl,
        })
      );
    }
  }, [infrastructureReady, imagePushed, serviceStarted, appUrl, stateLoaded, snowflakeConfig]);

  const resetDeployState = () => {
    localStorage.removeItem("deployState");
    setInfrastructureReady(false);
    setImagePushed(false);
    setServiceStarted(false);
    setAppUrl("");
    setInfraChecked(false);
    setInfraStatus([]);
    checkInfrastructure();
  };

  const checkInfrastructure = async () => {
    if (!snowflakeConfig) return;
    setCheckingInfra(true);

    try {
      const res = await fetch("/api/setup/check-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snowflakeConfig),
      });

      const data = await res.json();
      if (data.success) {
        setInfraStatus(data.objects);
        setInfraChecked(true);
        
        await fetchAppUrl();
        fetchAvailableImages();
      }
    } catch (err) {
      console.error("Failed to check infrastructure:", err);
    } finally {
      setCheckingInfra(false);
    }
  };

  const fetchAppUrl = async () => {
    if (!snowflakeConfig) return;
    try {
      const res = await fetch("/api/setup/get-app-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-snowflake-config": JSON.stringify(snowflakeConfig),
        },
      });
      const data = await res.json();
      if (data.url) {
        setAppUrl(data.url);
        setServiceStarted(true);
      } else {
        setAppUrl("");
      }
    } catch {
      setAppUrl("");
    }
  };

  const fetchAvailableImages = async () => {
    if (!snowflakeConfig) return;
    setLoadingImages(true);
    try {
      const res = await fetch("/api/setup/list-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snowflakeConfig),
      });
      const data = await res.json();
      if (data.images) {
        setAvailableImages(data.images);
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
    } finally {
      setLoadingImages(false);
    }
  };

  const isIdle = stage === "idle" || stage === "complete";

  const requiredForDeploy = [
    SNOWFLAKE_OBJECTS.DATABASE,
    SNOWFLAKE_OBJECTS.SCHEMA,
    SNOWFLAKE_OBJECTS.WAREHOUSE,
    SNOWFLAKE_OBJECTS.WEBAPP_POOL,
    SNOWFLAKE_OBJECTS.ML_POOL,
    SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY,
    SNOWFLAKE_OBJECTS.NETWORK_RULE,
    SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS,
  ];

  const missingInfra = infraStatus.filter(
    (obj) => requiredForDeploy.includes(obj.name as typeof requiredForDeploy[number]) && !obj.exists
  );
  const allInfraReady = infraChecked && missingInfra.length === 0;

  const prepareInfrastructure = async () => {
    if (currentAction || !snowflakeConfig) return;
    setCurrentAction("prepare");
    setStage("building");
    setLogs([]);

    try {
      const response = await fetch("/api/setup/deploy", {
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
      await checkInfrastructure();
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
      const response = await fetch("/api/setup/docker-push", {
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
      const response = await fetch("/api/setup/deploy", {
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
      disabled: !infrastructureReady || !isIdle || !allInfraReady,
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

  const getInfraObjectStatus = (name: string) => infraStatus.find((o) => o.name === name);

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
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
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-5 w-5 text-[#29B5E8]" />
            Infrastructure Status
          </h3>
          <div className="flex items-center gap-3">
            <button
              onClick={resetDeployState}
              className="text-sm text-orange-600 hover:text-orange-800"
            >
              Reset State
            </button>
            <button
              onClick={checkInfrastructure}
              disabled={checkingInfra}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${checkingInfra ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {!infraChecked && checkingInfra && (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Checking infrastructure...
          </div>
        )}

        {infraChecked && missingInfra.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Missing Infrastructure</h4>
                <p className="text-sm text-amber-700 mt-1">
                  The following required objects are missing. Go back to Step 2 (Snowflake) to create them, or run &ldquo;Prepare Infrastructure&rdquo; below.
                </p>
                <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                  {missingInfra.map((obj) => (
                    <li key={obj.name}>{obj.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {infraChecked && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {requiredForDeploy.map((name) => {
              const status = getInfraObjectStatus(name);
              return (
                <div
                  key={name}
                  className={`p-3 rounded-lg ${
                    status?.exists ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {status?.exists ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs font-medium text-gray-700 truncate">{name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Image Tag</label>
                <button
                  onClick={fetchAvailableImages}
                  disabled={loadingImages}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingImages ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <input
                type="text"
                className="input"
                value={imageTag}
                onChange={(e) => setImageTag(e.target.value)}
                disabled={!isIdle}
              />
              {availableImages.length > 0 && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                  <div className="text-gray-500 mb-1">Available in repository:</div>
                  <div className="flex flex-wrap gap-1">
                    {availableImages.map((img) => (
                      <button
                        key={img.tag}
                        onClick={() => setImageTag(img.tag)}
                        disabled={!isIdle}
                        className={`px-2 py-1 rounded transition-colors ${
                          imageTag === img.tag
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-blue-100"
                        } disabled:opacity-50`}
                        title={`Created: ${new Date(img.createdOn).toLocaleString()}`}
                      >
                        {img.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                        <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                      ) : isActive ? (
                        <Loader2 className="h-5 w-5 shrink-0 text-blue-500 animate-spin" />
                      ) : (
                        <Icon
                          className={`h-5 w-5 shrink-0 ${step.disabled ? "text-gray-400" : "text-gray-600"}`}
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
                    {(!step.done || step.id === "push" || step.id === "deploy") && (
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
                        {isActive ? "Running..." : step.done ? (step.id === "deploy" ? "Restart" : "Rebuild") : "Run"}
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
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => router.push("/setup/data")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <button
          onClick={() => router.push("/setup/test")}
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
