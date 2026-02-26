import { supabaseClient } from "@/lib/db/supabase-client";
import { getSafeRedirectPath } from "@/lib/utils/auth";

export type GoogleAuthIntent = "signin" | "link";

const AUTH_CALLBACK_PATH = "/auth/callback";

export function buildGoogleCallbackUrl(
  intent: GoogleAuthIntent,
  next = "/dashboard"
) {
  const callbackUrl = new URL(AUTH_CALLBACK_PATH, window.location.origin);
  callbackUrl.searchParams.set("intent", intent);
  callbackUrl.searchParams.set("next", getSafeRedirectPath(next));
  callbackUrl.searchParams.set("provider", "google");
  return callbackUrl.toString();
}

export async function startGoogleOAuth(
  intent: GoogleAuthIntent,
  next = "/dashboard"
) {
  const redirectTo = buildGoogleCallbackUrl(intent, next);
  const options = {
    redirectTo,
    queryParams: { prompt: "select_account" },
    skipBrowserRedirect: true,
  };

  const result =
    intent === "link"
      ? await supabaseClient.auth.linkIdentity({
          provider: "google",
          options,
        })
      : await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options,
        });

  if (result.error) {
    throw result.error;
  }

  const redirectUrl = result.data?.url;
  if (!redirectUrl) {
    throw new Error("Не удалось получить URL для OAuth входа через Google");
  }

  window.location.assign(redirectUrl);
}

export function hasGoogleIdentity(
  identities: { provider?: string }[] | undefined
) {
  return (identities ?? []).some((identity) => identity.provider === "google");
}
