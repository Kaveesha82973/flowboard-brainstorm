import { useState } from "react";
import { COLUMNS, useTaskMutations, type Task, type TaskStatus } from "@/lib/tasks";

export function TaskDialog({ status, task, onClose }: { status: TaskStatus; task?: Task; onClose: () => void }) {
  const { create, update } = useTaskMutations();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [col, setCol] = useState<TaskStatus>(task?.status ?? status);

  const save = async () => {
    if (!title.trim()) return;
    if (task) await update.mutateAsync({ id: task.id, title: title.trim(), description, status: col });
    else await create.mutateAsync({ title: title.trim(), description, status: col });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-lift animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">{task ? "Edit task" : "New task"}</h2>
        <div className="mt-4 space-y-3">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="Task title" className="w-full rounded-xl border bg-lane px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="w-full resize-none rounded-xl border bg-lane px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          <div className="flex gap-2">
            {COLUMNS.map((c) => (
              <button key={c.id} onClick={() => setCol(c.id)} className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${col === c.id ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={!title.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {task ? "Save" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
