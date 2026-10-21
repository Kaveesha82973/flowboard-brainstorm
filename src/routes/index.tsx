import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCheck, Circle, Loader, ListTodo } from "lucide-react";
import { tasksQuery } from "@/lib/tasks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowboard — Kanban Dashboard" },
      { name: "description", content: "See your task counts and overall progress at a glance." },
      { property: "og:title", content: "Flowboard — Kanban Dashboard" },
      { property: "og:description", content: "See your task counts and overall progress at a glance." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: Dashboard,
});

function Dashboard() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const count = (s: string) => tasks.filter((t) => t.status === s).length;
  const total = tasks.length;
  const done = count("completed");
  const pct = total ? Math.round((done / total) * 100) : 0;
  const stats = [
    { label: "Total tasks", value: total, icon: ListTodo, tone: "bg-accent text-accent-foreground" },
    { label: "To Do", value: count("todo"), icon: Circle, tone: "bg-todo-soft text-todo" },
    { label: "In Progress", value: count("progress"), icon: Loader, tone: "bg-progress-soft text-progress" },
    { label: "Completed", value: done, icon: CheckCheck, tone: "bg-done-soft text-done" },
  ];

  return (
    <div className="p-6 md:p-10">
      <p className="text-sm text-muted-foreground">Welcome back 👋</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-card transition-transform hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall progress</p>
            <p className="text-4xl font-bold">{pct}%</p>
          </div>
          <p className="text-sm text-muted-foreground">{done} of {total} completed</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-bar transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-5 flex h-2 overflow-hidden rounded-full">
          {total > 0 && (
            <>
              <div className="bg-todo" style={{ width: `${(count("todo") / total) * 100}%` }} />
              <div className="bg-progress" style={{ width: `${(count("progress") / total) * 100}%` }} />
              <div className="bg-done" style={{ width: `${(done / total) * 100}%` }} />
            </>
          )}
        </div>
        <Link to="/board" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5">
          Open board <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
