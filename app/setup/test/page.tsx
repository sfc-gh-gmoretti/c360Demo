"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Play,
  RotateCcw,
  Network,
  Server,
  Bot,
  Shield,
  Globe,
} from "lucide-react";

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed";
  details?: string;
  fix?: string;
}

export default function TestPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestResult[]>([
    { name: "SPCS Service Status", status: "pending" },
    { name: "Snowflake API Connectivity", status: "pending" },
    { name: "Cortex Agent Access", status: "pending" },
    { name: "Network Policy Check", status: "pending" },
    { name: "Egress IP Whitelist", status: "pending" },
  ]);
  const [running, setRunning] = useState(false);
  const [appUrl, setAppUrl] = useState("");
  const [snowflakeConfig, setSnowflakeConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const sfConfig = localStorage.getItem("snowflakeConfig");
    if (sfConfig) {
      setSnowflakeConfig(JSON.parse(sfConfig));
    }
    const deployState = localStorage.getItem("deployState");
    if (deployState) {
      const state = JSON.parse(deployState);
      if (state.appUrl) setAppUrl(state.appUrl);
    }
  }, []);

  const runTests = async () => {
    setRunning(true);
    setTests((prev) => prev.map((t) => ({ ...t, status: "pending" as const })));

    try {
      const response = await fetch("/api/setup/run-network-tests", {
        method: "POST",
        headers: snowflakeConfig ? { "x-snowflake-config": JSON.stringify(snowflakeConfig) } : {},
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
          setTests((prev) =>
            prev.map((t) => (t.name === data.name ? { ...t, ...data } : t))
          );
        }
      }
    } catch (err) {
      console.error("Test error:", err);
    } finally {
      setRunning(false);
    }
  };

  const runFix = async (sql: string) => {
    try {
      await fetch("/api/setup/run-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      runTests();
    } catch (err) {
      console.error("Fix error:", err);
    }
  };

  const getTestIcon = (name: string) => {
    switch (name) {
      case "SPCS Service Status":
        return Server;
      case "Snowflake API Connectivity":
        return Globe;
      case "Cortex Agent Access":
        return Bot;
      case "Network Policy Check":
        return Shield;
      case "Egress IP Whitelist":
        return Network;
      default:
        return Network;
    }
  };

  const allPassed = tests.every((t) => t.status === "passed");
  const anyFailed = tests.some((t) => t.status === "failed");
  const failedTests = tests.filter((t) => t.status === "failed");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Step 5: Network Connectivity Test
        </h2>
        <p className="text-gray-600 mt-1">
          Verify your SPCS container can communicate with Snowflake services
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">Network Tests</h3>
          <button
            onClick={runTests}
            disabled={running}
            className="btn-primary flex items-center gap-2"
          >
            {running ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Run All Tests
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          {tests.map((test, i) => {
            const Icon = getTestIcon(test.name);

            return (
              <div
                key={i}
                className={`p-4 rounded-lg border transition-colors ${
                  test.status === "passed"
                    ? "bg-green-50 border-green-200"
                    : test.status === "failed"
                    ? "bg-red-50 border-red-200"
                    : test.status === "running"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {test.status === "passed" && (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  {test.status === "failed" && (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                  {test.status === "running" && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                  )}
                  {test.status === "pending" && (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0" />
                  )}

                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      test.status === "passed"
                        ? "text-green-600"
                        : test.status === "failed"
                        ? "text-red-600"
                        : test.status === "running"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />

                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        test.status === "passed"
                          ? "text-green-700"
                          : test.status === "failed"
                          ? "text-red-700"
                          : test.status === "running"
                          ? "text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      {test.name}
                    </p>
                    {test.details && (
                      <p
                        className={`text-sm mt-1 ${
                          test.status === "passed"
                            ? "text-green-600"
                            : test.status === "failed"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {test.details}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      test.status === "passed"
                        ? "bg-green-100 text-green-700"
                        : test.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : test.status === "running"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {test.status.toUpperCase()}
                  </span>
                </div>

                {test.fix && test.status === "failed" && (
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-xs text-gray-500 mb-2">Suggested fix:</p>
                    <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                      {test.fix}
                    </div>
                    <button
                      onClick={() => runFix(test.fix!)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Run this fix automatically
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {anyFailed && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">
                {failedTests.length} Test{failedTests.length > 1 ? "s" : ""} Failed
              </h3>
              <p className="text-red-700 text-sm mt-1">
                Fix the issues above and click &quot;Run All Tests&quot; to verify the
                fixes worked.
              </p>
            </div>
          </div>
        </div>
      )}

      {allPassed && tests[0].status !== "pending" && (
        <div className="card bg-green-50 border-green-200">
          <div className="text-center py-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-800">
              All Tests Passed!
            </h3>
            <p className="text-green-700 mt-2">
              Your Customer 360 app is fully configured and ready to use.
            </p>

            <div className="mt-6 flex justify-center gap-4">
              {appUrl ? (
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Open Your App
                  <ExternalLink className="h-5 w-5" />
                </a>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/setup/get-app-url", {
                        method: "POST",
                        headers: snowflakeConfig ? { "x-snowflake-config": JSON.stringify(snowflakeConfig) } : {},
                      });
                      const data = await response.json();
                      if (data.url) {
                        setAppUrl(data.url);
                        localStorage.setItem("deployState", JSON.stringify({ ...JSON.parse(localStorage.getItem("deployState") || "{}"), appUrl: data.url }));
                        window.open(data.url, "_blank");
                      }
                    } catch (err) {
                      console.error("Failed to get app URL:", err);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Open Your App
                  <ExternalLink className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => router.push("/setup/deploy")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Deployment
        </button>
      </div>
    </div>
  );
}
