"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Loader2, Zap } from "lucide-react";

interface ScenarioSimulatorProps {
  onBack: () => void;
}

const INCOME_BRACKETS = [
  { value: "0", label: "£0-£15,000" },
  { value: "1", label: "£15,001-£25,000" },
  { value: "2", label: "£25,001-£35,000" },
  { value: "3", label: "£35,001-£50,000" },
  { value: "4", label: "£50,001-£75,000" },
  { value: "5", label: "£75,001-£100,000" },
  { value: "6", label: "£100,001-£150,000" },
  { value: "7", label: "£150,001+" },
];

const RISK_CATEGORIES = [
  { value: "0", label: "Conservative" },
  { value: "1", label: "Balanced" },
  { value: "2", label: "Adventurous" },
];

const INVESTMENT_KNOWLEDGE = [
  { value: "0", label: "Poor" },
  { value: "1", label: "Basic" },
  { value: "2", label: "Good" },
  { value: "3", label: "Advanced" },
  { value: "4", label: "Expert" },
];

const MARKETING_ENGAGEMENT = [
  { value: "0", label: "Low" },
  { value: "1", label: "Medium" },
  { value: "2", label: "High" },
];

export function ScenarioSimulator({ onBack }: ScenarioSimulatorProps) {
  const [age, setAge] = useState(45);
  const [incomeBracket, setIncomeBracket] = useState("4");
  const [homeownerStatus, setHomeownerStatus] = useState(true);
  const [totalPensionValue, setTotalPensionValue] = useState(150000);
  const [totalPensions, setTotalPensions] = useState(2);
  const [riskCategory, setRiskCategory] = useState("1");
  const [riskScore, setRiskScore] = useState(5);
  const [investmentKnowledge, setInvestmentKnowledge] = useState("2");
  const [marketingEngagement, setMarketingEngagement] = useState("1");
  const [hasPension, setHasPension] = useState(true);
  const [hasISA, setHasISA] = useState(false);

  const [useLocalModel, setUseLocalModel] = useState(true);

  const [prediction, setPrediction] = useState<{
    probability: number;
    probabilityPercent: string;
    recommendation: string;
    modelSource?: string;
    timing?: {
      totalMs?: number;
      fetchMs?: number;
      authMs?: number;
      totalRequestMs?: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPrediction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/predict/cross-sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          incomeBracketEnc: parseInt(incomeBracket),
          homeownerStatusNum: homeownerStatus ? 1 : 0,
          totalPensionValue,
          totalPensions,
          riskCategoryEnc: parseInt(riskCategory),
          riskScore,
          investmentKnowledgeEnc: parseInt(investmentKnowledge),
          marketingEngagementEnc: parseInt(marketingEngagement),
          hasPensionsNum: hasPension ? 1 : 0,
          hasIsaNum: hasISA ? 1 : 0,
          useLocalModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Prediction failed");
      }

      const result = await response.json();
      setPrediction(result);
    } catch (err) {
      setError("Failed to get prediction. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Cross-sell Scenario Simulator</h1>
          <p className="text-muted-foreground">Adjust customer features to predict cross-sell propensity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Customer Features
            </CardTitle>
            <CardDescription>Adjust the sliders and options to simulate different customer profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-sm font-medium">Age: {age} years</label>
                <Slider
                  value={[age]}
                  onValueChange={([v]) => setAge(v)}
                  min={18}
                  max={80}
                  step={1}
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">Pension Value: {formatCurrency(totalPensionValue)}</label>
                <Slider
                  value={[totalPensionValue]}
                  onValueChange={([v]) => setTotalPensionValue(v)}
                  min={0}
                  max={1000000}
                  step={10000}
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">Number of Pensions: {totalPensions}</label>
                <Slider
                  value={[totalPensions]}
                  onValueChange={([v]) => setTotalPensions(v)}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">Risk Score: {riskScore}/10</label>
                <Slider
                  value={[riskScore]}
                  onValueChange={([v]) => setRiskScore(v)}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Income Bracket</label>
                <Select value={incomeBracket} onValueChange={setIncomeBracket}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOME_BRACKETS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Risk Category</label>
                <Select value={riskCategory} onValueChange={setRiskCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_CATEGORIES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Investment Knowledge</label>
                <Select value={investmentKnowledge} onValueChange={setInvestmentKnowledge}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_KNOWLEDGE.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Marketing Engagement</label>
                <Select value={marketingEngagement} onValueChange={setMarketingEngagement}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETING_ENGAGEMENT.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Current Products & Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Homeowner</span>
                  <Switch checked={homeownerStatus} onCheckedChange={setHomeownerStatus} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Has Pension</span>
                  <Switch checked={hasPension} onCheckedChange={setHasPension} />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Has ISA</span>
                  <Switch checked={hasISA} onCheckedChange={setHasISA} />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Model Settings</h3>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <span className="text-sm font-medium">Use Snowflake ML Model</span>
                  <p className="text-xs text-muted-foreground">
                    {useLocalModel ? "Fast local inference" : "Full model via Snowflake ML Registry"}
                  </p>
                </div>
                <Switch checked={!useLocalModel} onCheckedChange={(v) => setUseLocalModel(!v)} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={runPrediction} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Predicting...
                </>
              ) : (
                "Run Prediction"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prediction Result</CardTitle>
            <CardDescription>Cross-sell propensity score</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {error && (
              <div className="text-center text-destructive">
                <p>{error}</p>
              </div>
            )}
            
            {!prediction && !error && (
              <div className="text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Adjust the features and click &quot;Run Prediction&quot; to see the cross-sell propensity score.</p>
              </div>
            )}
            
            {prediction && (
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold">
                  {prediction.probabilityPercent}%
                </div>
                <Badge 
                  variant={
                    prediction.recommendation === "High" 
                      ? "default" 
                      : prediction.recommendation === "Medium"
                      ? "secondary"
                      : "outline"
                  }
                  className="text-lg px-4 py-1"
                >
                  {prediction.recommendation} Propensity
                </Badge>
                <div className="text-xs text-muted-foreground mt-2">
                  Model: {prediction.modelSource?.startsWith("snowflake") ? "Snowflake ML Registry" : "Local (Fast)"}
                </div>
                {prediction.timing && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm font-medium text-green-600">
                      {prediction.timing.totalRequestMs}ms
                    </span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-4">
                  {prediction.recommendation === "High" && "This customer profile shows strong potential for additional products."}
                  {prediction.recommendation === "Medium" && "This customer profile shows moderate potential for additional products."}
                  {prediction.recommendation === "Low" && "This customer profile shows lower potential for additional products."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
