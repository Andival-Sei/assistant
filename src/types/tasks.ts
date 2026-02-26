export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  timezone: string | null;
  recurrence_rule: string | null;
  recurrence_text: string | null;
  source_text: string | null;
  parse_confidence: number | null;
  parse_model: string | null;
  parse_assumptions: string[] | null;
  reminder_enabled: boolean;
  reminder_sent_at: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskCreateInput = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  timezone?: string | null;
  recurrence_rule?: string | null;
  recurrence_text?: string | null;
  source_text?: string | null;
  parse_confidence?: number | null;
  parse_model?: string | null;
  parse_assumptions?: string[] | null;
  reminder_enabled?: boolean;
};

export type TaskUpdateInput = Partial<
  Pick<
    Task,
    | "title"
    | "notes"
    | "due_at"
    | "timezone"
    | "recurrence_rule"
    | "recurrence_text"
    | "source_text"
    | "parse_confidence"
    | "parse_model"
    | "parse_assumptions"
    | "reminder_enabled"
    | "is_completed"
    | "completed_at"
    | "reminder_sent_at"
  >
>;

export type TaskIntentParseResult = {
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

export type TaskIntentParseInput = {
  text: string;
  source?: "text" | "voice";
  timezone?: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};
