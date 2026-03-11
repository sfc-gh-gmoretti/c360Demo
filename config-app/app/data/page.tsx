"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Users,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { SNOWFLAKE_OBJECTS, TABLES, TableDataStatus } from "@/lib/constants";

interface TableStats {
  table: string;
  rows: number;
}

export default function DataPage() {
  const router = useRouter();
  const [customerCount, setCustomerCount] = useState(1500);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [stats, setStats] = useState<TableStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [dataStatus, setDataStatus] = useState<TableDataStatus[]>([]);
  const [snowflakeConfig, setSnowflakeConfig] = useState<{
    account: string;
    user: string;
    pat?: string;
  } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("snowflakeConfig");
    if (saved) {
      setSnowflakeConfig(JSON.parse(saved));
    }
  }, []);

  const verifyData = async () => {
    if (!snowflakeConfig) return;
    setVerifying(true);
    setDataStatus([]);

    try {
      const res = await fetch("/api/verify-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snowflakeConfig),
      });

      const data = await res.json();
      if (data.success) {
        setDataStatus(data.tables);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const generateData = async () => {
    if (!snowflakeConfig) {
      setError("Snowflake configuration not found. Please complete Step 2 first.");
      return;
    }

    setGenerating(true);
    setProgress([]);
    setStats(null);
    setError(null);

    try {
      const response = await fetch("/api/generate-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: customerCount,
          account: snowflakeConfig.account,
          user: snowflakeConfig.user,
          pat: snowflakeConfig.pat,
          database: SNOWFLAKE_OBJECTS.DATABASE,
          schema: SNOWFLAKE_OBJECTS.SCHEMA,
          warehouse: SNOWFLAKE_OBJECTS.WAREHOUSE,
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
            if (data.progress) {
              setProgress((prev) => [...prev, data.progress]);
            }
            if (data.stats) {
              setStats(data.stats);
            }
            if (data.error) {
              setError(data.error);
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }

      await verifyData();
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setGenerating(false);
    }
  };

  const allDataExists =
    dataStatus.length === TABLES.length && dataStatus.every((t) => t.hasData);
  const totalRows = dataStatus.reduce((sum, t) => sum + t.rowCount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Step 3: Generate Sample Data
        </h2>
        <p className="text-gray-600 mt-1">
          Populate your tables with synthetic customer data for testing
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#29B5E8]" />
              Data Configuration
            </h3>

            <div className="space-y-6">
              <div>
                <label className="label">Number of Customers</label>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={customerCount}
                  onChange={(e) => setCustomerCount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>100</span>
                  <span className="font-semibold text-[#29B5E8]">
                    {customerCount.toLocaleString()} customers
                  </span>
                  <span>5,000</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Target: <strong>{SNOWFLAKE_OBJECTS.DATABASE}.{SNOWFLAKE_OBJECTS.SCHEMA}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  This will create <strong>{customerCount.toLocaleString()}</strong>{" "}
                  records across {TABLES.length} tables:
                </p>
                <ul className="mt-2 text-sm text-gray-500 space-y-1">
                  {TABLES.map((table) => (
                    <li key={table}>• {table}</li>
                  ))}
                </ul>
              </div>

              {!snowflakeConfig && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">Configuration Missing</p>
                    <p className="text-sm text-yellow-700">
                      Please complete Step 2 (Snowflake Setup) before generating data.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={generateData}
                disabled={generating || !snowflakeConfig}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Data...
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5" />
                    Generate Sample Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Database className="h-5 w-5 text-[#29B5E8]" />
                Data Verification
              </h3>
              <button
                onClick={verifyData}
                disabled={!snowflakeConfig || verifying}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${verifying ? "animate-spin" : ""}`} />
                Verify
              </button>
            </div>

            {dataStatus.length > 0 ? (
              <>
                <div className="space-y-2 mb-4">
                  {dataStatus.map((table) => (
                    <div
                      key={table.table}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        table.hasData ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {table.table}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {table.rowCount.toLocaleString()} rows
                        </span>
                        {table.hasData ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {allDataExists && (
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-green-700 font-medium">
                      Total: {totalRows.toLocaleString()} records
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                Click &quot;Verify&quot; to check if data exists in the tables.
              </p>
            )}
          </div>

          {error && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {progress.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Progress</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {progress.map((msg, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg"
                  >
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Data Generated Successfully
              </h3>
              <div className="space-y-2">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {s.table}
                    </span>
                    <span className="text-sm text-gray-500">
                      {s.rows.toLocaleString()} rows
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => router.push("/snowflake")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <button
          onClick={() => router.push("/deploy")}
          className="btn-primary flex items-center gap-2"
        >
          Continue to Deployment
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
