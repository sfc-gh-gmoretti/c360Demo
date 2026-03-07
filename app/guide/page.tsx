"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Clock, Database, Layers, Bot, BarChart3, Cpu, Cloud, ArrowLeft, Sparkles, Zap, Users, Timer, Network, Server, Brain, MessageSquare, Target } from "lucide-react";

const sections = [
  { id: "overview", title: "Overview" },
  { id: "architecture", title: "Architecture" },
  { id: "realtime-ml", title: "Real-Time ML" },
  { id: "ai-analysis", title: "AI Analysis" },
  { id: "build-steps", title: "Build Steps" },
  { id: "services", title: "Services Configuration" },
  { id: "demo-guide", title: "Demo Guide" },
  { id: "timeline", title: "Build Timeline" },
];

function useTypingEffect(text: string, speed: number = 50) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayText("");
    setIsComplete(false);
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isComplete };
}

function useCountUp(target: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration, hasStarted]);

  return { count, ref };
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#29B5E8]/20"
          style={{
            width: Math.random() * 10 + 5 + "px",
            height: Math.random() * 10 + 5 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-30px) rotate(180deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ArchitectureDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodes = [
    { id: "user", label: "User Browser", x: 40, y: 40, icon: "👤", desc: "End user interface" },
    { id: "nextjs", label: "Next.js App", x: 280, y: 40, icon: "⚛️", desc: "React frontend" },
    { id: "spcs", label: "SPCS Container", x: 520, y: 40, icon: "🐳", desc: "Snowpark Container Services" },
    { id: "agent", label: "Cortex Agent", x: 120, y: 180, icon: "🤖", desc: "AI orchestration layer" },
    { id: "semantic", label: "Semantic View", x: 360, y: 180, icon: "📊", desc: "Natural language to SQL" },
    { id: "ml", label: "ML Registry", x: 600, y: 180, icon: "🧠", desc: "Model versioning" },
    { id: "warehouse", label: "Warehouse", x: 240, y: 320, icon: "🏢", desc: "Compute engine" },
    { id: "data", label: "Data Tables", x: 500, y: 320, icon: "💾", desc: "7 customer tables" },
  ];

  const connections = [
    { from: "user", to: "nextjs", label: "HTTPS" },
    { from: "nextjs", to: "spcs", label: "Deploy" },
    { from: "nextjs", to: "agent", label: "Query" },
    { from: "agent", to: "semantic", label: "Analyze" },
    { from: "semantic", to: "warehouse", label: "SQL" },
    { from: "warehouse", to: "data", label: "Read" },
    { from: "ml", to: "warehouse", label: "Predict" },
  ];

  const mobileNodes = [
    { icon: "👤", label: "User", desc: "Browser" },
    { icon: "⚛️", label: "Next.js", desc: "Frontend" },
    { icon: "🐳", label: "SPCS", desc: "Container" },
    { icon: "🤖", label: "Agent", desc: "Cortex AI" },
    { icon: "📊", label: "Semantic", desc: "View" },
    { icon: "🧠", label: "ML", desc: "Registry" },
    { icon: "🏢", label: "Warehouse", desc: "Compute" },
    { icon: "💾", label: "Tables", desc: "7 tables" },
  ];

  return (
    <>
      {/* Mobile Architecture - Simplified Grid */}
      <div className="md:hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-500 text-xs ml-1">architecture</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {mobileNodes.map((node, i) => (
            <div key={i} className="bg-slate-800/80 border border-slate-600 rounded-lg p-2 text-center">
              <span className="text-xl block">{node.icon}</span>
              <span className="text-white text-xs font-medium block mt-1">{node.label}</span>
              <span className="text-slate-400 text-[10px] block">{node.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs text-center mt-3">View on desktop for interactive diagram</p>
      </div>

      {/* Desktop Architecture - Full Interactive */}
      <div className="hidden md:block relative w-full h-[480px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-700">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzNCI1NSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-slate-500 text-xs ml-2">architecture.diagram</span>
      </div>

      <svg className="absolute inset-0 w-full h-full" style={{ marginTop: 20 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#29B5E8" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#29B5E8" stopOpacity="1" />
            <stop offset="100%" stopColor="#29B5E8" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#29B5E8" />
          </marker>
        </defs>
        {connections.map((conn, i) => {
          const fromNode = nodes.find(n => n.id === conn.from)!;
          const toNode = nodes.find(n => n.id === conn.to)!;
          const isActive = activeNode === conn.from || activeNode === conn.to;
          const midX = (fromNode.x + toNode.x) / 2 + 60;
          const midY = (fromNode.y + toNode.y) / 2 + 25;
          return (
            <g key={i}>
              <line
                x1={fromNode.x + 70}
                y1={fromNode.y + 30}
                x2={toNode.x + 70}
                y2={toNode.y + 30}
                stroke={isActive ? "#29B5E8" : "#475569"}
                strokeWidth={isActive ? 3 : 2}
                strokeDasharray={isActive ? "none" : "8,4"}
                markerEnd={isActive ? "url(#arrowhead)" : ""}
                className="transition-all duration-300"
              />
              {isActive && (
                <>
                  <circle r="6" fill="#29B5E8" filter="url(#glow)">
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M${fromNode.x + 70},${fromNode.y + 30} L${toNode.x + 70},${toNode.y + 30}`}
                    />
                  </circle>
                  <text x={midX} y={midY - 10} fill="#29B5E8" fontSize="11" fontWeight="500" textAnchor="middle">
                    {conn.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      
      {nodes.map((node) => (
        <div
          key={node.id}
          className={`absolute cursor-pointer transition-all duration-300 ${
            activeNode === node.id ? "scale-110 z-10" : "hover:scale-105"
          }`}
          style={{ left: node.x, top: node.y + 20 }}
          onMouseEnter={() => setActiveNode(node.id)}
          onMouseLeave={() => setActiveNode(null)}
        >
          <div className={`px-5 py-3 rounded-xl backdrop-blur-md border-2 transition-all duration-300 min-w-[140px] ${
            activeNode === node.id
              ? "bg-[#29B5E8]/20 border-[#29B5E8] shadow-xl shadow-[#29B5E8]/40"
              : "bg-slate-800/80 border-slate-600 hover:border-slate-500"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{node.icon}</span>
              <div>
                <span className="text-white text-sm font-semibold whitespace-nowrap block">{node.label}</span>
                {activeNode === node.id && (
                  <span className="text-[#29B5E8] text-xs">{node.desc}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#29B5E8] animate-pulse" />
          Hover over components to see data flow
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-slate-500" /> Inactive</span>
          <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-[#29B5E8]" /> Active</span>
        </div>
      </div>
      </div>
    </>
  );
}

function StatsCounter() {
  const tables = useCountUp(7, 1500);
  const customers = useCountUp(1500, 2000);
  const hours = useCountUp(3, 1000);
  const responseTime = useCountUp(100, 1500);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6 sm:my-8">
      <div ref={tables.ref} className="glass-card p-4 sm:p-6 text-center group hover:scale-105 transition-transform">
        <Database className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-[#29B5E8] group-hover:animate-bounce" />
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{tables.count}</div>
        <div className="text-xs sm:text-sm text-gray-500">Data Tables</div>
      </div>
      <div ref={customers.ref} className="glass-card p-4 sm:p-6 text-center group hover:scale-105 transition-transform">
        <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-[#29B5E8] group-hover:animate-bounce" />
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{customers.count.toLocaleString()}+</div>
        <div className="text-xs sm:text-sm text-gray-500">Customer Records</div>
      </div>
      <div ref={hours.ref} className="glass-card p-4 sm:p-6 text-center group hover:scale-105 transition-transform">
        <Timer className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-[#29B5E8] group-hover:animate-bounce" />
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">~{hours.count}</div>
        <div className="text-xs sm:text-sm text-gray-500">Hours to Build</div>
      </div>
      <div ref={responseTime.ref} className="glass-card p-4 sm:p-6 text-center group hover:scale-105 transition-transform">
        <Zap className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-[#29B5E8] group-hover:animate-bounce" />
        <div className="text-2xl sm:text-3xl font-bold text-gray-900">&lt;{responseTime.count}ms</div>
        <div className="text-xs sm:text-sm text-gray-500">Response Time</div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedSteps, setExpandedSteps] = useState<string[]>(["step1"]);
  const { displayText, isComplete } = useTypingEffect("AI-Powered Customer Insights", 60);

  const toggleStep = (step: string) => {
    setExpandedSteps((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F4FE] via-white to-[#F0F9FF]">
      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 1rem;
          box-shadow: 0 8px 32px rgba(41, 181, 232, 0.1);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 12px 40px rgba(41, 181, 232, 0.2);
          transform: translateY(-2px);
        }
        .gradient-text {
          background: linear-gradient(135deg, #29B5E8 0%, #0EA5E9 50%, #0284C7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 3s ease infinite;
          background-size: 200% 200%;
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .typing-cursor::after {
          content: '|';
          animation: blink 1s infinite;
          color: #29B5E8;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .fade-in {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          to { opacity: 1; transform: translateY(0); }
        }
        .code-block {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(41, 181, 232, 0.2);
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-[#29B5E8] transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Back to App</span>
            </Link>
            <div className="h-6 w-px bg-gray-300 hidden sm:block" />
            <h1 className="text-base sm:text-xl font-bold text-gray-900">Build Guide</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Sparkles className="h-4 w-4 text-[#29B5E8] animate-pulse" />
            <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">Powered by</span>
            <span className="gradient-text font-semibold text-sm sm:text-base">Snowflake</span>
          </div>
        </div>
      </header>

      <nav className="sticky top-[57px] sm:top-[73px] z-40 bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  activeSection === section.id
                    ? "bg-gradient-to-r from-[#29B5E8] to-[#0EA5E9] text-white shadow-lg shadow-[#29B5E8]/30"
                    : "text-gray-600 hover:bg-white/50"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {activeSection === "overview" && (
          <section className="space-y-8 relative">
            <FloatingParticles />
            <div className="text-center max-w-3xl mx-auto relative z-10">
              <p className="text-[#29B5E8] font-semibold tracking-wide uppercase mb-4 flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Customer 360 Intelligence
                <Sparkles className="h-4 w-4" />
              </p>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
                <span className={!isComplete ? "typing-cursor" : ""}>{displayText}</span>
                <span className="block gradient-text mt-2">Built on Snowflake</span>
              </h2>
              <p className="text-sm sm:text-xl text-gray-600 fade-in" style={{ animationDelay: "1.5s", transform: "translateY(20px)" }}>
                A comprehensive demo showcasing Snowflake&apos;s AI capabilities including Cortex Agent, Semantic Views, ML Registry, and SPCS.
              </p>
            </div>

            <StatsCounter />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12">
              {[
                { icon: Bot, title: "Cortex Agent", desc: "Natural language interface for customer queries", delay: "0.1s" },
                { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time visualizations from live data", delay: "0.2s" },
                { icon: Cpu, title: "ML Simulator", desc: "Cross-sell propensity model simulation", delay: "0.3s" },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="glass-card p-4 sm:p-6 fade-in" 
                  style={{ animationDelay: item.delay, transform: "translateY(20px)" }}
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#29B5E8]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "architecture" && (
          <section className="space-y-6 sm:space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">System Architecture</h2>
              <p className="text-sm sm:text-base text-gray-600">Interactive diagram - hover over components to see data flow</p>
            </div>

            <ArchitectureDiagram />

            <div className="glass-card p-4 sm:p-8 mt-8">
              <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#29B5E8]" />
                    Frontend Layer
                  </h3>
                  <ul className="space-y-3 text-gray-600">
                    {[
                      { name: "Next.js 15", desc: "React framework with App Router" },
                      { name: "Tailwind CSS", desc: "Utility-first styling" },
                      { name: "Recharts", desc: "Data visualization library" },
                      { name: "Radix UI", desc: "Accessible component primitives" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors">
                        <ChevronRight className="h-5 w-5 text-[#29B5E8] shrink-0 mt-0.5" />
                        <span><strong>{item.name}</strong> - {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#29B5E8]" />
                    Snowflake Services
                  </h3>
                  <ul className="space-y-3 text-gray-600">
                    {[
                      { name: "Cortex Agent", desc: "AI-powered query interface" },
                      { name: "Semantic View", desc: "Natural language to SQL" },
                      { name: "ML Registry", desc: "Model versioning & deployment" },
                      { name: "SPCS", desc: "Container hosting service" },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors">
                        <ChevronRight className="h-5 w-5 text-[#29B5E8] shrink-0 mt-0.5" />
                        <span><strong>{item.name}</strong> - {item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "realtime-ml" && (
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Real-Time ML Inference</h2>
              <p className="text-gray-600">How the application achieves sub-100ms ML predictions using SPCS</p>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Performance Achievement</h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200">
                  <div className="text-3xl font-bold text-red-600">~11,000ms</div>
                  <div className="text-sm text-red-700 mt-1">SQL API (Before)</div>
                  <div className="text-xs text-gray-500 mt-2">Polling-based execution</div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-4xl">→</div>
                </div>
                <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-600">20-90ms</div>
                  <div className="text-sm text-green-700 mt-1">REST API (After)</div>
                  <div className="text-xs text-gray-500 mt-2">Direct model serving</div>
                </div>
              </div>

              <div className="p-4 bg-[#29B5E8]/10 rounded-xl border border-[#29B5E8]/20">
                <p className="text-sm text-gray-700">
                  <strong className="text-[#29B5E8]">~100x faster</strong> by using the ML Registry&apos;s dedicated REST endpoint instead of the SQL Statement API.
                </p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Server className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Dual Compute Pool Architecture</h3>
              </div>

              <div className="w-full bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <img 
                  src="/ml-architecture.svg" 
                  alt="ML Inference Architecture - Web Application to Snowflake Container to ML Inference Service to ML Registry"
                  className="w-full h-auto"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    TUTORIAL_COMPUTE_POOL
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Hosts the Next.js web application</li>
                    <li>• Handles user requests and UI rendering</li>
                    <li>• Makes outbound calls to ML service</li>
                    <li>• Standard compute for general workloads</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    ML_INFERENCE_POOL
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Dedicated pool for ML inference</li>
                    <li>• Always warm for low-latency predictions</li>
                    <li>• Serves the trained model via REST API</li>
                    <li>• Isolated from app compute for reliability</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Network className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Networking & Authentication</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ Key Discovery: Cross-Pool Communication</h4>
                  <p className="text-sm text-amber-800">
                    Services in different SPCS compute pools <strong>cannot</strong> communicate via internal DNS 
                    (*.svc.spcs.internal). The internal DNS only resolves within the same compute pool.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-3">Solution: Public Endpoint with JWT Auth</h4>
                  <div className="code-block rounded-xl p-3 sm:p-4 overflow-x-auto">
                    <pre className="text-xs sm:text-sm text-gray-300 font-mono">{`// Cross-pool communication via public endpoint
const ML_REGISTRY_PUBLIC_URL = 
  "https://avey5-sfseeurope-eu-demo86.snowflakecomputing.app/predict-proba";

// JWT keypair authentication (NOT SPCS OAuth token)
const headers = {
  "Authorization": \`Snowflake Token="\${jwtToken}"\`,
  "Content-Type": "application/json",
};

// dataframe_split format for ML Registry
const payload = {
  dataframe_split: {
    index: [0],
    columns: ["AGE", "INCOME_BRACKET_ENC", ...],
    data: [[45, 4, 1, 150000, ...]]
  }
};`}</pre>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <h4 className="font-semibold text-red-900 mb-2">❌ What Doesn&apos;t Work</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• Internal DNS across pools (ENOTFOUND)</li>
                      <li>• SPCS OAuth token for cross-service calls</li>
                      <li>• Bearer token auth for ML REST endpoint</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-2">✅ What Works</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Public endpoint URLs (*.snowflakecomputing.app)</li>
                      <li>• JWT keypair auth: Snowflake Token=&quot;...&quot;</li>
                      <li>• dataframe_split payload format</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Response Time Breakdown</h3>
              </div>

              <div className="space-y-3">
                {[
                  { stage: "JWT Token Generation", time: "<1ms", color: "bg-blue-500", width: "5%", desc: "Cached after first request" },
                  { stage: "Network Round Trip", time: "10-30ms", color: "bg-cyan-500", width: "30%", desc: "HTTPS to public endpoint" },
                  { stage: "Model Inference", time: "5-50ms", color: "bg-green-500", width: "50%", desc: "GradientBoosting prediction" },
                  { stage: "Response Parsing", time: "<1ms", color: "bg-purple-500", width: "5%", desc: "JSON deserialization" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-40 text-sm text-gray-600">{item.stage}</div>
                    <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full flex items-center justify-end pr-3`} style={{ width: item.width }}>
                        <span className="text-xs text-white font-medium">{item.time}</span>
                      </div>
                    </div>
                    <div className="w-48 text-xs text-gray-500">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">Total: 20-90ms</span>
                  <span className="text-sm text-green-700">(warm) | ~1s (cold start)</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "ai-analysis" && (
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">AI-Powered Customer Analysis</h2>
              <p className="text-gray-600">Deep customer insights using Snowflake Cortex Complete</p>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Brain className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Feature Overview</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                The Customer Analysis feature provides AI-generated insights for individual customers by analyzing their complete profile across all data dimensions. Using Snowflake Cortex Complete with Claude, it generates personalized recommendations, risk assessments, and engagement strategies.
              </p>

              <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <Target className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-semibold text-blue-900 mb-1">Product Recommendations</h4>
                  <p className="text-sm text-blue-700">Prioritized product suggestions based on customer profile and gaps</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <MessageSquare className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Engagement Strategy</h4>
                  <p className="text-sm text-green-700">Personalized outreach recommendations and communication tips</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <Sparkles className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-purple-900 mb-1">Key Actions</h4>
                  <p className="text-sm text-purple-700">Actionable next steps with timelines and expected outcomes</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Database className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Data Sources</h3>
              </div>

              <p className="text-gray-600 mb-4">
                The analysis aggregates data from 5 customer tables to build a comprehensive profile:
              </p>

              <div className="grid md:grid-cols-5 gap-3">
                {[
                  { name: "Demographics", desc: "Age, income, location, homeowner status" },
                  { name: "Communication", desc: "Preferred channels, contact frequency" },
                  { name: "Pension Details", desc: "Values, types, retirement planning" },
                  { name: "Mindset", desc: "Risk tolerance, investment knowledge" },
                  { name: "Products", desc: "Current holdings and product history" },
                ].map((table, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <div className="font-semibold text-slate-900 text-sm">{table.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{table.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Implementation</h3>
              </div>

              <div className="code-block rounded-xl p-3 sm:p-4 overflow-x-auto mb-6">
                <pre className="text-xs sm:text-sm text-gray-300 font-mono">{`// API Route: /api/customers/[customerId]/analyze
const analysisPrompt = \`
You are an expert financial advisor analyzing customer data.
Provide a comprehensive analysis including:
1. Customer Summary
2. Risk Assessment  
3. Product Recommendations (prioritized)
4. Engagement Strategy
5. Key Actions with timelines
\`;

// Call Cortex Complete via SQL API
const sql = \`
  SELECT SNOWFLAKE.CORTEX.COMPLETE(
    'claude-4-sonnet',
    CONCAT('\${analysisPrompt}', '\${customerDataJson}')
  ) AS analysis
\`;`}</pre>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h4 className="font-semibold text-amber-900 mb-2">Model Selection</h4>
                <p className="text-sm text-amber-800">
                  Using <code className="bg-amber-100 px-1 rounded">claude-4-sonnet</code> for optimal balance of quality and speed. 
                  Analysis typically completes in 5-10 seconds depending on data complexity.
                </p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">UI/UX Features</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Loading Animation</h4>
                  <div className="p-6 bg-slate-100 rounded-xl">
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div className="w-16 h-16 rounded-full border-2 border-[#002F6C]/20" />
                        <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-[#002F6C] animate-spin" />
                        <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-transparent border-t-[#FFDD00] animate-spin" style={{ animationDirection: 'reverse' }} />
                        <Brain className="absolute inset-0 m-auto h-6 w-6 text-[#002F6C] animate-pulse" />
                      </div>
                      <p className="text-sm text-gray-600">AI Analysis in Progress</p>
                      <div className="flex gap-1 mt-2">
                        <span className="w-2 h-2 bg-[#002F6C] rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-[#002F6C] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#002F6C] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Button Design</h4>
                  <div className="p-6 bg-slate-100 rounded-xl">
                    <div className="flex flex-col items-center gap-4">
                      <button className="bg-[#002F6C] hover:bg-[#002F6C]/80 text-white px-6 py-3 rounded-lg group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2">
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <Sparkles className="h-4 w-4 group-hover:animate-pulse" />
                        Analyse Customer
                      </button>
                      <p className="text-xs text-gray-500">Hover to see shimmer animation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                  <Bot className="h-5 w-5 text-[#29B5E8]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Sample Output</h3>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-sm">
                <div>
                  <h5 className="font-semibold text-slate-900">1. Customer Summary</h5>
                  <p className="text-slate-600">45-year-old homeowner in £50-75k income bracket with moderate risk tolerance...</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">2. Risk Assessment</h5>
                  <p className="text-slate-600">Low risk customer with stable income and diversified pension holdings...</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">3. Product Recommendations</h5>
                  <p className="text-slate-600"><strong>Priority 1:</strong> ISA for tax-efficient savings. <strong>Priority 2:</strong> Life insurance review...</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">4. Engagement Strategy</h5>
                  <p className="text-slate-600">Prefers email communication. Schedule quarterly review calls...</p>
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">5. Key Actions</h5>
                  <p className="text-slate-600"><strong>Week 1:</strong> Send ISA information pack. <strong>Month 1:</strong> Schedule consultation call...</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === "build-steps" && (
          <section className="space-y-6">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Build Steps</h2>
              <p className="text-gray-600">Step-by-step guide to building the Customer 360 application</p>
            </div>

            {[
              {
                id: "step1",
                title: "1. Data Foundation",
                duration: "15 min",
                description: "Set up the customer data tables in Snowflake",
                details: [
                  "Created CUSTOMER_DEMO database and PUBLIC schema",
                  "Built 7 core tables: CUSTOMER_DEMOGRAPHICS, CUSTOMER_PENSION_DETAILS, CUSTOMER_COMMUNICATION, CUSTOMER_INTERACTION_AND_LEADS, CUSTOMER_PRODUCTS, CUSTOMER_MINDSET, CWE_DATA",
                  "Populated with synthetic customer data (1500+ records)",
                  "Established relationships via CUSTOMER_ID foreign keys"
                ]
              },
              {
                id: "step2",
                title: "2. Semantic View Creation",
                duration: "20 min",
                description: "Define the semantic layer for natural language queries",
                details: [
                  "Created YAML semantic model with table definitions",
                  "Defined dimensions (age, income, region) and measures (total value, counts)",
                  "Added verified queries (VQRs) for common questions",
                  "Created semantic view: CUSTOMER_360_VIEW",
                  "Tested with Cortex Analyst for SQL generation"
                ]
              },
              {
                id: "step3",
                title: "3. Cortex Agent Setup",
                duration: "25 min",
                description: "Configure the AI agent with tools and instructions",
                details: [
                  "Created Cortex Agent: CUSTOMER_360",
                  "Added analyst tool pointing to semantic view",
                  "Configured agent instructions for customer queries",
                  "Set up streaming response handling",
                  "Tested agent with sample queries"
                ]
              },
              {
                id: "step4",
                title: "4. Next.js Application",
                duration: "45 min",
                description: "Build the frontend application with React",
                details: [
                  "Initialized Next.js 15 project with TypeScript",
                  "Created chat interface with streaming responses",
                  "Built dashboard with Recharts visualizations",
                  "Implemented JWT authentication for Snowflake API",
                  "Added SQL result rendering and data tables"
                ]
              },
              {
                id: "step5",
                title: "5. ML Model Training",
                duration: "30 min",
                description: "Train and deploy the cross-sell propensity model",
                details: [
                  "Created stored procedure TRAIN_CROSS_SELL_MODEL",
                  "Used GradientBoostingClassifier from sklearn",
                  "Feature engineering: age, income, pension value, risk score",
                  "Registered model in Snowflake ML Registry",
                  "Created model functions: PREDICT, PREDICT_PROBA"
                ]
              },
              {
                id: "step6",
                title: "6. ML Simulator UI",
                duration: "20 min",
                description: "Create the scenario simulation interface",
                details: [
                  "Built slider controls for numeric features",
                  "Added dropdowns for categorical features",
                  "Implemented toggle switches for boolean features",
                  "Created prediction API endpoint",
                  "Added local fast model for instant predictions"
                ]
              },
              {
                id: "step7",
                title: "7. AI Customer Analysis",
                duration: "15 min",
                description: "Add AI-powered customer insights using Cortex Complete",
                details: [
                  "Created /api/customers/[customerId]/analyze endpoint",
                  "Aggregates data from 5 customer tables into single prompt",
                  "Uses Cortex Complete with claude-4-sonnet model",
                  "Renders markdown analysis with marked library",
                  "Added animated loading state with brain icon and spinners"
                ]
              },
              {
                id: "step8",
                title: "8. SPCS Deployment",
                duration: "25 min",
                description: "Deploy to Snowpark Container Services",
                details: [
                  "Created Dockerfile for Next.js standalone build",
                  "Pushed image to Snowflake registry",
                  "Created compute pool: TUTORIAL_COMPUTE_POOL",
                  "Deployed service with public endpoint",
                  "Configured OAuth token authentication for SPCS"
                ]
              }
            ].map((step, index) => (
              <div 
                key={step.id} 
                className="glass-card overflow-hidden fade-in"
                style={{ animationDelay: `${index * 0.1}s`, transform: "translateY(20px)" }}
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8] to-[#0EA5E9] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#29B5E8]/30">
                      {step.id.replace("step", "")}
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm text-gray-500 bg-white/50 px-3 py-1 rounded-full">
                      <Clock className="h-4 w-4" />
                      {step.duration}
                    </span>
                    {expandedSteps.includes(step.id) ? (
                      <ChevronDown className="h-5 w-5 text-[#29B5E8]" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>
                {expandedSteps.includes(step.id) && (
                  <div className="px-6 pb-6 border-t border-white/30">
                    <ul className="mt-4 space-y-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-600 p-2 rounded-lg hover:bg-white/30 transition-colors">
                          <ChevronRight className="h-5 w-5 text-[#29B5E8] shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {activeSection === "services" && (
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Services Configuration</h2>
              <p className="text-gray-600">Detailed configuration of each Snowflake service</p>
            </div>

            <div className="space-y-6">
              {[
                {
                  icon: Bot,
                  title: "Cortex Agent",
                  code: `CREATE OR REPLACE CORTEX AGENT CUSTOMER_DEMO.PUBLIC.CUSTOMER_360
  TOOLS = (
    analyst_tool(
      semantic_view => 'CUSTOMER_DEMO.PUBLIC.CUSTOMER_360_VIEW'
    )
  )
  LLM = 'claude-3-5-sonnet'
  AGENT_INSTRUCTIONS = '
    You are a helpful customer analytics assistant.
    Use the analyst tool to answer questions about customers.
    Always provide insights along with the data.
  ';`
                },
                {
                  icon: Database,
                  title: "Semantic View",
                  code: `CREATE OR REPLACE SEMANTIC VIEW CUSTOMER_DEMO.PUBLIC.CUSTOMER_360_VIEW
  AS SELECT * FROM CUSTOMER_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS
  WITH SEMANTIC MODEL (
    tables:
      - name: CUSTOMER_DEMOGRAPHICS
        dimensions:
          - name: AGE_GROUP
          - name: INCOME_BRACKET
          - name: REGION
        measures:
          - name: CUSTOMER_COUNT
            expr: COUNT(*)
    verified_queries:
      - question: "How many customers by age group?"
        sql: "SELECT AGE_GROUP, COUNT(*) FROM ..."
  );`
                },
                {
                  icon: Cpu,
                  title: "ML Registry Model",
                  code: `-- Training stored procedure creates model in ML Registry
CALL CUSTOMER_DEMO.PUBLIC.TRAIN_CROSS_SELL_MODEL();

-- Model is registered as:
-- CUSTOMER_DEMO.PUBLIC.CROSS_SELL_PROPENSITY v1

-- Inference via model functions:
SELECT CROSS_SELL_PROPENSITY!PREDICT_PROBA(
  AGE, INCOME_BRACKET_ENC, HOMEOWNER_STATUS_NUM,
  TOTAL_PENSION_VALUE, TOTAL_PENSIONS, RISK_CATEGORY_ENC,
  RISK_SCORE, INVESTMENT_KNOWLEDGE_ENC, MARKETING_ENGAGEMENT_ENC,
  HAS_PENSIONS_NUM, HAS_ISA_NUM
) AS prediction;`
                },
                {
                  icon: Cloud,
                  title: "SPCS Service",
                  code: `-- Service specification
spec:
  containers:
    - name: aviva-customer360
      image: /customer_demo/public/images/aviva-customer360:v11
      env:
        SNOWFLAKE_WAREHOUSE: COMPUTE_WH
        CORTEX_AGENT_NAME: CUSTOMER_DEMO.PUBLIC.CUSTOMER_360
      resources:
        requests:
          cpu: 0.5
          memory: 1Gi
        limits:
          cpu: 2
          memory: 4Gi
  endpoints:
    - name: app
      port: 8000
      public: true
  networkPolicyConfig:
    allowInternetEgress: true`,
                  footer: "Endpoint: https://atey5-sfseeurope-eu-demo86.snowflakecomputing.app"
                }
              ].map((service, i) => (
                <div key={i} className="glass-card p-6 fade-in" style={{ animationDelay: `${i * 0.1}s`, transform: "translateY(20px)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8]/20 to-[#0EA5E9]/10 rounded-xl flex items-center justify-center">
                      <service.icon className="h-5 w-5 text-[#29B5E8]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{service.title}</h3>
                  </div>
                  <div className="code-block rounded-xl p-3 sm:p-4 overflow-x-auto">
                    <pre className="text-xs sm:text-sm text-gray-300 font-mono">{service.code}</pre>
                  </div>
                  {service.footer && (
                    <p className="mt-4 text-sm text-gray-500">
                      {service.footer.split(": ")[0]}: <code className="bg-white/50 px-2 py-1 rounded text-[#29B5E8]">{service.footer.split(": ")[1]}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "demo-guide" && (
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Demo Guide</h2>
              <p className="text-gray-600">How to demonstrate the application&apos;s capabilities</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {[
                {
                  num: "1",
                  title: "Chat Interface",
                  desc: "Demonstrate natural language queries:",
                  items: [
                    '"How many customers do we have by age group?"',
                    '"What is the total pension value by income bracket?"',
                    '"Show me our top 10 customers by pension value"',
                    '"What are the most common communication preferences?"'
                  ],
                  isQuery: true
                },
                {
                  num: "2",
                  title: "Dashboard",
                  desc: "Highlight the visualizations:",
                  items: [
                    "Customer demographics by age group",
                    "Product distribution (pie chart)",
                    "Communication channels breakdown",
                    "Value by customer segment",
                    "Interaction trends over time"
                  ]
                },
                {
                  num: "3",
                  title: "ML Simulator",
                  desc: "Show predictive capabilities:",
                  items: [
                    "Adjust age slider to see impact",
                    "Toggle homeowner status",
                    "Change income bracket",
                    "Toggle local vs Snowflake model",
                    "Compare prediction speeds"
                  ]
                },
                {
                  num: "4",
                  title: "Key Talking Points",
                  desc: "",
                  items: [
                    { bold: "Unified Platform:", text: "All data, AI, and compute in Snowflake" },
                    { bold: "No Data Movement:", text: "Models trained on data where it lives" },
                    { bold: "Governed AI:", text: "Semantic layer ensures consistent results" },
                    { bold: "Easy Deployment:", text: "SPCS for containerized apps" }
                  ]
                }
              ].map((card, i) => (
                <div key={i} className="glass-card p-6 fade-in" style={{ animationDelay: `${i * 0.1}s`, transform: "translateY(20px)" }}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="h-8 w-8 bg-gradient-to-br from-[#29B5E8] to-[#0EA5E9] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#29B5E8]/30">{card.num}</span>
                    {card.title}
                  </h3>
                  {card.desc && <p className="text-gray-600 mb-4">{card.desc}</p>}
                  <ul className="space-y-2 text-sm text-gray-600">
                    {card.items.map((item, j) => (
                      <li key={j} className={card.isQuery ? "p-2 bg-white/50 rounded-lg hover:bg-white transition-colors" : "flex items-center gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors"}>
                        {typeof item === "string" ? (
                          card.isQuery ? item : <><ChevronRight className="h-4 w-4 text-[#29B5E8]" />{item}</>
                        ) : (
                          <><ChevronRight className="h-4 w-4 text-[#29B5E8] shrink-0" /><span><strong>{item.bold}</strong> {item.text}</span></>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "timeline" && (
          <section className="space-y-8">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Build Timeline</h2>
              <p className="text-gray-600">Time breakdown for building this application</p>
            </div>

            <div className="glass-card p-4 sm:p-8">
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="text-center">
                  <div className="text-6xl font-bold gradient-text">~3</div>
                  <div className="text-gray-500 text-lg">Hours Total</div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { stage: "Data Setup & Tables", time: 15, percent: 8, color: "from-[#29B5E8] to-[#06B6D4]" },
                  { stage: "Semantic View Creation", time: 20, percent: 11, color: "from-[#06B6D4] to-[#0EA5E9]" },
                  { stage: "Cortex Agent Configuration", time: 25, percent: 14, color: "from-[#0EA5E9] to-[#3B82F6]" },
                  { stage: "Next.js UI Development", time: 45, percent: 25, color: "from-[#3B82F6] to-[#6366F1]" },
                  { stage: "ML Model Training", time: 30, percent: 17, color: "from-[#6366F1] to-[#8B5CF6]" },
                  { stage: "ML Simulator UI", time: 20, percent: 11, color: "from-[#8B5CF6] to-[#A855F7]" },
                  { stage: "SPCS Deployment & Testing", time: 25, percent: 14, color: "from-[#A855F7] to-[#29B5E8]" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-48 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{item.stage}</div>
                    <div className="flex-1 h-10 bg-gray-100/50 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full flex items-center justify-end pr-4 transition-all duration-500 group-hover:shadow-lg`}
                        style={{ width: `${Math.max(item.percent * 3, 15)}%` }}
                      >
                        <span className="text-sm text-white font-medium drop-shadow">{item.time}m</span>
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-gray-500 group-hover:text-[#29B5E8] transition-colors font-medium">{item.percent}%</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-[#29B5E8]/10 to-[#0EA5E9]/10 rounded-xl border border-[#29B5E8]/20">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-5 w-5 text-[#29B5E8]" />
                  <h4 className="font-semibold text-gray-900">Built with Cortex Code</h4>
                </div>
                <p className="text-sm text-gray-600">
                  This entire application was built using Cortex Code, Snowflake&apos;s AI-powered IDE. 
                  From data modeling to UI development to deployment, Cortex Code accelerated development 
                  by generating code, debugging issues, and managing deployments automatically.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-8 sm:py-12 mt-8 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm sm:text-base text-gray-400">
            Built with Cortex Code | Customer 360 Demo
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/" className="text-[#29B5E8] hover:underline transition-colors">Back to App</Link>
            <span className="text-gray-600">|</span>
            <a href="https://docs.snowflake.com" target="_blank" rel="noopener noreferrer" className="text-[#29B5E8] hover:underline transition-colors">Snowflake Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
