import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";

function db() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const statusEnum = z.enum(["todo", "progress", "completed"]);

export async function handleChat(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 500 });
  const { messages } = (await request.json()) as { messages: UIMessage[] };
  if (!Array.isArray(messages)) return Response.json({ error: "Invalid request" }, { status: 400 });

  const supabase = db();
  const lastUser = messages[messages.length - 1];
  if (lastUser?.role === "user") {
    const { error } = await supabase.from("chat_messages").insert({ message: lastUser as never });
    if (error) console.error("save user message failed", error);
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions:
      "You are Flow, a friendly assistant inside a kanban board app. Columns: todo (To Do), progress (In Progress), completed (Completed). Use tools to read and change tasks. Always call list_tasks before answering questions about tasks or before updating/deleting so you have IDs. Keep replies short and use markdown.",
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    stopWhen: stepCountIs(50),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
    tools: {
      list_tasks: tool({
        description: "List all tasks on the board",
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await supabase.from("tasks").select("id,title,description,status").order("position");
          return error ? { error: error.message } : { tasks: data };
        },
      }),
      create_task: tool({
        description: "Create a new task",
        inputSchema: z.object({ title: z.string(), description: z.string(), status: statusEnum }),
        execute: async (input) => {
          const { data, error } = await supabase.from("tasks").insert({ ...input, position: Date.now() }).select("id,title,status").single();
          return error ? { error: error.message } : { created: data };
        },
      }),
      update_task: tool({
        description: "Update a task's title, description or status (move between columns). Pass null for fields to keep.",
        inputSchema: z.object({
          id: z.string(),
          title: z.string().nullable(),
          description: z.string().nullable(),
          status: statusEnum.nullable(),
        }),
        execute: async ({ id, ...rest }) => {
          const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== null));
          const { data, error } = await supabase.from("tasks").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("id,title,status").single();
          return error ? { error: error.message } : { updated: data };
        },
      }),
      delete_task: tool({
        description: "Delete a task by id",
        inputSchema: z.object({ id: z.string() }),
        execute: async ({ id }) => {
          const { error } = await supabase.from("tasks").delete().eq("id", id);
          return error ? { error: error.message } : { deleted: id };
        },
      }),
    },
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: () => crypto.randomUUID(),
      sendReasoning: true,
      onFinish: async ({ responseMessage }) => {
        const { error } = await supabase.from("chat_messages").insert({ message: responseMessage as never });
        if (error) console.error("save assistant message failed", error);
      },
      onError: (e) => {
        console.error(e);
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 429) return "Too many requests — please wait a moment and try again.";
        if (status === 402) return "AI credits are used up. Add credits in your workspace billing settings.";
        return "Something went wrong talking to the assistant.";
      },
    }),
    runIdFetch,
  );
}
