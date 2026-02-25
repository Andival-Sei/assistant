import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "npm:web-push@3.6.7";

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_at: string;
  reminder_enabled: boolean;
  reminder_sent_at: string | null;
  is_completed: boolean;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SettingRow = {
  value: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toSubscription(row: SubscriptionRow) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
    const vapidSubject =
      Deno.env.get("WEB_PUSH_VAPID_SUBJECT") || "mailto:support@example.com";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase env is not configured");
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          sent: 0,
          tasks: 0,
          skipped: true,
          reason: "VAPID keys are not configured",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const providedCronSecret = req.headers.get("x-cron-secret");
    const { data: secretRow, error: secretError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "tasks_push_cron_secret")
      .maybeSingle();

    if (secretError) {
      throw secretError;
    }

    const expectedCronSecret = (secretRow as SettingRow | null)?.value ?? null;

    if (!expectedCronSecret) {
      return new Response(
        JSON.stringify({ error: "Cron secret is not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (providedCronSecret !== expectedCronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    const { data: dueTasks, error: tasksError } = await supabase
      .from("tasks")
      .select(
        "id,user_id,title,notes,due_at,reminder_enabled,reminder_sent_at,is_completed"
      )
      .eq("reminder_enabled", true)
      .eq("is_completed", false)
      .is("reminder_sent_at", null)
      .lte("due_at", nowIso)
      .limit(100);

    if (tasksError) {
      throw tasksError;
    }

    const tasks = (dueTasks ?? []) as TaskRow[];

    if (tasks.length === 0) {
      return new Response(JSON.stringify({ sent: 0, tasks: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = [...new Set(tasks.map((task) => task.user_id))];

    const { data: subscriptions, error: subsError } = await supabase
      .from("task_push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", userIds);

    if (subsError) {
      throw subsError;
    }

    const subsByUser = new Map<string, SubscriptionRow[]>();

    for (const sub of (subscriptions ?? []) as SubscriptionRow[]) {
      const bucket = subsByUser.get(sub.user_id) ?? [];
      bucket.push(sub);
      subsByUser.set(sub.user_id, bucket);
    }

    let sentCount = 0;

    for (const task of tasks) {
      const userSubs = subsByUser.get(task.user_id) ?? [];
      let delivered = false;

      if (userSubs.length === 0) {
        await supabase.from("task_push_deliveries").insert({
          task_id: task.id,
          user_id: task.user_id,
          status: "no_subscriptions",
          error_text: "No push subscriptions for user",
        });
      }

      for (const sub of userSubs) {
        try {
          const payload = JSON.stringify({
            title: "Напоминание по задаче",
            body: task.title,
            tag: `task-${task.id}`,
            url: "/dashboard/tasks",
          });

          await webpush.sendNotification(toSubscription(sub), payload);

          sentCount += 1;
          delivered = true;

          await supabase.from("task_push_deliveries").insert({
            task_id: task.id,
            subscription_id: sub.id,
            user_id: task.user_id,
            status: "sent",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          await supabase.from("task_push_deliveries").insert({
            task_id: task.id,
            subscription_id: sub.id,
            user_id: task.user_id,
            status: "failed",
            error_text: message,
          });

          if (message.includes("410") || message.includes("404")) {
            await supabase
              .from("task_push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      }

      if (delivered || userSubs.length === 0) {
        await supabase
          .from("tasks")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", task.id);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, tasks: tasks.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
