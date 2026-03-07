"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Package,
  MessageCircle,
  PoundSterling,
  TrendingUp,
  PieChart,
  Activity,
} from "lucide-react";
import { CustomerSearch } from "@/components/customer-search";
import { Customer360View } from "@/components/customer-360-view";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface DashboardData {
  demographics: {
    ageGroups: Array<{ name: string; value: number }>;
    regions: Array<{ name: string; value: number }>;
    totalCustomers: number;
  };
  products: {
    distribution: Array<{ name: string; value: number }>;
    topProducts: Array<{ name: string; count: number }>;
  };
  engagement: {
    channels: Array<{ name: string; value: number }>;
    preferences: Array<{ name: string; value: number }>;
    recentActivity: Array<{ date: string; interactions: number }>;
  };
  financial: {
    totalPensionValue: number;
    avgPensionValue: number;
    totalPolicyValue: number;
    valueBySegment: Array<{ segment: string; value: number }>;
  };
}

const COLORS = ["#FFDD00", "#002F6C", "#4B8BBE", "#7CB9E8", "#B8D4E8", "#F0B429", "#1E3A5F", "#5BA4D9"];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-GB").format(value);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 sm:h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 sm:h-80 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Card className="p-6 text-center">
          <p className="text-destructive mb-2">Error loading dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  if (selectedCustomerId) {
    return (
      <Customer360View
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h2 className="text-lg sm:text-2xl font-semibold">Customer 360 Dashboard</h2>
        <div className="flex items-center gap-3">
          <CustomerSearch
            onSelectCustomer={setSelectedCustomerId}
            selectedCustomerId={selectedCustomerId}
            onClearSelection={() => setSelectedCustomerId(null)}
          />
          <Badge variant="outline" className="text-xs hidden sm:flex">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-[#FFDD00]/10 to-transparent border-[#FFDD00]/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#FFDD00]/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#FFDD00]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Customers</p>
              <p className="text-xl sm:text-2xl font-bold">{formatNumber(data.demographics.totalCustomers)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-[#002F6C]/10 to-transparent border-[#002F6C]/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#002F6C]/20 flex items-center justify-center flex-shrink-0">
              <PoundSterling className="h-4 w-4 sm:h-5 sm:w-5 text-[#002F6C]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Pension Value</p>
              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(data.financial.totalPensionValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-[#4B8BBE]/10 to-transparent border-[#4B8BBE]/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#4B8BBE]/20 flex items-center justify-center flex-shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-[#4B8BBE]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Policy Value</p>
              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(data.financial.totalPolicyValue / data.demographics.totalCustomers)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-[#F0B429]/10 to-transparent border-[#F0B429]/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-[#F0B429]/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#F0B429]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Avg Pension Value</p>
              <p className="text-xl sm:text-2xl font-bold">{formatCurrency(data.financial.avgPensionValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-[#002F6C]" />
            <h3 className="font-semibold text-sm sm:text-base">Customer Demographics by Age</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.demographics.ageGroups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} width={35} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
              />
              <Bar dataKey="value" fill="#002F6C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-[#FFDD00]" />
            <h3 className="font-semibold text-sm sm:text-base">Product Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RechartsPie>
              <Pie
                data={data.products.distribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.products.distribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </RechartsPie>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#4B8BBE]" />
            <h3 className="font-semibold text-sm sm:text-base">Communication Channels</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.engagement.channels} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
              />
              <Bar dataKey="value" fill="#4B8BBE" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <PoundSterling className="h-4 w-4 sm:h-5 sm:w-5 text-[#F0B429]" />
            <h3 className="font-semibold text-sm sm:text-base">Value by Customer Segment</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.financial.valueBySegment}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="segment" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `£${(v/1000000).toFixed(0)}M`} width={40} />
              <Tooltip 
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
              />
              <Bar dataKey="value" fill="#F0B429" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-[#002F6C]" />
            <h3 className="font-semibold text-sm sm:text-base">Customer Interactions Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.engagement.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={35} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line 
                type="monotone" 
                dataKey="interactions" 
                stroke="#002F6C" 
                strokeWidth={2}
                dot={{ fill: "#002F6C", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-[#002F6C]" />
            <h3 className="font-semibold text-sm sm:text-base">Income Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RechartsPie>
              <Pie
                data={data.demographics.regions}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="value"
                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.demographics.regions.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </RechartsPie>
          </ResponsiveContainer>
        </Card>

        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#FFDD00]" />
            <h3 className="font-semibold text-sm sm:text-base">Communication Preferences</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RechartsPie>
              <Pie
                data={data.engagement.preferences}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.engagement.preferences.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </RechartsPie>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
