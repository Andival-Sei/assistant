import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarClock,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getCurrentPushSubscription,
  getPushSupportState,
  showLocalTaskNotification,
  subscribeToPush,
  unsubscribePush,
} from "@/lib/pwa";
import { tasksService } from "@/lib/services/tasks-service";
import type { Task } from "@/types/tasks";

type FilterMode = "all" | "active" | "done";

function buildDueDateIso(date: string, time: string): string | null {
  if (!date) return null;

  const safeTime = time || "09:00";
  const localValue = `${date}T${safeTime}:00`;
  const parsed = new Date(localValue);

  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  const dueDate = task.due_at ? new Date(task.due_at) : null;
  const isOverdue =
    Boolean(dueDate) && !task.is_completed && dueDate!.getTime() < Date.now();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "group rounded-2xl border p-4 sm:p-5",
        "bg-card/60 backdrop-blur-sm transition-all duration-200",
        task.is_completed
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border/60 hover:border-primary/40"
      )}
    >
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant={task.is_completed ? "default" : "outline"}
          size="icon-sm"
          className="mt-0.5 rounded-full"
          onClick={() => onToggle(task)}
          aria-label={
            task.is_completed
              ? "Снять отметку выполнения"
              : "Отметить как выполненную"
          }
        >
          {task.is_completed ? (
            <Check className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </Button>

        <div className="min-w-0 flex-1 space-y-2">
          <p
            className={cn(
              "text-sm sm:text-base font-medium leading-snug",
              task.is_completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>

          {task.notes && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {task.notes}
            </p>
          )}

          {dueDate && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1",
                  isOverdue
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                )}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                {format(dueDate, "dd MMM yyyy, HH:mm", { locale: ru })}
              </span>
              <span className="text-muted-foreground">
                {formatDistanceToNow(dueDate, {
                  addSuffix: true,
                  locale: ru,
                })}
              </span>
              {task.reminder_enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                  <Bell className="h-3.5 w-3.5" />
                  push
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                  <BellOff className="h-3.5 w-3.5" />
                  без push
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="opacity-70 hover:opacity-100"
          onClick={() => onDelete(task.id)}
          aria-label="Удалить задачу"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export function TasksPage() {
  const queryClient = useQueryClient();
  const scheduledReminderIdsRef = useRef<Set<string>>(new Set());

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);

  const pushSupport = getPushSupportState();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksService.getTasks(),
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const dueAtIso = buildDueDateIso(dueDate, dueTime);
      if (dueDate && !dueAtIso) {
        throw new Error("Некорректная дата напоминания");
      }

      const created = await tasksService.createTask({
        title,
        notes,
        due_at: dueAtIso,
        reminder_enabled: dueAtIso ? reminderEnabled : false,
      });

      if (dueAtIso && reminderEnabled && dueAtIso <= new Date().toISOString()) {
        await showLocalTaskNotification(created.title);
      }
    },
    onSuccess: () => {
      setTitle("");
      setNotes("");
      setDueDate("");
      setDueTime("09:00");
      setReminderEnabled(true);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача добавлена");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Ошибка создания задачи"
      );
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Partial<Task>;
    }) => tasksService.updateTask(taskId, updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Не удалось обновить задачу"
      );
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksService.deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача удалена");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить задачу"
      );
    },
  });

  const connectPushMutation = useMutation({
    mutationFn: async () => {
      const subscription = await subscribeToPush();
      await tasksService.upsertPushSubscription(subscription);
    },
    onSuccess: () => {
      setPushEnabled(true);
      toast.success("Push-уведомления включены");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось включить push-уведомления"
      );
    },
  });

  const disconnectPushMutation = useMutation({
    mutationFn: async () => {
      const subscription = await getCurrentPushSubscription();
      if (subscription) {
        await tasksService.removePushSubscription(subscription.endpoint);
        await unsubscribePush(subscription);
      }
    },
    onSuccess: () => {
      setPushEnabled(false);
      toast.success("Push-уведомления отключены");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось отключить push-уведомления"
      );
    },
  });

  useEffect(() => {
    void (async () => {
      try {
        const subscription = await getCurrentPushSubscription();
        if (!subscription) {
          setPushEnabled(false);
          return;
        }

        const exists = await tasksService.hasPushSubscription(
          subscription.endpoint
        );
        if (!exists) {
          await tasksService.upsertPushSubscription(subscription);
        }
        setPushEnabled(true);
      } catch {
        setPushEnabled(false);
      } finally {
        setCheckingPush(false);
      }
    })();
  }, []);

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((task) => !task.is_completed);
    if (filter === "done") return tasks.filter((task) => task.is_completed);
    return tasks;
  }, [filter, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.is_completed).length;
    const active = total - done;

    return {
      total,
      done,
      active,
    };
  }, [tasks]);

  const handleCreate = () => {
    const normalized = title.trim();
    if (!normalized) {
      toast.error("Введите название задачи");
      return;
    }

    void createTaskMutation.mutateAsync();
  };

  const handleToggleTask = (task: Task) => {
    void updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: {
        is_completed: !task.is_completed,
      },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    void deleteTaskMutation.mutateAsync(taskId);
  };

  useEffect(() => {
    const timers: Array<number> = [];

    const schedule = (task: Task, timeoutMs: number) => {
      const timerId = window.setTimeout(async () => {
        try {
          await showLocalTaskNotification(task.title);
          await updateTaskMutation.mutateAsync({
            taskId: task.id,
            updates: { reminder_sent_at: new Date().toISOString() },
          });
        } finally {
          scheduledReminderIdsRef.current.delete(task.id);
        }
      }, timeoutMs);

      timers.push(timerId);
    };

    for (const task of tasks) {
      if (
        !task.due_at ||
        !task.reminder_enabled ||
        task.is_completed ||
        task.reminder_sent_at ||
        scheduledReminderIdsRef.current.has(task.id)
      ) {
        continue;
      }

      const dueMs = new Date(task.due_at).getTime();
      if (Number.isNaN(dueMs)) {
        continue;
      }

      const delay = dueMs - Date.now();
      scheduledReminderIdsRef.current.add(task.id);
      schedule(task, Math.max(delay, 0));
    }

    return () => {
      for (const timerId of timers) {
        clearTimeout(timerId);
      }
    };
  }, [tasks, updateTaskMutation]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Задачи и напоминания
            </h1>
            <p className="text-muted-foreground mt-1">
              Быстрый todo + дедлайны с push через PWA.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm backdrop-blur-sm">
            <span className="text-muted-foreground">Активных:</span>
            <span className="font-semibold">{stats.active}</span>
            <span className="text-muted-foreground">Выполнено:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.done}
            </span>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05} direction="up" distance={12}>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Позвонить врачу"
              className="h-11 rounded-xl"
              maxLength={180}
            />
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Комментарий (необязательно)"
              className="h-11 rounded-xl"
              maxLength={400}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Дата
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Время
              </label>
              <Input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                className="h-11 rounded-xl"
                disabled={!dueDate}
              />
            </div>

            <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={reminderEnabled}
                onChange={(event) => setReminderEnabled(event.target.checked)}
                disabled={!dueDate}
              />
              Напомнить push
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-border/60 bg-background/60 p-1">
              {(
                [
                  { key: "all", label: "Все" },
                  { key: "active", label: "Активные" },
                  { key: "done", label: "Готово" },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs sm:text-sm transition-colors",
                    filter === item.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              className="h-11 rounded-xl px-4"
              onClick={handleCreate}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Добавить задачу
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08} direction="up" distance={12}>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Push-уведомления</h2>
              <p className="text-sm text-muted-foreground">
                Нужны для напоминаний по задачам в заданное время.
              </p>
            </div>

            <Button
              type="button"
              variant={pushEnabled ? "outline" : "default"}
              onClick={() => {
                if (pushEnabled) {
                  void disconnectPushMutation.mutateAsync();
                  return;
                }
                void connectPushMutation.mutateAsync();
              }}
              disabled={
                !pushSupport.isSupported ||
                checkingPush ||
                connectPushMutation.isPending ||
                disconnectPushMutation.isPending
              }
              className="rounded-xl"
            >
              {checkingPush ||
              connectPushMutation.isPending ||
              disconnectPushMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pushEnabled ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {pushEnabled ? "Отключить" : "Включить"}
            </Button>
          </div>

          {!pushSupport.isSupported && (
            <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Этот браузер не поддерживает web push.
            </p>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 text-center text-muted-foreground">
              Загрузка задач...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Пока пусто. Добавьте первую задачу выше.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
