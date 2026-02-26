import { supabaseClient } from "@/lib/db/supabase-client";
import type {
  PushSubscriptionRow,
  Task,
  TaskCreateInput,
  TaskIntentParseInput,
  TaskIntentParseResult,
  TaskUpdateInput,
} from "@/types/tasks";

type PushKeys = {
  p256dh: string;
  auth: string;
};

export const tasksService = {
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabaseClient
      .from("tasks")
      .select("*")
      .order("is_completed", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async createTask(input: TaskCreateInput): Promise<Task> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user?.id) {
      throw new Error("Пользователь не авторизован");
    }

    const payload = {
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      due_at: input.due_at || null,
      timezone: input.timezone || null,
      recurrence_rule: input.recurrence_rule || null,
      recurrence_text: input.recurrence_text || null,
      source_text: input.source_text?.trim() || null,
      parse_confidence:
        typeof input.parse_confidence === "number"
          ? input.parse_confidence
          : null,
      parse_model: input.parse_model || null,
      parse_assumptions: input.parse_assumptions ?? [],
      reminder_enabled: Boolean(input.reminder_enabled && input.due_at),
      user_id: user.id,
    };

    const { data, error } = await supabaseClient
      .from("tasks")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateTask(id: string, updates: TaskUpdateInput): Promise<Task> {
    const normalized: TaskUpdateInput = {
      ...updates,
    };

    if (typeof normalized.title === "string") {
      normalized.title = normalized.title.trim();
    }

    if (typeof normalized.notes === "string") {
      normalized.notes = normalized.notes.trim() || null;
    }

    if (!normalized.due_at) {
      normalized.reminder_enabled = false;
      normalized.reminder_sent_at = null;
      normalized.recurrence_rule = null;
      normalized.recurrence_text = null;
    }

    if (normalized.is_completed === true) {
      normalized.completed_at = new Date().toISOString();
    }

    if (normalized.is_completed === false) {
      normalized.completed_at = null;
      normalized.reminder_sent_at = null;
    }

    const { data, error } = await supabaseClient
      .from("tasks")
      .update(normalized)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async parseTaskIntent(
    input: TaskIntentParseInput
  ): Promise<TaskIntentParseResult> {
    const { data, error } = await supabaseClient.functions.invoke(
      "tasks-parse-intent",
      {
        body: {
          text: input.text,
          source: input.source ?? "text",
          timezone:
            input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }
    );

    if (error) {
      let errorMessage = error.message;
      if (error.context instanceof Response) {
        try {
          const text = await error.context.text();
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = text || errorMessage;
          }
        } catch {
          // ignore parsing error and fallback to original error message
        }
      }
      throw new Error(errorMessage);
    }

    return data as TaskIntentParseResult;
  },

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabaseClient.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },

  async upsertPushSubscription(subscription: PushSubscription): Promise<void> {
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user?.id) {
      throw new Error("Пользователь не авторизован");
    }

    const keys = subscription.toJSON().keys as PushKeys | undefined;
    if (!keys?.auth || !keys.p256dh) {
      throw new Error("Некорректный push subscription");
    }

    const { error } = await supabaseClient
      .from("task_push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          auth: keys.auth,
          p256dh: keys.p256dh,
          expiration_time: subscription.expirationTime,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );

    if (error) throw error;
  },

  async removePushSubscription(endpoint: string): Promise<void> {
    const { error } = await supabaseClient
      .from("task_push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) throw error;
  },

  async hasPushSubscription(endpoint: string): Promise<boolean> {
    const { count, error } = await supabaseClient
      .from("task_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("endpoint", endpoint);

    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async listPushSubscriptions(): Promise<PushSubscriptionRow[]> {
    const { data, error } = await supabaseClient
      .from("task_push_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};
