"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  User,
  MapPin,
  Calendar,
  Briefcase,
  Heart,
  PoundSterling,
  Mail,
  Phone,
  MessageSquare,
  TrendingUp,
  Shield,
  FileText,
  Building,
  Target,
  Brain,
  Package,
  ChevronLeft,
  Sparkles,
  Loader2,
} from "lucide-react";
import { marked } from "marked";

interface CustomerData {
  demographics: Record<string, unknown>;
  communication: Record<string, unknown> | null;
  interactions: Record<string, unknown> | null;
  pension: Record<string, unknown> | null;
  mindset: Record<string, unknown> | null;
  products: Record<string, unknown> | null;
}

interface Customer360ViewProps {
  customerId: string;
  onBack: () => void;
}

export function Customer360View({ customerId, onBack }: Customer360ViewProps) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (!response.ok) throw new Error("Failed to fetch customer data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerData();
  }, [customerId]);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const response = await fetch(`/api/customers/${customerId}/analyze`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to analyze customer");
      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const formatCurrency = (value: unknown) => {
    const num = typeof value === "string" ? parseFloat(value) : (value as number);
    if (isNaN(num)) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Card className="p-6 text-center">
          <p className="text-destructive mb-2">Error loading customer data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  const { demographics: d, communication: c, interactions: i, pension: p, mindset: m, products: pr } = data;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-auto h-full">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[#002F6C] flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">{customerId}</h2>
            <p className="text-sm text-muted-foreground">
              {d.GENDER as string} • {d.AGE as number} years • {d.MARITAL_STATUS as string}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {d.IS_HIGH_WEALTH === "TRUE" && (
            <Badge className="bg-[#FFDD00] text-black">High Wealth</Badge>
          )}
          <Badge variant="outline">{d.AGE_GROUP as string}</Badge>
          <Badge variant="outline">{d.INCOME_BRACKET as string}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3 text-[#002F6C]">
            <User className="h-5 w-5" />
            <h3 className="font-semibold">Personal Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{d.ADDRESS as string}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">DOB: {d.DOB as string}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{d.EMPLOYMENT_STATUS as string}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{d.EDUCATION_LEVEL as string}</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{d.DEPENDENTS_AND_CARER_RESPONSIBILITIES as string}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3 text-[#002F6C]">
            <PoundSterling className="h-5 w-5" />
            <h3 className="font-semibold">Financial Overview</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Pension Value</span>
              <span className="font-semibold">{formatCurrency(d.TOTAL_PENSION_VALUE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Pensions</span>
              <span className="font-semibold">{d.TOTAL_PENSIONS as number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mortgage Balance</span>
              <span className="font-semibold">{formatCurrency(d.MORTGAGE_BALANCE)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Student/Other Loans</span>
              <span className="font-semibold">{formatCurrency(d.STUDENT_OR_OTHER_LOANS)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Homeowner</span>
              <span className="font-semibold">{d.HOMEOWNER_STATUS === "TRUE" ? "Yes" : "No"}</span>
            </div>
          </div>
        </Card>

        {c && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#4B8BBE]">
              <MessageSquare className="h-5 w-5" />
              <h3 className="font-semibold">Communication Preferences</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Preferred: {c.PREFERRED_COMMUNICATION_CHANNEL as string}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Best time: {c.PREFERRED_CONTACT_TIME as string}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Frequency: {c.CONTACT_FREQUENCY_AND_METHOD as string}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {c.CONSENT_TO_EMAIL === "TRUE" && (
                  <Badge variant="secondary" className="text-xs"><Mail className="h-3 w-3 mr-1" />Email</Badge>
                )}
                {c.CONSENT_TO_PHONE === "TRUE" && (
                  <Badge variant="secondary" className="text-xs"><Phone className="h-3 w-3 mr-1" />Phone</Badge>
                )}
                {c.CONSENT_TO_SMS === "TRUE" && (
                  <Badge variant="secondary" className="text-xs"><MessageSquare className="h-3 w-3 mr-1" />SMS</Badge>
                )}
                {c.CONSENT_TO_POST === "TRUE" && (
                  <Badge variant="secondary" className="text-xs"><FileText className="h-3 w-3 mr-1" />Post</Badge>
                )}
              </div>
            </div>
          </Card>
        )}

        {p && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#F0B429]">
              <TrendingUp className="h-5 w-5" />
              <h3 className="font-semibold">Pension Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pension Type</span>
                <span className="font-semibold">{p.PENSION_TYPE as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Type</span>
                <span className="font-semibold">{p.PRODUCT_TYPE as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fund Value</span>
                <span className="font-semibold">{formatCurrency(p.FUND_VALUE)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Contribution</span>
                <span className="font-semibold">{formatCurrency(p.ANNUAL_CONTRIBUTION_AMOUNT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fund Performance</span>
                <Badge variant={p.FUND_PERFORMANCE === "Good" ? "default" : "secondary"} className="text-xs">
                  {p.FUND_PERFORMANCE as string}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crystallised</span>
                <span className="font-semibold">{p.CRYSTALLISED === "TRUE" ? "Yes" : "No"}</span>
              </div>
            </div>
          </Card>
        )}

        {p && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#002F6C]">
              <Building className="h-5 w-5" />
              <h3 className="font-semibold">Employment & Contributions</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer</span>
                <span className="font-semibold text-right text-xs">{p.EMPLOYER_NAME as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee Contrib.</span>
                <span className="font-semibold">{formatCurrency(p.EMPLOYEE_CONTRIBUTIONS)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer Contrib.</span>
                <span className="font-semibold">{formatCurrency(p.EMPLOYER_CONTRIBUTIONS)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Policy Started</span>
                <span className="font-semibold">{p.DATE_POLICY_COMMENCED as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Policy Number</span>
                <span className="font-semibold text-xs">{p.POLICY_NUMBER as string}</span>
              </div>
            </div>
          </Card>
        )}

        {i && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#4B8BBE]">
              <Target className="h-5 w-5" />
              <h3 className="font-semibold">Marketing & Engagement</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marketing Channel</span>
                <span className="font-semibold">{i.MARKETING_CHANNEL as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Interaction</span>
                <span className="font-semibold">{i.LAST_INTERACTION_DATE as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign Response</span>
                <span className="font-semibold">{i.CAMPAIGN_RESPONSE as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Converted</span>
                <Badge variant={i.LEAD_CONVERTED === "TRUE" ? "default" : "secondary"} className="text-xs">
                  {i.LEAD_CONVERTED === "TRUE" ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attended Seminar</span>
                <span className="font-semibold">{i.ATTENDED_SEMINAR === "TRUE" ? "Yes" : "No"}</span>
              </div>
            </div>
          </Card>
        )}

        {m && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#F0B429]">
              <Brain className="h-5 w-5" />
              <h3 className="font-semibold">Customer Mindset</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Decision Style</span>
                <span className="font-semibold text-xs text-right">{m.DECISION_MAKING_STYLE as string || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investment Knowledge</span>
                <span className="font-semibold">{m.INVESTMENT_KNOWLEDGE_LEVEL as string || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ESG Preference</span>
                <span className="font-semibold">{m.ESG_PREFERENCE as string || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Marketing Engagement</span>
                <span className="font-semibold">{m.MARKETING_ENGAGEMENT_LEVEL as string || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Category</span>
                <span className="font-semibold">{m.RISK_CATEGORY as string || "N/A"}</span>
              </div>
            </div>
          </Card>
        )}

        {pr && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#002F6C]">
              <Package className="h-5 w-5" />
              <h3 className="font-semibold">Products Held</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Products</span>
                <Badge className="bg-[#002F6C]">{pr.PRODUCT_COUNT as number}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {pr.HAS_PENSIONS_CURRENT_OR_STAFF === "TRUE" && (
                  <Badge variant="outline" className="text-xs">Pension</Badge>
                )}
                {pr.HAS_ISA === "TRUE" && (
                  <Badge variant="outline" className="text-xs">ISA</Badge>
                )}
                {pr.HAS_BOND === "TRUE" && (
                  <Badge variant="outline" className="text-xs">Bond</Badge>
                )}
                {pr.HAS_INVESTMENT_ACCOUNT === "TRUE" && (
                  <Badge variant="outline" className="text-xs">Investment</Badge>
                )}
                {pr.HAS_PROTECTION_POLICY === "TRUE" && (
                  <Badge variant="outline" className="text-xs">Protection</Badge>
                )}
                {pr.HAS_HEALTH_PLAN === "TRUE" && (
                  <Badge variant="outline" className="text-xs">Health Plan</Badge>
                )}
                {pr.HAS_GENERAL_INSURANCE_PRODUCTS === "TRUE" && (
                  <Badge variant="outline" className="text-xs">Insurance</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {pr.IS_MULTI_PRODUCT === "TRUE" && (
                  <Badge className="bg-[#FFDD00] text-black text-xs">Multi-Product Customer</Badge>
                )}
              </div>
            </div>
          </Card>
        )}

        {p && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3 text-[#4B8BBE]">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">Benefits & Protection</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Death Benefits</span>
                <span className="font-semibold text-xs text-right">{p.DEATH_BENEFITS as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spouse Benefits</span>
                <span className="font-semibold text-xs text-right">{p.SPOUSE_BENEFITS as string}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Life Assurance</span>
                <span className="font-semibold">{p.LIFE_ASSURANCE === "TRUE" ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power of Attorney</span>
                <span className="font-semibold">{p.POWER_OF_ATTORNEY === "TRUE" ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Free Cash</span>
                <span className="font-semibold">{formatCurrency(p.CURRENT_TAX_FREE_CASH_ENTITLEMENT_AMOUNT)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-4 sm:p-6 mt-4">
        <div className="flex items-center gap-2 mb-4 text-[#002F6C]">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Customer Analysis</h3>
          <Badge variant="outline" className="text-xs ml-2">AI-Powered</Badge>
        </div>
        
        {!analysis && !analysisLoading && !analysisError && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4 text-center">
              Get AI-powered insights and recommendations for this customer
            </p>
            <Button
              onClick={runAnalysis}
              className="bg-[#002F6C] hover:bg-[#002F6C]/80 text-white group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Sparkles className="h-4 w-4 mr-2 group-hover:animate-pulse" />
              Analyse Customer
            </Button>
          </div>
        )}

        {analysisLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#002F6C] via-[#FFDD00] to-[#002F6C] opacity-20 blur-xl animate-pulse" />
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute w-20 h-20 rounded-full border-2 border-[#002F6C]/20" />
                <div className="absolute w-20 h-20 rounded-full border-2 border-transparent border-t-[#002F6C] animate-spin" />
                <div className="absolute w-14 h-14 rounded-full border-2 border-transparent border-t-[#FFDD00] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                <Brain className="h-8 w-8 text-[#002F6C] animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[#FFDD00] animate-pulse" />
              <p className="text-lg font-medium text-[#002F6C]">AI Analysis in Progress</p>
              <Sparkles className="h-4 w-4 text-[#FFDD00] animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <p className="text-sm text-muted-foreground">Analysing customer data and generating insights...</p>
            <div className="flex gap-1 mt-4">
              <span className="w-2 h-2 bg-[#002F6C] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[#002F6C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[#002F6C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {analysisError && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{analysisError}</p>
            <Button variant="outline" onClick={runAnalysis}>
              Try Again
            </Button>
          </div>
        )}

        {analysis && (
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: marked.parse(analysis) as string }}
          />
        )}
      </Card>
    </div>
  );
}
