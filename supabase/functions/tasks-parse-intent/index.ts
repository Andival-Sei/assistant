import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ParseRequest = {
  text?: string;
  source?: "text" | "voice";
  timezone?: string;
};

type ParseResult = {
  title: string;
  notes: string | null;
  due_at: string | null;
  timezone: string | null;
  reminder_enabled: boolean;
  recurrence_rule: string | null;
  recurrence_text: string | null;
  confidence: number;
  assumptions: string[];
  source_text: string;
  parser_model: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function normalizeIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function weekdayToByDay(text: string): string | null {
  const map: Record<string, string> = {
    понедельник: "MO",
    вторник: "TU",
    среда: "WE",
    четверг: "TH",
    пятница: "FR",
    суббота: "SA",
    воскресенье: "SU",
  };

  const lower = text.toLowerCase();
  for (const [ru, byDay] of Object.entries(map)) {
    if (lower.includes(ru)) return byDay;
  }
  return null;
}

function buildLocalDateAt(timezone: string, offsetDays: number, hour: number) {
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offsetDays,
      hour,
      0,
      0
    )
  );
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(target);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const local = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:00`;
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function secondTuesdayNextMonthMidday(timezone: string): string | null {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstOfNextMonth = new Date(Date.UTC(year, month + 1, 1, 12, 0, 0));
  let firstTuesday = 1;
  for (let d = 1; d <= 7; d += 1) {
    const date = new Date(
      Date.UTC(
        firstOfNextMonth.getUTCFullYear(),
        firstOfNextMonth.getUTCMonth(),
        d,
        12,
        0,
        0
      )
    );
    if (date.getUTCDay() === 2) {
      firstTuesday = d;
      break;
    }
  }
  const secondTuesday = firstTuesday + 7;
  const candidate = new Date(
    Date.UTC(
      firstOfNextMonth.getUTCFullYear(),
      firstOfNextMonth.getUTCMonth(),
      secondTuesday,
      12,
      0,
      0
    )
  );
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [datePart] = fmt.format(candidate).split(",");
  const normalizedDate = datePart.trim();
  const parsed = new Date(`${normalizedDate}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function fallbackParse(text: string, timezone: string): ParseResult {
  const lower = text.toLowerCase();
  let dueAt: string | null = null;
  let recurrenceRule: string | null = null;
  let recurrenceText: string | null = null;
  const assumptions: string[] = [];

  if (lower.includes("завтра")) {
    const atMorning = buildLocalDateAt(timezone, 1, 9);
    if (atMorning) {
      dueAt = atMorning;
      assumptions.push(
        "Время не указано явно: выбрано 09:00 локального времени."
      );
    }
  }

  if (lower.includes("сегодня") && lower.includes("веч")) {
    const atEvening = buildLocalDateAt(timezone, 0, 19);
    if (atEvening) {
      dueAt = atEvening;
      assumptions.push("Интерпретировано как сегодня в 19:00.");
    }
  }

  if (
    lower.includes("в следующем месяце") &&
    lower.includes("втор") &&
    (lower.includes("второй") || lower.includes("2"))
  ) {
    dueAt = secondTuesdayNextMonthMidday(timezone);
    recurrenceRule = "FREQ=MONTHLY;INTERVAL=1;BYDAY=TU;BYSETPOS=2";
    recurrenceText = "Каждый месяц, второй вторник";
    assumptions.push(
      "Интерпретировано как второй вторник следующего месяца в 12:00."
    );
  }

  if (lower.includes("каждый день") || lower.includes("ежедневно")) {
    recurrenceRule = "FREQ=DAILY;INTERVAL=1";
    recurrenceText = "Каждый день";
  } else if (lower.includes("каждую неделю") || lower.includes("еженед")) {
    recurrenceRule = "FREQ=WEEKLY;INTERVAL=1";
    recurrenceText = "Каждую неделю";
  } else if (lower.includes("каждый месяц") || lower.includes("ежемесяч")) {
    recurrenceRule = "FREQ=MONTHLY;INTERVAL=1";
    recurrenceText = "Каждый месяц";
  } else if (lower.includes("каждый")) {
    const byDay = weekdayToByDay(lower);
    if (byDay) {
      recurrenceRule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${byDay}`;
      recurrenceText = "Еженедельно в выбранный день";
    }
  }

  return {
    title: text.trim().slice(0, 180) || "Новая задача",
    notes: null,
    due_at: dueAt,
    timezone,
    reminder_enabled: Boolean(dueAt),
    recurrence_rule: recurrenceRule,
    recurrence_text: recurrenceText,
    confidence: dueAt || recurrenceRule ? 0.74 : 0.45,
    assumptions,
    source_text: text.trim(),
    parser_model: "fallback-v1",
  };
}

function normalizeResult(
  text: string,
  timezone: string,
  raw: Record<string, unknown>,
  parserModel: string | null
): ParseResult {
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim().slice(0, 180)
      : text.trim().slice(0, 180) || "Новая задача";

  const notes =
    typeof raw.notes === "string" && raw.notes.trim()
      ? raw.notes.trim().slice(0, 400)
      : null;

  const dueAt = normalizeIso(raw.due_at);
  const recurrenceRule =
    typeof raw.recurrence_rule === "string" && raw.recurrence_rule.trim()
      ? raw.recurrence_rule.trim().slice(0, 500)
      : null;
  const recurrenceText =
    typeof raw.recurrence_text === "string" && raw.recurrence_text.trim()
      ? raw.recurrence_text.trim().slice(0, 120)
      : null;

  const assumptions = Array.isArray(raw.assumptions)
    ? raw.assumptions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    title,
    notes,
    due_at: dueAt,
    timezone:
      typeof raw.timezone === "string" && raw.timezone.trim()
        ? raw.timezone.trim()
        : timezone,
    reminder_enabled:
      typeof raw.reminder_enabled === "boolean"
        ? raw.reminder_enabled && Boolean(dueAt)
        : Boolean(dueAt),
    recurrence_rule: recurrenceRule,
    recurrence_text: recurrenceText,
    confidence: clampConfidence(raw.confidence),
    assumptions,
    source_text: text.trim(),
    parser_model: parserModel,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse(
        { error: "Supabase env vars are not configured" },
        500
      );
    }

    const body = (await req.json()) as ParseRequest;
    const text = (body.text ?? "").trim();
    if (!text) {
      return jsonResponse({ error: "Текст задачи пустой" }, 400);
    }

    const timezone = body.timezone?.trim() || "UTC";
    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : (authHeader?.trim() ?? "");

    if (!token) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("gemini_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    const geminiApiKey = settings?.gemini_api_key as string | undefined;
    if (!geminiApiKey) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const modelsResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: {
          "x-goog-api-key": geminiApiKey,
        },
      }
    );

    if (!modelsResponse.ok) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const modelsPayload = (await modelsResponse.json()) as {
      models?: Array<{
        name: string;
        supportedActions?: string[];
        supportedGenerationMethods?: string[];
      }>;
    };

    const supportsGenerateContent = (m: {
      supportedActions?: string[];
      supportedGenerationMethods?: string[];
    }) => {
      if ((m.supportedActions ?? []).includes("generateContent")) return true;
      return (m.supportedGenerationMethods ?? []).includes("generateContent");
    };

    const generateModels = (modelsPayload.models ?? []).filter(
      supportsGenerateContent
    );

    if (generateModels.length === 0) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const preferred = generateModels.find((m) =>
      m.name.toLowerCase().includes("flash")
    );
    const chosenModel = preferred?.name ?? generateModels[0].name;

    const prompt = `You are a task intent parser.
Extract a structured task object from user text.
Current timestamp (UTC): ${new Date().toISOString()}
User timezone: ${timezone}
Input source: ${body.source ?? "text"}

Rules:
- Return JSON only.
- Use Russian language for title, notes, recurrence_text and assumptions.
- title: short actionable title.
- notes: optional extra details.
- due_at: ISO datetime in UTC or null.
- timezone: IANA timezone from input or fallback to provided timezone.
- reminder_enabled: true only if due_at exists.
- recurrence_rule: RFC5545 RRULE string without DTSTART or null.
- recurrence_text: short human-readable summary in Russian or null.
- confidence: number 0..1.
- assumptions: list of assumptions made.

User text:
"""${text}"""

Output shape:
{
  "title": "string",
  "notes": "string|null",
  "due_at": "ISO string|null",
  "timezone": "string|null",
  "reminder_enabled": true,
  "recurrence_rule": "string|null",
  "recurrence_text": "string|null",
  "confidence": 0.0,
  "assumptions": ["string"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${chosenModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const payload = await response.json();
    const responseText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof responseText !== "string" || !responseText.trim()) {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const candidateJson = extractJsonObject(responseText) ?? responseText;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(candidateJson);
    } catch {
      return jsonResponse(fallbackParse(text, timezone), 200);
    }

    const normalized = normalizeResult(text, timezone, parsed, chosenModel);
    return jsonResponse(normalized, 200);
  } catch (error) {
    console.error("tasks-parse-intent error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Неизвестная ошибка парсинга",
      },
      500
    );
  }
});
