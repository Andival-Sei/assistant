import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  Plus,
  Sparkles,
  Square,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/db/supabase-client";
import {
  getCurrentPushSubscription,
  getPushSupportState,
  runPushDiagnostics,
  showLocalTaskNotification,
  subscribeToPush,
  unsubscribePush,
} from "@/lib/pwa";
import { tasksService } from "@/lib/services/tasks-service";
import { cn } from "@/lib/utils";
import type {
  Task,
  TaskCreateInput,
  TaskIntentParseResult,
} from "@/types/tasks";

type FilterMode = "all" | "active" | "done";

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
};
type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex?: number;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous?: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

const SILENCE_TIMEOUT_MS = 10000;

function buildDueDateIso(date: string, time: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T${time || "09:00"}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatDueAt(value: string | null): string {
  if (!value) return "Без даты";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Без даты";
  return format(parsed, "dd MMM yyyy, HH:mm", { locale: ru });
}

function toLocalDateInput(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function toLocalTimeInput(value: string | null): string {
  if (!value) return "09:00";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "09:00";
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function mergeLocalDateTimeToIso(date: string, time: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T${time || "09:00"}:00`);
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
                {formatDistanceToNow(dueDate, { addSuffix: true, locale: ru })}
              </span>
              {task.reminder_enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                  <Bell className="h-3.5 w-3.5" />
                  пуш
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
                  <BellOff className="h-3.5 w-3.5" />
                  без пуша
                </span>
              )}
              {task.recurrence_text && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-sky-600 dark:text-sky-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  {task.recurrence_text}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scheduledReminderIdsRef = useRef<Set<string>>(new Set());

  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef("");
  const lastSpeechAtRef = useRef(Date.now());
  const stopReasonRef = useRef<"manual" | "silence" | null>(null);
  const lastUiTickRef = useRef(0);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const [smartText, setSmartText] = useState("");
  const [smartDraft, setSmartDraft] = useState<TaskIntentParseResult | null>(
    null
  );
  const [listening, setListening] = useState(false);
  const [isSilentNow, setIsSilentNow] = useState(false);
  const [silenceMsLeft, setSilenceMsLeft] = useState(SILENCE_TIMEOUT_MS);
  const [voiceBars, setVoiceBars] = useState<number[]>(Array(20).fill(0.08));

  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showAiSection, setShowAiSection] = useState(true);
  const [showManualSection, setShowManualSection] = useState(false);

  const [filter, setFilter] = useState<FilterMode>("all");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsText, setDiagnosticsText] = useState("");

  const pushSupport = getPushSupportState();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksService.getTasks(),
  });
  const createTaskMutation = useMutation({
    mutationFn: async (payload: TaskCreateInput) => {
      const created = await tasksService.createTask(payload);
      if (
        payload.due_at &&
        payload.reminder_enabled &&
        payload.due_at <= new Date().toISOString()
      ) {
        await showLocalTaskNotification(created.title);
      }
    },
    onSuccess: () => {
      setTitle("");
      setNotes("");
      setDueDate("");
      setDueTime("09:00");
      setReminderEnabled(true);
      setSmartText("");
      setSmartDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача добавлена");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Ошибка создания задачи"
      ),
  });

  const parseIntentMutation = useMutation({
    mutationFn: ({
      text,
      source,
    }: {
      text: string;
      source: "text" | "voice";
    }) =>
      tasksService.parseTaskIntent({
        text,
        source,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    onSuccess: (data) => {
      setSmartDraft(data);
      toast.success("Черновик задачи готов");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка AI-разбора"),
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
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Не удалось обновить задачу"
      ),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksService.deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Задача удалена");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить задачу"
      ),
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
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось включить push-уведомления"
      ),
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
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось отключить push-уведомления"
      ),
  });

  const stopAudioMonitor = () => {
    if (audioFrameRef.current !== null) {
      cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVoiceBars(Array(20).fill(0.08));
    setSilenceMsLeft(SILENCE_TIMEOUT_MS);
    setIsSilentNow(false);
  };

  const stopVoiceCapture = (reason: "manual" | "silence") => {
    stopReasonRef.current = reason;
    setListening(false);
    stopAudioMonitor();
    if (reason === "silence")
      toast.message("Голосовой ввод остановлен: 10 секунд тишины");
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      recognition.abort?.();
    }
  };

  const startAudioMonitor = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mediaStreamRef.current = stream;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const timeData = new Uint8Array(analyser.fftSize);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    lastSpeechAtRef.current = Date.now();

    const loop = (now: number) => {
      if (!analyserRef.current || !speechRecognitionRef.current) return;
      analyser.getByteTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i += 1) {
        const centered = (timeData[i] - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / timeData.length);
      if (rms > 0.035) lastSpeechAtRef.current = Date.now();

      const silentMs = Date.now() - lastSpeechAtRef.current;
      const silent = silentMs > 350;

      if (now - lastUiTickRef.current > 85) {
        analyser.getByteFrequencyData(freqData);
        const bars = Array.from({ length: 20 }, (_, index) => {
          const from = Math.floor((index / 20) * freqData.length);
          const to = Math.floor(((index + 1) / 20) * freqData.length);
          let avg = 0;
          for (let j = from; j < to; j += 1) avg += freqData[j] || 0;
          avg /= Math.max(to - from, 1);
          const normalized = avg / 255;
          return Math.max(normalized, silent ? 0.02 : 0.07);
        });

        setVoiceBars(bars);
        setIsSilentNow(silent);
        setSilenceMsLeft(Math.max(SILENCE_TIMEOUT_MS - silentMs, 0));
        lastUiTickRef.current = now;
      }

      if (silentMs >= SILENCE_TIMEOUT_MS) {
        stopVoiceCapture("silence");
        return;
      }
      audioFrameRef.current = requestAnimationFrame(loop);
    };

    audioFrameRef.current = requestAnimationFrame(loop);
  };

  const handleStartVoiceCapture = async () => {
    if (listening) {
      stopVoiceCapture("manual");
      return;
    }
    if (hasGeminiKey === false) {
      setShowGeminiModal(true);
      return;
    }

    const RecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      toast.error("Голосовой ввод не поддерживается в этом браузере");
      return;
    }

    finalTranscriptRef.current = "";
    stopReasonRef.current = null;

    const recognition = new RecognitionCtor();
    speechRecognitionRef.current = recognition;
    recognition.lang = "ru-RU";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let all = "";
      const startIndex = event.resultIndex ?? 0;
      for (let i = 0; i < event.results.length; i += 1)
        all += `${event.results[i][0]?.transcript ?? ""} `;
      for (let i = startIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal)
          finalTranscriptRef.current += `${event.results[i][0]?.transcript ?? ""} `;
      }
      const normalized = all.trim();
      if (normalized) setSmartText(normalized);
    };
    recognition.onerror = (event) => {
      setListening(false);
      stopAudioMonitor();
      if (event.error !== "aborted")
        toast.error("Не удалось распознать речь. Попробуйте снова.");
    };
    recognition.onend = () => {
      setListening(false);
      stopAudioMonitor();
      const normalized =
        finalTranscriptRef.current.trim() || smartText.trim() || "";
      if (normalized && hasGeminiKey) {
        setSmartText(normalized);
        void parseIntentMutation.mutateAsync({
          text: normalized,
          source: "voice",
        });
      } else if (!normalized && stopReasonRef.current !== "manual") {
        toast.message("Речь не распознана. Попробуйте ещё раз.");
      }
      stopReasonRef.current = null;
    };

    try {
      setListening(true);
      recognition.start();
      void startAudioMonitor().catch(() => {
        // Voice recognition should continue even if audio meter init fails.
      });
    } catch (error) {
      stopAudioMonitor();
      setListening(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось запустить голосовой ввод"
      );
    }
  };
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
        if (!exists) await tasksService.upsertPushSubscription(subscription);
        setPushEnabled(true);
      } catch {
        setPushEnabled(false);
      } finally {
        setCheckingPush(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabaseClient
          .from("user_settings")
          .select("gemini_api_key")
          .maybeSingle();
        const hasKey = Boolean(data?.gemini_api_key?.trim());
        setHasGeminiKey(hasKey);
        setShowAiSection(hasKey);
        setShowManualSection(!hasKey);
      } catch {
        setHasGeminiKey(false);
        setShowAiSection(false);
        setShowManualSection(true);
      }
    })();
  }, []);

  useEffect(
    () => () => {
      stopAudioMonitor();
      speechRecognitionRef.current?.stop();
    },
    []
  );

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((task) => !task.is_completed);
    if (filter === "done") return tasks.filter((task) => task.is_completed);
    return tasks;
  }, [filter, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.is_completed).length;
    return { total, done, active: total - done };
  }, [tasks]);

  const handleCreate = () => {
    const normalized = title.trim();
    if (!normalized) {
      toast.error("Введите название задачи");
      return;
    }
    const dueAtIso = buildDueDateIso(dueDate, dueTime);
    if (dueDate && !dueAtIso) {
      toast.error("Некорректная дата напоминания");
      return;
    }
    void createTaskMutation.mutateAsync({
      title: normalized,
      notes,
      due_at: dueAtIso,
      reminder_enabled: dueAtIso ? reminderEnabled : false,
      timezone: dueAtIso
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null,
    });
  };

  const handleParseSmartText = (source: "text" | "voice" = "text") => {
    if (hasGeminiKey === false) {
      setShowGeminiModal(true);
      return;
    }
    const normalized = smartText.trim();
    if (!normalized) {
      toast.error("Введите текст задачи");
      return;
    }
    void parseIntentMutation.mutateAsync({ text: normalized, source });
  };

  const handleCreateFromDraft = () => {
    if (!smartDraft) return;
    void createTaskMutation.mutateAsync({
      title: smartDraft.title,
      notes: smartDraft.notes,
      due_at: smartDraft.due_at,
      timezone: smartDraft.timezone,
      recurrence_rule: smartDraft.recurrence_rule,
      recurrence_text: smartDraft.recurrence_text,
      source_text: smartDraft.source_text,
      parse_confidence: smartDraft.confidence,
      parse_model: smartDraft.parser_model,
      parse_assumptions: smartDraft.assumptions,
      reminder_enabled: smartDraft.reminder_enabled,
    });
  };

  const handleDraftDateChange = (date: string) => {
    setSmartDraft((prev) => {
      if (!prev) return prev;
      const nextIso = mergeLocalDateTimeToIso(
        date,
        toLocalTimeInput(prev.due_at)
      );
      return {
        ...prev,
        due_at: nextIso,
        reminder_enabled: Boolean(nextIso),
      };
    });
  };

  const handleDraftTimeChange = (time: string) => {
    setSmartDraft((prev) => {
      if (!prev) return prev;
      const nextIso = mergeLocalDateTimeToIso(
        toLocalDateInput(prev.due_at),
        time
      );
      return {
        ...prev,
        due_at: nextIso,
        reminder_enabled: Boolean(nextIso),
      };
    });
  };

  const handleToggleTask = (task: Task) => {
    void updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: { is_completed: !task.is_completed },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    void deleteTaskMutation.mutateAsync(taskId);
  };

  const handleRunDiagnostics = async () => {
    if (!import.meta.env.DEV) return;
    setDiagnosticsLoading(true);
    try {
      const diagnostics = await runPushDiagnostics();
      setDiagnosticsText(JSON.stringify(diagnostics, null, 2));
      toast.success("Диагностика push завершена");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка диагностики push";
      setDiagnosticsText(`Ошибка: ${message}`);
      toast.error(message);
    } finally {
      setDiagnosticsLoading(false);
    }
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
        task.recurrence_rule ||
        scheduledReminderIdsRef.current.has(task.id)
      )
        continue;
      const dueMs = new Date(task.due_at).getTime();
      if (Number.isNaN(dueMs)) continue;
      const delay = dueMs - Date.now();
      scheduledReminderIdsRef.current.add(task.id);
      schedule(task, Math.max(delay, 0));
    }

    return () => {
      for (const timerId of timers) clearTimeout(timerId);
    };
  }, [tasks, updateTaskMutation]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <FadeIn direction="up" distance={12}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Умные задачи и напоминания
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-добавление задач через текст и голос, повторы и
              push-уведомления.
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

      <FadeIn delay={0.03} direction="up" distance={12}>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 backdrop-blur-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={showAiSection ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => {
                if (hasGeminiKey === false) {
                  setShowGeminiModal(true);
                  return;
                }
                setShowAiSection((prev) => !prev);
              }}
            >
              <WandSparkles className="h-4 w-4" />
              AI-режим
              {showAiSection ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant={showManualSection ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setShowManualSection((prev) => !prev)}
            >
              Ручное добавление
              {showManualSection ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {showAiSection && hasGeminiKey !== false && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  AI-добавление задачи
                </label>
                <textarea
                  value={smartText}
                  onChange={(event) => setSmartText(event.target.value)}
                  className="min-h-[96px] w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none ring-0 transition-colors focus:border-primary"
                  placeholder="Например: в следующем месяце оплатить квартиру во второй вторник в середине дня"
                  maxLength={500}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => handleParseSmartText("text")}
                  disabled={parseIntentMutation.isPending}
                >
                  {parseIntentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Составить задачу
                </Button>
                <Button
                  type="button"
                  variant={listening ? "default" : "outline"}
                  className="rounded-xl"
                  onClick={() => void handleStartVoiceCapture()}
                  disabled={parseIntentMutation.isPending}
                >
                  {listening ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {listening ? "Остановить запись" : "Голосовой ввод"}
                </Button>
              </div>

              {listening && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-rose-500">
                      <span className="relative inline-flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
                      </span>
                      Идёт запись речи
                    </div>
                    {isSilentNow ? (
                      <p className="text-xs text-muted-foreground">
                        Тишина: автостоп через {Math.ceil(silenceMsLeft / 1000)}
                        с
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Речь обнаружена
                      </p>
                    )}
                  </div>
                  <div className="flex h-12 items-end gap-1.5">
                    {voiceBars.map((value, index) => (
                      <motion.span
                        key={index}
                        className="w-1.5 rounded-full bg-rose-500"
                        animate={{
                          height: `${4 + value * 44}px`,
                          opacity: 0.35 + value * 0.65,
                        }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {smartDraft && (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Черновик от AI</p>
                    <p className="text-xs text-muted-foreground">
                      Точность: {Math.round((smartDraft.confidence ?? 0) * 100)}
                      %
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Название
                      </p>
                      <Input
                        value={smartDraft.title}
                        onChange={(event) =>
                          setSmartDraft((prev) =>
                            prev ? { ...prev, title: event.target.value } : prev
                          )
                        }
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Дата и время
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={toLocalDateInput(smartDraft.due_at)}
                          onChange={(event) =>
                            handleDraftDateChange(event.target.value)
                          }
                          className="h-10 rounded-lg"
                        />
                        <Input
                          type="time"
                          value={toLocalTimeInput(smartDraft.due_at)}
                          onChange={(event) =>
                            handleDraftTimeChange(event.target.value)
                          }
                          className="h-10 rounded-lg"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Сейчас: {formatDueAt(smartDraft.due_at)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Заметка
                    </p>
                    <Input
                      value={smartDraft.notes ?? ""}
                      onChange={(event) =>
                        setSmartDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                notes: event.target.value.trim()
                                  ? event.target.value
                                  : null,
                              }
                            : prev
                        )
                      }
                      className="h-10 rounded-lg"
                      placeholder="Опционально"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {smartDraft.recurrence_text ? (
                      <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-1 text-sky-700 dark:text-sky-300">
                        Повтор: {smartDraft.recurrence_text}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-muted-foreground">
                        Без повтора
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-muted-foreground">
                      Таймзона: {smartDraft.timezone ?? "UTC"}
                    </span>
                  </div>
                  {smartDraft.assumptions.length > 0 && (
                    <div className="rounded-lg border border-border/50 bg-background/60 p-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Предположения AI:
                      </p>
                      <ul className="space-y-1 text-xs">
                        {smartDraft.assumptions.map((assumption) => (
                          <li key={assumption}>- {assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={handleCreateFromDraft}
                      disabled={
                        createTaskMutation.isPending || !smartDraft.title.trim()
                      }
                      className="rounded-xl"
                    >
                      {createTaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Создать из черновика
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setSmartDraft(null)}
                    >
                      Очистить черновик
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showManualSection && (
            <div className="rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4 space-y-4">
              <p className="text-sm font-medium">Ручное добавление</p>
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
                    onChange={(event) =>
                      setReminderEnabled(event.target.checked)
                    }
                    disabled={!dueDate}
                  />
                  Напомнить push
                </label>
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
          )}
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
          {import.meta.env.DEV && (
            <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  DEV: диагностика push
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleRunDiagnostics()}
                  disabled={diagnosticsLoading}
                >
                  {diagnosticsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Проверить
                </Button>
              </div>
              {diagnosticsText ? (
                <pre className="max-h-72 overflow-auto rounded-lg border border-border/50 bg-card p-2 text-[11px] leading-5 text-foreground/90">
                  {diagnosticsText}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Нажмите «Проверить», чтобы получить технический отчёт по push.
                </p>
              )}
            </div>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.1} direction="up" distance={12}>
        <div className="space-y-3">
          <div className="flex rounded-xl border border-border/60 bg-background/60 p-1 w-fit">
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

      <ConfirmModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onConfirm={() => navigate("/dashboard/settings")}
        title="Нужен Gemini API Key"
        description="Чтобы использовать AI-добавление и голосовой ввод, добавьте Gemini API Key в настройках профиля."
        confirmText="Открыть настройки"
        cancelText="Не сейчас"
        variant="warning"
      />
    </div>
  );
}
