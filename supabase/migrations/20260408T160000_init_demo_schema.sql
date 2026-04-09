create extension if not exists pgcrypto;

create type public.channel_type as enum (
  'web',
  'sms',
  'qr',
  'link',
  'agent_dashboard'
);

create type public.asset_type as enum (
  'candidate_campaign',
  'pac_campaign'
);

create type public.content_block_type as enum (
  'hero',
  'issue_message',
  'fundraising_ask',
  'volunteer_prompt',
  'event_prompt',
  'privacy_message',
  'faq_answer',
  'fallback'
);

create type public.release_state as enum (
  'masked',
  'pending_release',
  'released'
);

create type public.verified_intent_type as enum (
  'donation_started',
  'donation_confirmed',
  'event_rsvp',
  'volunteer_signup',
  'direct_contact_opt_in'
);

create table if not exists public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  asset_type public.asset_type not null,
  display_name text not null,
  committee_name text not null,
  office_or_mission text not null,
  district_or_scope text not null,
  default_issue text not null,
  status text not null default 'active',
  canonical_facts jsonb not null default '{}'::jsonb,
  branding jsonb not null default '{}'::jsonb,
  compliance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.approved_content_blocks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.campaign_assets(id) on delete cascade,
  block_key text not null,
  block_type public.content_block_type not null,
  title text not null,
  body text not null,
  cta_label text,
  cta_action text,
  priority integer not null default 100,
  audience_filters jsonb not null default '{}'::jsonb,
  context_rules jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (asset_id, block_key)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  asset_id uuid not null references public.campaign_assets(id) on delete cascade,
  current_channel public.channel_type not null,
  entry_channel public.channel_type not null,
  release_state public.release_state not null default 'masked',
  supporter_alias text not null,
  supporter_contact_encrypted text,
  issue_focus text,
  geography text,
  engagement_tier text not null default 'new',
  context_profile jsonb not null default '{}'::jsonb,
  provenance_manifest jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trigger_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete set null,
  asset_id uuid not null references public.campaign_assets(id) on delete cascade,
  trigger_type public.channel_type not null,
  trigger_source text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  confidence_score numeric(5,4) not null default 1.0,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.relay_identities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  relay_identifier text not null unique,
  direct_identifier_encrypted text,
  release_state public.release_state not null default 'masked',
  release_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz
);

create table if not exists public.interaction_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  channel public.channel_type not null,
  actor text not null,
  interaction_type text not null,
  message_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.verified_intent_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  intent_type public.verified_intent_type not null,
  status text not null default 'recorded',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_campaign_assets_slug
  on public.campaign_assets (slug);

create index if not exists idx_sessions_asset_id
  on public.sessions (asset_id);

create index if not exists idx_trigger_events_session_id
  on public.trigger_events (session_id);

create index if not exists idx_interaction_logs_session_id
  on public.interaction_logs (session_id, created_at desc);

create index if not exists idx_verified_intent_events_session_id
  on public.verified_intent_events (session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_sessions_updated_at on public.sessions;

create trigger set_sessions_updated_at
before update on public.sessions
for each row
execute procedure public.set_updated_at();
