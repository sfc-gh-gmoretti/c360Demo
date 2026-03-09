"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  Plus,
  Database,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Table,
  BarChart3,
  MessageSquare,
  Bot,
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Menu,
  X,
  Mic,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import VoiceRecorder from "@/components/voice-recorder";
import { ThemeToggle } from "@/components/theme-toggle";
import { TypingText } from "@/components/typing-text";
import { SmartChart } from "@/components/smart-chart";
import { marked } from "marked";

interface ToolUseContent {
  tool_use_id: string;
  type: string;
  name: string;
  input?: Record<string, unknown>;
  client_side_execute?: boolean;
}

interface ToolResultContent {
  tool_use_id: string;
  type: string;
  name: string;
  status: string;
  content: Array<{
    type: string;
    json?: {
      sql?: string;
      text?: string;
      result_set?: {
        data: unknown[][];
        resultSetMetaData?: {
          rowType?: Array<{ name: string }>;
        };
      };
    };
  }>;
}

interface ThinkingContent {
  text: string;
  signature?: string;
}

interface MessageContent {
  type: string;
  text?: string;
  tool_use?: ToolUseContent;
  tool_result?: ToolResultContent;
  thinking?: ThinkingContent;
  tool_use_id?: string;
  tool_name?: string;
  input?: Record<string, unknown>;
  content?: unknown;
  data?: unknown[];
  sql?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: MessageContent[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  history: Array<{ role: string; content: Array<{ type: string; text?: string }> }>;
  createdAt: Date;
}

const SUGGESTED_QUESTIONS = [
  "How many customers do we have by age group?",
  "What is the distribution of products across the customer base?",
  "Which marketing channels have the highest lead conversion rates?",
  "Show me customers with high pension values who prefer ESG investments",
  "What are the most common communication preferences?",
];

export default function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [selectedSql, setSelectedSql] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard" | "simulator" | "voice">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingThinking, setStreamingThinking] = useState<string>("");
  const [streamingStatus, setStreamingStatus] = useState<string>("");

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, scrollToBottom]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: "New Conversation",
      messages: [],
      history: [],
      createdAt: new Date(),
    };

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const conversationId = activeConversationId || crypto.randomUUID();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: [{ type: "text", text }],
      timestamp: new Date(),
    };

    let currentHistory: Array<{ role: string; content: Array<{ type: string; text?: string }> }> = [];

    setConversations((prev) => {
      const existingConv = prev.find((c) => c.id === conversationId);
      if (existingConv) {
        currentHistory = existingConv.history;
        return prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
                title: c.messages.length === 0 ? text.slice(0, 50) : c.title,
              }
            : c
        );
      } else {
        const newConv: Conversation = {
          id: conversationId,
          title: text.slice(0, 50),
          messages: [userMessage],
          history: [],
          createdAt: new Date(),
        };
        return [newConv, ...prev];
      }
    });

    if (!activeConversationId) {
      setActiveConversationId(conversationId);
    }

    setInputValue("");
    setShowSuggestions(false);
    setIsLoading(true);
    setStreamingThinking("");
    setStreamingStatus("Connecting...");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: currentHistory,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantMessageId = crypto.randomUUID();
      let accumulatedContent: MessageContent[] = [];
      let accumulatedThinking = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              // Handle streaming thinking text (incremental chunks)
              // Cortex Agent streams thinking with content_index and text field (no type)
              if (typeof parsed.content_index === "number" && parsed.text && !parsed.type) {
                accumulatedThinking += parsed.text;
                setStreamingStatus("Reasoning...");
                setStreamingThinking(accumulatedThinking);
                continue;
              }

              // Handle status updates
              if (parsed.status) {
                if (parsed.status === "planning") {
                  setStreamingStatus("Planning...");
                } else if (parsed.status === "extracting_tool_calls") {
                  setStreamingStatus("Selecting data sources...");
                } else if (parsed.status === "executing_tools") {
                  setStreamingStatus("Executing queries...");
                } else if (parsed.status === "executing_tool" && parsed.message) {
                  setStreamingStatus(parsed.message);
                } else if (parsed.status === "streaming_analyst_results") {
                  setStreamingStatus("Streaming results...");
                }
                continue;
              }

              // Handle tool_use events (direct from stream)
              if (parsed.type && parsed.tool_use_id && parsed.name) {
                setStreamingStatus(`Using ${parsed.name.replace(/_/g, " ")}...`);
                continue;
              }

              if (parsed.content && Array.isArray(parsed.content)) {
                for (const item of parsed.content) {
                  if (item.type === "thinking" && item.thinking?.text) {
                    setStreamingStatus("Reasoning...");
                    setStreamingThinking(item.thinking.text);
                  } else if (item.type === "tool_use") {
                    const toolName = item.tool_use?.name || item.tool_name || "tool";
                    setStreamingStatus(`Using ${toolName.replace(/_/g, " ")}...`);
                  } else if (item.type === "tool_result") {
                    setStreamingStatus("Processing results...");
                  } else if (item.type === "text") {
                    setStreamingStatus("Generating response...");
                  }
                }
                accumulatedContent = parsed.content;
              }

              const assistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: accumulatedContent,
                timestamp: new Date(),
              };

              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conversationId
                    ? {
                        ...c,
                        messages: c.messages.some((m) => m.id === assistantMessageId)
                          ? c.messages.map((m) =>
                              m.id === assistantMessageId ? assistantMessage : m
                            )
                          : [...c.messages, assistantMessage],
                        history: [
                          ...c.history.filter((h) => !(h.role === "user" && h.content[0]?.text === text)),
                          { role: "user", content: [{ type: "text", text }] },
                          { role: "assistant", content: accumulatedContent },
                        ],
                      }
                    : c
                )
              );
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: [
          {
            type: "text",
            text: `Sorry, I encountered an error: ${(error as Error).message}. Please try again.`,
          },
        ],
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, errorMessage] }
            : c
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingThinking("");
      setStreamingStatus("");
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatToolName = (toolType: string, toolName: string): string => {
    const typeMap: Record<string, string> = {
      "cortex_analyst_text_to_sql": "Cortex Analyst",
      "cortex_search": "Cortex Search",
      "generic": "Custom Tool",
    };
    
    const friendlyType = typeMap[toolType] || toolType.replace(/_/g, " ");
    const friendlyName = toolName.replace(/_/g, " ");
    
    return `${friendlyType}: ${friendlyName}`;
  };

  const renderMessageContent = (content: MessageContent[]) => {
    return content.map((item, index) => {
      if (item.type === "text" && item.text) {
        const html = marked.parse(item.text) as string;
        return (
          <div
            key={index}
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      if (item.type === "thinking" && item.thinking) {
        const formattedThinking = item.thinking.text
          .replace(/(\d+)\.\s+/g, '\n$1. ')
          .replace(/\s+-\s+/g, '\n- ')
          .replace(/:\s+-/g, ':\n-')
          .trim();
        const thinkingHtml = marked.parse(formattedThinking) as string;
        return (
          <div key={index} className="my-3">
            <details className="group">
              <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">Agent Reasoning</span>
                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div 
                className="mt-2 pl-6 text-sm text-muted-foreground border-l-2 border-primary/20 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: thinkingHtml }}
              />
            </details>
          </div>
        );
      }

      if (item.type === "tool_use" && item.tool_use) {
        const toolType = item.tool_use.type || "generic";
        const toolName = item.tool_use.name || "Unknown Tool";
        const displayName = formatToolName(toolType, toolName);
        
        return (
          <div key={index} className="my-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {toolType.includes("analyst") ? (
                <Database className="h-4 w-4 text-primary" />
              ) : toolType.includes("search") ? (
                <FileText className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium">{displayName}</span>
              <Badge variant="outline" className="text-xs">
                Processing
              </Badge>
            </div>
          </div>
        );
      }

      if (item.type === "tool_result" && item.tool_result) {
        const toolType = item.tool_result.type || "generic";
        const toolName = item.tool_result.name || "Unknown Tool";
        const displayName = formatToolName(toolType, toolName);
        const status = item.tool_result.status;
        
        const resultContent = item.tool_result.content || [];
        const jsonResult = resultContent.find(c => c.type === "json")?.json;
        const sql = jsonResult?.sql;
        const resultSet = jsonResult?.result_set;
        
        return (
          <div key={index} className="my-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {toolType.includes("analyst") ? (
                <Database className="h-4 w-4 text-primary" />
              ) : toolType.includes("search") ? (
                <FileText className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium">{displayName}</span>
              <Badge 
                variant={status === "success" ? "default" : "destructive"} 
                className="text-xs"
              >
                {status === "success" ? "Complete" : status}
              </Badge>
            </div>
            {sql && (
              <SQLPreview
                sql={sql}
                onExpand={() => {
                  setSelectedSql(sql);
                  setSqlDialogOpen(true);
                }}
              />
            )}
            {resultSet && resultSet.data && (
              <DataTableFromResultSet resultSet={resultSet} />
            )}
          </div>
        );
      }

      if (item.type === "tool_use") {
        const toolName = item.tool_name || "Unknown Tool";
        const sql = item.input?.query as string | undefined;
        
        return (
          <div key={index} className="my-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {toolName.includes("analyst") ? (
                <Database className="h-4 w-4 text-primary" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium">
                {toolName.replace(/_/g, " ").replace(/cortex/gi, "").trim()}
              </span>
              <Badge variant="outline" className="text-xs">
                Processing
              </Badge>
            </div>
            {sql && (
              <SQLPreview
                sql={sql}
                onExpand={() => {
                  setSelectedSql(sql);
                  setSqlDialogOpen(true);
                }}
              />
            )}
          </div>
        );
      }

      if (item.type === "tool_results" && item.content) {
        const results = item.content as { type?: string; sql?: string; data?: unknown[] }[];
        return (
          <div key={index} className="my-3 space-y-3">
            {results.map((result, rIndex) => {
              if (result.sql) {
                return (
                  <SQLPreview
                    key={rIndex}
                    sql={result.sql}
                    onExpand={() => {
                      setSelectedSql(result.sql || "");
                      setSqlDialogOpen(true);
                    }}
                  />
                );
              }
              if (result.data && Array.isArray(result.data)) {
                return <DataTable key={rIndex} data={result.data} />;
              }
              return null;
            })}
          </div>
        );
      }

      if (item.type === "data_table" && item.data) {
        return <DataTable key={index} data={item.data} />;
      }

      return null;
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex justify-center py-1 bg-[var(--brand-accent,#29B5E8)] relative">
          <img src="/logo.png" alt="Company Logo" className="h-20 lg:h-24 object-contain" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-2 border-b border-sidebar-border">
          <div className="flex flex-col gap-1 bg-sidebar-accent/30 p-1 rounded-lg">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "chat"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-sidebar-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-sidebar-foreground hover:text-foreground"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
            </div>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "simulator"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-sidebar-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              ML Simulator
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "voice"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-sidebar-foreground hover:text-foreground"
              }`}
            >
              <Mic className="h-4 w-4" />
              Voice
            </button>
          </div>
        </div>

        {activeTab === "chat" && (
          <>
            <div className="p-4 border-b border-sidebar-border">
              <Button
                onClick={createNewConversation}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1 p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
                    conv.id === activeConversationId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm">{conv.title}</span>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </>
        )}

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Link
            href="/setup/branding"
            className="flex items-center gap-2 text-sm text-sidebar-foreground hover:text-primary transition-colors mb-3"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings className="h-4 w-4" />
            Setup
          </Link>
          <Link
            href="/guide"
            className="flex items-center gap-2 text-sm text-sidebar-foreground hover:text-primary transition-colors mb-3"
            onClick={() => setSidebarOpen(false)}
          >
            <BookOpen className="h-4 w-4" />
            Build Guide
          </Link>
          <div className="text-xs text-sidebar-foreground/60">
            Customer 360 Intelligence
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border lg:hidden z-30">
        <div className="flex justify-around py-2">
          <button
            onClick={() => { setActiveTab("chat"); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${activeTab === "chat" ? "text-primary" : "text-sidebar-foreground"}`}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${activeTab === "dashboard" ? "text-primary" : "text-sidebar-foreground"}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => { setActiveTab("simulator"); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${activeTab === "simulator" ? "text-primary" : "text-sidebar-foreground"}`}
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs">ML Sim</span>
          </button>
          <button
            onClick={() => { setActiveTab("voice"); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${activeTab === "voice" ? "text-primary" : "text-sidebar-foreground"}`}
          >
            <Mic className="h-5 w-5" />
            <span className="text-xs">Voice</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col pb-16 lg:pb-0">
        {activeTab === "dashboard" ? (
          <Dashboard />
        ) : activeTab === "simulator" ? (
          <ScenarioSimulator onBack={() => setActiveTab("chat")} />
        ) : activeTab === "voice" ? (
          <VoiceRecorder />
        ) : (
          <>
            <header className="h-14 border-b border-border flex items-center px-4 lg:px-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 lg:gap-3">
                <Bot className="h-5 w-5 text-primary hidden sm:block" />
                <h1 className="font-semibold text-sm sm:text-base">Customer 360 Assistant</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="text-xs hidden sm:flex">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Snowflake Cortex
                </Badge>
                <ThemeToggle />
              </div>
            </header>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="max-w-4xl mx-auto p-4 lg:p-6">
                  {!activeConversation || activeConversation.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                      <div className="h-12 w-12 sm:h-16 sm:w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                        <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-semibold mb-2">
                        Welcome to Customer 360
                      </h2>
                      <p className="text-muted-foreground mb-6 sm:mb-8 text-center max-w-md text-sm sm:text-base">
                        Ask questions about your customers, their products, interactions, and more. 
                        I can analyze data and provide insights.
                      </p>
                      
                      {showSuggestions && (
                        <div className="grid gap-2 sm:gap-3 w-full max-w-2xl px-2 sm:px-0">
                          <p className="text-sm text-muted-foreground mb-1 sm:mb-2">
                            Try asking:
                          </p>
                          {SUGGESTED_QUESTIONS.map((question, i) => (
                            <button
                              key={i}
                              onClick={() => sendMessage(question)}
                              className={`text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-colors ${i >= 3 ? 'hidden sm:block' : ''}`}
                            >
                              <span className="text-xs sm:text-sm">{question}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeConversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3"
                                : "bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3"
                            }`}
                          >
                            {message.role === "assistant" && (
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                                <Bot className="h-4 w-4 text-primary" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  Customer 360 Assistant
                                </span>
                              </div>
                            )}
                            {renderMessageContent(message.content)}
                          </div>
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                            <div className="flex items-center gap-2 mb-3">
                              <Bot className="h-4 w-4 text-primary animate-pulse" />
                              <span className="text-xs font-medium text-muted-foreground">
                                {streamingStatus || "Thinking..."}
                              </span>
                            </div>
                            {streamingThinking ? (
                              <div className="border-l-2 border-primary/30 pl-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                                  <span className="text-xs font-medium text-primary">Agent Reasoning</span>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {streamingThinking}
                                  <span className="inline-block w-1 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-56" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="border-t border-border p-3 lg:p-4">
              <div className="max-w-4xl mx-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(inputValue);
                  }}
                  className="flex gap-2 sm:gap-3"
                >
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about customers..."
                    className="flex-1 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 sm:px-4"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
                  Data is queried from Snowflake using Cortex Analyst
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={sqlDialogOpen} onOpenChange={setSqlDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Generated SQL Query
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <pre className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-all">
              {selectedSql}
            </pre>
          </ScrollArea>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(selectedSql, "dialog-sql")}
            >
              {copiedId === "dialog-sql" ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy SQL
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SQLPreview({
  sql,
  onExpand,
}: {
  sql: string;
  onExpand: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = sql.slice(0, 200);
  const hasMore = sql.length > 200;

  return (
    <Card className="bg-muted/50 border-border/50">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3 w-3" />
            <span>SQL Query</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onExpand} className="h-6 text-xs">
            View Full
          </Button>
        </div>
        <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
          {expanded ? sql : preview}
          {hasMore && !expanded && "..."}
        </pre>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show more
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}

function DataTable({ data }: { data: unknown[] }) {
  if (!data || data.length === 0) return null;

  const firstRow = data[0] as Record<string, unknown>;
  const columns = Object.keys(firstRow);
  const displayData = data.slice(0, 10);
  const hasMore = data.length > 10;

  return (
    <div className="space-y-3">
      <SmartChart data={data as Record<string, unknown>[]} columns={columns} />
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Table className="h-4 w-4 text-primary" />
            <span className="font-medium">Query Results</span>
            <Badge variant="outline" className="text-xs">
              {data.length} row{data.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 border-b border-border/50">
                      {String((row as Record<string, unknown>)[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
            Showing first 10 of {data.length} rows
          </div>
        )}
      </Card>
    </div>
  );
}

interface ResultSet {
  data: unknown[][];
  resultSetMetaData?: {
    numRows?: number;
    rowType?: Array<{ name: string }>;
  };
}

function DataTableFromResultSet({ resultSet }: { resultSet: ResultSet }) {
  if (!resultSet?.data || resultSet.data.length === 0) return null;

  const columns = resultSet.resultSetMetaData?.rowType?.map(r => r.name) || 
    resultSet.data[0]?.map((_, i) => `Column ${i + 1}`) || [];
  const displayData = resultSet.data.slice(0, 10);
  const totalRows = resultSet.resultSetMetaData?.numRows || resultSet.data.length;
  const hasMore = totalRows > 10;

  const chartData = resultSet.data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      obj[col] = (row as unknown[])[idx];
    });
    return obj;
  });

  return (
    <div className="space-y-3">
      <SmartChart data={chartData} columns={columns} />
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Table className="h-4 w-4 text-primary" />
            <span className="font-medium">Query Results</span>
            <Badge variant="outline" className="text-xs">
              {totalRows} row{totalRows !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  {(row as unknown[]).map((cell, j) => (
                    <td key={j} className="px-3 py-2 border-b border-border/50">
                      {String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30">
            Showing first 10 of {totalRows} rows
          </div>
        )}
      </Card>
    </div>
  );
}
