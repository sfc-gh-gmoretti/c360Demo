"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Shield,
  Info,
} from "lucide-react";
import { SNOWFLAKE_OBJECTS, COMPUTE_POOL_CONFIG, ObjectStatus } from "@/lib/constants";

interface SetupStep {
  name: string;
  status: "pending" | "running" | "done" | "error";
  message?: string;
}

export default function SnowflakePage() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "connected" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState("");
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);
  const [objectStatuses, setObjectStatuses] = useState<ObjectStatus[]>([]);
  const [checkingObjects, setCheckingObjects] = useState(false);
  const [modelDeploying, setModelDeploying] = useState(false);
  const [modelStatus, setModelStatus] = useState<string | null>(null);
  const [config, setConfig] = useState({
    account: "",
    user: "",
    pat: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("snowflakeConfig");
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        setConfig((prev) => ({
          ...prev,
          account: savedConfig.account || prev.account,
          user: savedConfig.user || prev.user,
          pat: savedConfig.pat || prev.pat,
        }));
        if (savedConfig.connected) {
          setConnectionStatus("connected");
        }
      } catch (e) {
        console.error("Error loading saved config:", e);
      }
    }
  }, []);

  const testConnection = async () => {
    setConnectionStatus("testing");
    setConnectionError("");

    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          database: SNOWFLAKE_OBJECTS.DATABASE,
          schema: SNOWFLAKE_OBJECTS.SCHEMA,
          warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setConnectionStatus("connected");
        localStorage.setItem(
          "snowflakeConfig",
          JSON.stringify({
            account: config.account,
            user: config.user,
            pat: config.pat,
            database: SNOWFLAKE_OBJECTS.DATABASE,
            schema: SNOWFLAKE_OBJECTS.SCHEMA,
            warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
            connected: true,
          })
        );
      } else {
        setConnectionStatus("error");
        setConnectionError(data.error || "Connection failed");
      }
    } catch {
      setConnectionStatus("error");
      setConnectionError("Failed to test connection");
    }
  };

  const checkObjects = async () => {
    setCheckingObjects(true);
    setObjectStatuses([]);

    try {
      const res = await fetch("/api/check-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (data.success) {
        setObjectStatuses(data.objects);
      } else {
        console.error("Failed to check objects:", data.error);
      }
    } catch (err) {
      console.error("Error checking objects:", err);
    } finally {
      setCheckingObjects(false);
    }
  };

  const runSetup = async () => {
    setSetupRunning(true);
    setSetupSteps([]);

    try {
      const setupConfig = {
        ...config,
        database: SNOWFLAKE_OBJECTS.DATABASE,
        schema: SNOWFLAKE_OBJECTS.SCHEMA,
        warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
      };

      const response = await fetch("/api/run-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupConfig),
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
          const data = JSON.parse(line.replace("data: ", ""));
          setSetupSteps((prev) => {
            const existing = prev.find((s) => s.name === data.name);
            if (existing) {
              return prev.map((s) =>
                s.name === data.name ? { ...s, ...data } : s
              );
            }
            return [...prev, data];
          });
        }
      }

      await checkObjects();
    } catch (err) {
      console.error("Setup error:", err);
    } finally {
      setSetupRunning(false);
    }
  };

  const deployModel = async () => {
    setModelDeploying(true);
    setModelStatus(null);

    try {
      const response = await fetch("/api/deploy-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
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
          const data = JSON.parse(line.replace("data: ", ""));
          if (data.error) {
            setModelStatus(`Error: ${data.error}`);
          } else if (data.model) {
            setModelStatus(`Model deployed: ${data.model}`);
          } else if (data.progress) {
            setModelStatus(data.progress);
          }
        }
      }

      await checkObjects();
    } catch (err) {
      setModelStatus(`Error: ${(err as Error).message}`);
    } finally {
      setModelDeploying(false);
    }
  };

  const allObjectsExist =
    objectStatuses.length > 0 && objectStatuses.every((o) => o.exists);
  const missingObjects = objectStatuses.filter((o) => !o.exists);
  const canContinue = connectionStatus === "connected" && allObjectsExist;

  const handleContinue = () => {
    router.push("/data");
  };

  const requiredObjects = [
    { name: SNOWFLAKE_OBJECTS.DATABASE, type: "database", label: "Database" },
    { name: SNOWFLAKE_OBJECTS.SCHEMA, type: "schema", label: "Schema" },
    { name: SNOWFLAKE_OBJECTS.WAREHOUSE, type: "warehouse", label: "Warehouse" },
    {
      name: SNOWFLAKE_OBJECTS.WEBAPP_POOL,
      type: "compute_pool",
      label: `Compute Pool (Web) - ${COMPUTE_POOL_CONFIG.INSTANCE_FAMILY}`,
    },
    {
      name: SNOWFLAKE_OBJECTS.ML_POOL,
      type: "compute_pool",
      label: `Compute Pool (ML) - ${COMPUTE_POOL_CONFIG.INSTANCE_FAMILY}`,
    },
    {
      name: SNOWFLAKE_OBJECTS.IMAGE_REPOSITORY,
      type: "image_repository",
      label: "Image Repository",
    },
    {
      name: SNOWFLAKE_OBJECTS.SEMANTIC_VIEW,
      type: "semantic_view",
      label: "Semantic View",
    },
    { name: SNOWFLAKE_OBJECTS.AGENT, type: "agent", label: "Cortex Agent" },
    {
      name: SNOWFLAKE_OBJECTS.NETWORK_RULE,
      type: "network_rule",
      label: "Network Rule",
    },
    {
      name: SNOWFLAKE_OBJECTS.EXTERNAL_ACCESS,
      type: "external_access",
      label: "External Access Integration",
    },
    {
      name: SNOWFLAKE_OBJECTS.ML_MODEL_STAGE,
      type: "stage",
      label: "ML Model Stage",
    },
    {
      name: SNOWFLAKE_OBJECTS.ML_MODEL,
      type: "ml_model",
      label: "Cross-Sell ML Model",
    },
  ];

  const getObjectStatus = (name: string) => {
    return objectStatuses.find((o) => o.name === name);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Step 2: Connect to Snowflake
        </h2>
        <p className="text-gray-600 mt-1">
          Configure your Snowflake connection using a Programmatic Access Token (PAT)
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-[#29B5E8]" />
              Connection Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">Account Identifier *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ABC12345.us-east-1"
                  value={config.account}
                  onChange={(e) =>
                    setConfig({ ...config, account: e.target.value })
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  e.g., SFSEEUROPE-EU_DEMO86
                </p>
              </div>

              <div>
                <label className="label">Username *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="admin"
                  value={config.user}
                  onChange={(e) =>
                    setConfig({ ...config, user: e.target.value })
                  }
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">PAT Authentication</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your PAT will be securely stored as a Snowflake Secret and used for SQL API authentication.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Programmatic Access Token (PAT) *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter your PAT"
                  value={config.pat}
                  onChange={(e) =>
                    setConfig({ ...config, pat: e.target.value })
                  }
                />
                <div className="flex items-start gap-2 mt-2">
                  <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-500">
                    Generate a PAT in Snowsight: User Menu → Settings → Access Tokens → Generate Token
                  </p>
                </div>
              </div>

              <button
                onClick={testConnection}
                disabled={
                  connectionStatus === "testing" ||
                  !config.account ||
                  !config.user ||
                  !config.pat
                }
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {connectionStatus === "testing" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>

              {connectionStatus === "connected" && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  Connected successfully!
                </div>
              )}

              {connectionStatus === "error" && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <XCircle className="h-5 w-5" />
                  {connectionError}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                Required Snowflake Objects
              </h3>
              <button
                onClick={checkObjects}
                disabled={connectionStatus !== "connected" || checkingObjects}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`h-4 w-4 ${checkingObjects ? "animate-spin" : ""}`}
                />
                Verify
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              These objects will be created with fixed names to ensure deployment works correctly.
            </p>

            <div className="space-y-2 mb-4">
              {requiredObjects.map((obj) => {
                const status = getObjectStatus(obj.name);
                return (
                  <div
                    key={obj.name}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      status?.exists
                        ? "bg-green-50"
                        : status
                        ? "bg-red-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {obj.label}
                      </span>
                      <p className="text-xs text-gray-500">{obj.name}</p>
                    </div>
                    {status ? (
                      status.exists ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                );
              })}
            </div>

            {connectionStatus === "connected" && (
              <div className="space-y-3">
                <button
                  onClick={runSetup}
                  disabled={setupRunning}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {setupRunning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Objects...
                    </>
                  ) : missingObjects.length > 0 ? (
                    `Create ${missingObjects.length - (getObjectStatus(SNOWFLAKE_OBJECTS.ML_MODEL)?.exists ? 0 : 1)} Missing Objects`
                  ) : objectStatuses.length === 0 ? (
                    "Create All Objects"
                  ) : (
                    "Recreate All Objects"
                  )}
                </button>

                {getObjectStatus(SNOWFLAKE_OBJECTS.ML_MODEL_STAGE)?.exists && !getObjectStatus(SNOWFLAKE_OBJECTS.ML_MODEL)?.exists && (
                  <button
                    onClick={deployModel}
                    disabled={modelDeploying}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {modelDeploying ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Deploying ML Model...
                      </>
                    ) : (
                      "Deploy ML Model to Registry"
                    )}
                  </button>
                )}

                {modelStatus && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    modelStatus.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  }`}>
                    {modelStatus.includes("Error") ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                    <span className="text-sm">{modelStatus}</span>
                  </div>
                )}
              </div>
            )}

            {setupSteps.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {setupSteps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      step.status === "done"
                        ? "bg-green-50 text-green-700"
                        : step.status === "error"
                        ? "bg-red-50 text-red-700"
                        : step.status === "running"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {step.status === "done" && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {step.status === "running" && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {step.status === "error" && <XCircle className="h-4 w-4" />}
                    {step.status === "pending" && (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className="text-sm">{step.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => router.push("/branding")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="btn-primary flex items-center gap-2"
        >
          Continue to Sample Data
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
