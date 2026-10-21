import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Square, Workflow, X, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

const toolLabels: Record<string, string> = {
  list_tasks: "Checked your board",
  create_task: "Created a task",
  update_task: "Updated a task",
  delete_task: "Deleted a task",
};

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  useEffect(() => {
    supabase
      .from("chat_messages")
      .select("message")
      .order("created_at")
      .then(({ data }) => setInitial((data ?? []).map((r) => r.message as unknown as UIMessage)));
  }, []);
  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-lift transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Workflow className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Flow AI</p>
          <p className="text-xs text-muted-foreground">Ask about or manage your tasks</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      {initial ? <ChatBody initial={initial} open={open} /> : <div className="flex-1" />}
    </div>
  );
}

function ChatBody({ initial, open }: { initial: UIMessage[]; open: boolean }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop } = useChat({
    id: "main",
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      inputRef.current?.focus();
    },
    onError: (e) => setErr(e.message || "Something went wrong"),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, status]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    sendMessage({ text });
    setInput("");
  };

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="mt-10 space-y-2 text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">How can I help?</p>
            {["What's in progress right now?", "Add a task to write release notes", "Move all to-dos to in progress"].map((s) => (
              <button key={s} onClick={() => setInput(s)} className="block w-full rounded-xl border px-3 py-2 text-left transition-colors hover:bg-muted">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={m.id} className="space-y-2 text-sm">
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return (
                    <div key={i} className="prose prose-sm max-w-none leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                      <ReactMarkdown>{p.text}</ReactMarkdown>
                    </div>
                  );
                if (p.type.startsWith("tool-")) {
                  const name = p.type.slice(5);
                  return (
                    <div key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <Wrench className="h-3 w-3" /> {toolLabels[name] ?? name}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ),
        )}
        {status === "submitted" && (
          <div className="flex gap-1 px-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        <div ref={endRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex items-end gap-2 rounded-2xl border bg-lane p-2 focus-within:ring-2 focus-within:ring-ring/40">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask Flow anything…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
          />
          <button
            onClick={busy ? stop : submit}
            aria-label={busy ? "Stop" : "Send"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            disabled={!busy && !input.trim()}
          >
            {busy ? <Square className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
