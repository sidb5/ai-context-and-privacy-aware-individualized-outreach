insert into public.campaign_assets (
  slug,
  asset_type,
  display_name,
  committee_name,
  office_or_mission,
  district_or_scope,
  default_issue,
  canonical_facts,
  branding,
  compliance
)
values
  (
    'maya-torres-2026',
    'candidate_campaign',
    'Maya Torres for Congress',
    'Maya Torres for Congress',
    'Candidate for U.S. House',
    'CA-18',
    'education',
    '{
      "candidate_name": "Maya Torres",
      "party": "Independent Democrat",
      "district": "CA-18",
      "headline": "Invest in classrooms, lower family costs, defend local democracy.",
      "fundraising_deadline": "2026-06-30",
      "donation_targets": {
        "sms_small_donor": 25,
        "event_guest": 100,
        "major_supporter": 500
      }
    }'::jsonb,
    '{
      "primary": "#0f4c81",
      "secondary": "#f2a33a",
      "accent": "#f7f0e1"
    }'::jsonb,
    '{
      "disclaimer": "Paid for by Maya Torres for Congress.",
      "contact_release_policy": "release only after explicit opt-in or verified intent"
    }'::jsonb
  ),
  (
    'future-cities-action',
    'pac_campaign',
    'Future Cities Action Fund',
    'Future Cities Action Fund PAC',
    'Independent expenditure committee',
    'National urban advocacy',
    'housing',
    '{
      "committee_name": "Future Cities Action Fund",
      "mission": "Back local leaders who will expand housing and transit.",
      "headline": "Fund the organizers and candidates who can win fast-growing districts.",
      "fundraising_deadline": "2026-05-15",
      "donation_targets": {
        "digital_supporter": 15,
        "host_committee": 250,
        "strategic_donor": 1000
      }
    }'::jsonb,
    '{
      "primary": "#1f3b2c",
      "secondary": "#d7e86e",
      "accent": "#f4f0dd"
    }'::jsonb,
    '{
      "disclaimer": "Paid for by Future Cities Action Fund PAC and not authorized by any candidate or candidate''s committee.",
      "contact_release_policy": "release only after direct-contact opt-in"
    }'::jsonb
  )
on conflict (slug) do update
set
  display_name = excluded.display_name,
  committee_name = excluded.committee_name,
  office_or_mission = excluded.office_or_mission,
  district_or_scope = excluded.district_or_scope,
  default_issue = excluded.default_issue,
  canonical_facts = excluded.canonical_facts,
  branding = excluded.branding,
  compliance = excluded.compliance;

with asset_lookup as (
  select id, slug from public.campaign_assets
)
insert into public.approved_content_blocks (
  asset_id,
  block_key,
  block_type,
  title,
  body,
  cta_label,
  cta_action,
  priority,
  audience_filters,
  context_rules,
  provenance
)
values
  (
    (select id from asset_lookup where slug = 'maya-torres-2026'),
    'hero-general',
    'hero',
    'Help Maya Torres protect CA-18 public schools',
    'Maya Torres is fighting to keep class sizes down, retain great teachers, and lower everyday costs for working families across CA-18.',
    'See Maya''s plan',
    'open_issue_panel',
    10,
    '{}'::jsonb,
    '{"trigger_sources":["mailer","rally","social"],"engagement_tiers":["new","returning"]}'::jsonb,
    '{"source":"campaign canonical messaging deck","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'maya-torres-2026'),
    'issue-education-in-district',
    'issue_message',
    'What this means for families in CA-18',
    'This version focuses on neighborhood schools, local teacher retention, and district volunteer opportunities because the supporter appears to be inside CA-18.',
    'Volunteer in CA-18',
    'start_volunteer_flow',
    20,
    '{"geographies":["CA-18"]}'::jsonb,
    '{"issues":["education"],"in_district":true}'::jsonb,
    '{"source":"district issue brief","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'maya-torres-2026'),
    'deadline-small-dollar',
    'fundraising_ask',
    'Tonight''s deadline is the difference between scaling up and falling short',
    'A small-dollar contribution tonight helps the campaign fund voter contact, field organizers, and final-week outreach before the reporting deadline.',
    'Chip in $25',
    'donate_25',
    30,
    '{"engagement_tiers":["new"]}'::jsonb,
    '{"timing_mode":"deadline_window"}'::jsonb,
    '{"source":"finance-approved ask ladder","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'maya-torres-2026'),
    'privacy-intro',
    'privacy_message',
    'Your contact stays private unless you choose to share it',
    'Campaign staff can reply through a relay and do not see your direct number unless you explicitly opt in or complete a higher-intent action.',
    'Continue privately',
    'acknowledge_privacy',
    40,
    '{}'::jsonb,
    '{"always_include":true}'::jsonb,
    '{"source":"privacy policy snippet","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'future-cities-action'),
    'hero-pac',
    'hero',
    'Help pro-housing leaders win in fast-growing districts',
    'Future Cities Action Fund is backing organizers and candidates who can expand housing, modernize transit, and win high-growth communities.',
    'See why this race matters',
    'open_issue_panel',
    10,
    '{}'::jsonb,
    '{"trigger_sources":["event","qr","sms"]}'::jsonb,
    '{"source":"PAC messaging deck","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'future-cities-action'),
    'housing-out-of-district',
    'issue_message',
    'Why out-of-district supporters matter here',
    'This version shifts from local canvassing asks to movement-building and donor support because the supporter appears to be outside the district.',
    'Support housing champions',
    'open_donation_panel',
    20,
    '{"geographies":["OUT_OF_DISTRICT"]}'::jsonb,
    '{"issues":["housing"],"in_district":false}'::jsonb,
    '{"source":"PAC donor segmentation memo","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'future-cities-action'),
    'event-rsvp-release',
    'event_prompt',
    'RSVP for tonight''s finance briefing',
    'Supporters can RSVP privately, keep chatting through the relay, or choose to release contact details for direct organizer follow-up.',
    'RSVP privately',
    'start_rsvp_flow',
    30,
    '{}'::jsonb,
    '{"timing_mode":"event_push"}'::jsonb,
    '{"source":"event workflow memo","approved_by":"demo seed"}'::jsonb
  ),
  (
    (select id from asset_lookup where slug = 'future-cities-action'),
    'fallback-general',
    'fallback',
    'Stay informed and support the mission',
    'Here is the general campaign overview, safe donation path, and contact flow used when the system does not have enough context to personalize the outreach.',
    'Show overview',
    'show_default_overview',
    999,
    '{}'::jsonb,
    '{"fallback":true}'::jsonb,
    '{"source":"fallback message library","approved_by":"demo seed"}'::jsonb
  )
on conflict (asset_id, block_key) do update
set
  block_type = excluded.block_type,
  title = excluded.title,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_action = excluded.cta_action,
  priority = excluded.priority,
  audience_filters = excluded.audience_filters,
  context_rules = excluded.context_rules,
  provenance = excluded.provenance;
