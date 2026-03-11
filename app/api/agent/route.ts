import { NextRequest } from "next/server";
import { runAgent, type AgentMessage } from "@/lib/cortex-agent";

const AGENT_NAME = process.env.CORTEX_AGENT_NAME || "CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_360_AGENT";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Missing message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = key.toLowerCase().includes('token') ? `${value.substring(0, 20)}...` : value;
    });
    console.log("Request headers:", JSON.stringify(headers, null, 2));

    const messages: AgentMessage[] = history || [];
    messages.push({
      role: "user",
      content: [{ type: "text", text: message }],
    });

    const agentStream = runAgent(AGENT_NAME, messages);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of agentStream) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = `data: ${JSON.stringify({ error: (error as Error).message })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error running agent:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
