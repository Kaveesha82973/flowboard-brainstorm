import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { CheckCheck, Circle, Loader, Plus, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { COLUMNS, tasksQuery, useTaskMutations, type Task, type TaskStatus } from "@/lib/tasks";
import { TaskDialog } from "@/components/TaskDialog";

export const Route = createFileRoute("/board")({
  head: () => ({
    meta: [
      { title: "Board — Flowboard" },
      { name: "description", content: "Drag tasks between To Do, In Progress and Completed." },
      { property: "og:title", content: "Board — Flowboard" },
      { property: "og:description", content: "Drag tasks between To Do, In Progress and Completed." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: Board,
});

const colStyle: Record<TaskStatus, { icon: typeof Circle; dot: string; bar: string; pct: number }> = {
  todo: { icon: Circle, dot: "text-todo", bar: "bg-todo", pct: 0 },
  progress: { icon: Loader, dot: "text-progress", bar: "bg-bar", pct: 50 },
  completed: { icon: CheckCheck, dot: "text-done", bar: "bg-done", pct: 100 },
};

function Board() {
  const { data: tasks } = useSuspenseQuery(tasksQuery);
  const { update } = useTaskMutations();
  const [active, setActive] = useState<Task | null>(null);
  const [dialog, setDialog] = useState<{ status: TaskStatus; task?: Task } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const to = e.over?.id as TaskStatus | undefined;
    const t = tasks.find((x) => x.id === e.active.id);
    if (t && to && t.status !== to) update.mutate({ id: t.id, status: to, position: Date.now() });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 md:px-8">
        <div>
          <p className="text-sm text-muted-foreground">Workspace / Board</p>
          <h1 className="text-2xl font-bold tracking-tight">My Board</h1>
        </div>
        <button onClick={() => setDialog({ status: "todo" })} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </header>
      <DndContext sensors={sensors} onDragStart={(e) => setActive(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
        <div className="grid flex-1 gap-4 overflow-x-auto p-4 md:grid-cols-3 md:p-6">
          {COLUMNS.map((c) => (
            <Column key={c.id} id={c.id} label={c.label} tasks={tasks.filter((t) => t.status === c.id)} onAdd={() => setDialog({ status: c.id })} onEdit={(task) => setDialog({ status: task.status, task })} />
          ))}
        </div>
        <DragOverlay>{active ? <Card task={active} overlay /> : null}</DragOverlay>
      </DndContext>
      {dialog && <TaskDialog {...dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Column({ id, label, tasks, onAdd, onEdit }: { id: TaskStatus; label: string; tasks: Task[]; onAdd: () => void; onEdit: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const S = colStyle[id];
  return (
    <section ref={setNodeRef} className={`flex min-h-[300px] flex-col rounded-2xl bg-lane p-3 transition-colors ${isOver ? "ring-2 ring-primary/40" : ""}`}>
      <div className="mb-3 flex items-center gap-2 px-2 pt-1">
        <S.icon className={`h-4 w-4 ${S.dot}`} />
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="rounded-md bg-card px-1.5 text-xs text-muted-foreground">{tasks.length}</span>
        <button onClick={onAdd} aria-label={`Add to ${label}`} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-card">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.map((t) => <Draggable key={t.id} task={t} onEdit={() => onEdit(t)} />)}
      </div>
      <button onClick={onAdd} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 py-2.5 text-sm text-primary transition-colors hover:bg-accent">
        <Plus className="h-4 w-4" /> Add Task
      </button>
    </section>
  );
}

function Draggable({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={isDragging ? "opacity-30" : ""}>
      <Card task={task} onEdit={onEdit} />
    </div>
  );
}

function Card({ task, overlay, onEdit }: { task: Task; overlay?: boolean; onEdit?: () => void }) {
  const { remove } = useTaskMutations();
  const S = colStyle[task.status];
  return (
    <article className={`group cursor-grab rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:cursor-grabbing ${overlay ? "rotate-2 shadow-lift" : ""}`}>
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-sm font-semibold leading-snug">{task.title}</h3>
        {onEdit && (
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button onPointerDown={(e) => e.stopPropagation()} onClick={onEdit} aria-label="Edit" className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove.mutate(task.id)} aria-label="Delete" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{task.status === "completed" ? "Done" : "Progress"}</span>
        <span>{S.pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${S.bar}`} style={{ width: `${Math.max(S.pct, 4)}%` }} />
      </div>
    </article>
  );
}
