import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Типы для переменных окружения Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// В dev-режиме сразу падаем, если переменные не заданы
if (!supabaseUrl || !supabaseAnonKey) {
  // Комментарий на русском, чтобы было понятно, почему тут ошибка
  throw new Error(
    "[supabase-client] VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY не заданы"
  );
}

// Единый инстанс Supabase клиента для всего приложения
export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
