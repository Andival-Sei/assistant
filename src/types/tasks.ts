export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
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
  reminder_enabled?: boolean;
};

export type TaskUpdateInput = Partial<
  Pick<
    Task,
    | "title"
    | "notes"
    | "due_at"
    | "reminder_enabled"
    | "is_completed"
    | "completed_at"
    | "reminder_sent_at"
  >
>;

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
