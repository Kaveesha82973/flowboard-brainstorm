import { Link } from "@tanstack/react-router";
import { LayoutDashboard, KanbanSquare, MessageCircle, Workflow } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ChatPanel } from "./ChatPanel";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/board", label: "Board", icon: KanbanSquare },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1500px] overflow-hidden rounded-3xl bg-sidebar shadow-lift">
        <aside className="hidden w-60 shrink-0 flex-col p-5 text-sidebar-foreground md:flex">
          <div className="mb-8 flex items-center gap-2.5 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Workflow className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-primary-foreground">Flowboard</span>
          </div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider opacity-60">Main menu</p>
          <nav className="flex flex-col gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-primary-foreground font-medium" }}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setChatOpen(true)}
            className="mt-auto flex items-center gap-3 rounded-xl border border-sidebar-border px-3 py-3 text-sm transition-colors hover:bg-sidebar-accent"
          >
            <MessageCircle className="h-4 w-4" /> Ask Flow AI
          </button>
        </aside>
        <main className="relative m-0 flex-1 overflow-hidden bg-card md:my-2 md:mr-2 md:rounded-2xl">
          <div className="flex gap-2 border-b p-3 md:hidden">
            {nav.map(({ to, label }) => (
              <Link key={to} to={to} activeOptions={{ exact: true }} className="rounded-lg px-3 py-1.5 text-sm" activeProps={{ className: "bg-accent text-accent-foreground" }}>
                {label}
              </Link>
            ))}
          </div>
          {children}
        </main>
      </div>
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
