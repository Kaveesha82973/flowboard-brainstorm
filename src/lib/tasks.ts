import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "todo" | "progress" | "completed";
export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
  progress: number;
  created_at: string;
};

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,description,status,position,progress,created_at")
      .order("position");
    if (error) throw error;
    return data as Task[];
  },
});

export function useTaskMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const create = useMutation({
    mutationFn: async (t: { title: string; description: string; status: TaskStatus; progress: number }) => {
      const { error } = await supabase.from("tasks").insert({ ...t, position: Date.now() });
      if (error) throw error;
    },
    onSettled: done,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      qc.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    onSettled: done,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: done,
  });
  return { create, update, remove };
}
