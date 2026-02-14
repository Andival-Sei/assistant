-- Add google_fit provider support to health constraints

alter table public.health_integrations
  drop constraint if exists health_integrations_provider_check;

alter table public.health_integrations
  add constraint health_integrations_provider_check
  check (
    provider = any (
      array[
        'google_fit'::text,
        'apple_health'::text,
        'health_connect'::text,
        'fitbit'::text,
        'garmin'::text,
        'oura'::text,
        'withings'::text,
        'polar'::text,
        'whoop'::text
      ]
    )
  );

alter table public.health_oauth_states
  drop constraint if exists health_oauth_states_provider_check;

alter table public.health_oauth_states
  add constraint health_oauth_states_provider_check
  check (
    provider = any (
      array[
        'google_fit'::text,
        'fitbit'::text,
        'garmin'::text,
        'oura'::text,
        'withings'::text,
        'polar'::text,
        'whoop'::text
      ]
    )
  );

alter table public.health_integration_tokens
  drop constraint if exists health_integration_tokens_provider_check;

alter table public.health_integration_tokens
  add constraint health_integration_tokens_provider_check
  check (
    provider = any (
      array[
        'google_fit'::text,
        'fitbit'::text,
        'garmin'::text,
        'oura'::text,
        'withings'::text,
        'polar'::text,
        'whoop'::text
      ]
    )
  );
