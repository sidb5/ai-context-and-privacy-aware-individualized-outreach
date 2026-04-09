import Link from "next/link";
import { redirect } from "next/navigation";

import { submitSmsMessage } from "@/app/actions/messaging";
import { submitVerifiedIntent } from "@/app/actions/privacy";
import { WorkflowDemo } from "@/components/workflow-demo";
import { assembleBrochure } from "@/lib/demo/brochure";
import { getSmsThread } from "@/lib/demo/messaging";
import { normalizeSmsTransportMode } from "@/lib/demo/sms-mode";
import { getPrivacyState } from "@/lib/demo/privacy";
import { answerSessionQuestion } from "@/lib/demo/qa";
import { buildSessionUrl } from "@/lib/demo/url";
import { getSessionHistory, initializeDemoSession } from "@/lib/demo/session";
import { hasTwilioEnv } from "@/lib/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type TriggerChannel = "web" | "sms" | "qr" | "link" | "agent_dashboard";

function one(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

const DEMO_LINKS = [
  ["Candidate mailer", "/?asset=maya-torres-2026&source=mailer&channel=qr&issue=education&geo=CA-18", "bg-sky-600 text-white", "ring-sky-300", "bg-sky-50"],
  ["PAC event", "/?asset=future-cities-action&source=event&channel=link&issue=housing&geo=OUT_OF_DISTRICT&timing=event_push", "bg-emerald-600 text-white", "ring-emerald-300", "bg-emerald-50"],
  ["Deadline SMS", "/?asset=maya-torres-2026&source=sms&channel=sms&issue=education&geo=CA-18&timing=deadline_window&tier=new", "bg-rose-600 text-white", "ring-rose-300", "bg-rose-50"],
  ["Fallback", "/?asset=future-cities-action&source=unknown&channel=web&issue=transit&geo=UNKNOWN", "bg-amber-500 text-stone-950", "ring-amber-300", "bg-amber-50"],
] as const;

function getCurrentPath(
  asset: string,
  source: string,
  channel: string,
  timing: string,
) {
  if (asset === "maya-torres-2026" && source === "mailer" && channel === "qr") {
    return DEMO_LINKS[0];
  }
  if (asset === "future-cities-action" && source === "event" && timing === "event_push") {
    return DEMO_LINKS[1];
  }
  if (asset === "maya-torres-2026" && source === "sms" && channel === "sms" && timing === "deadline_window") {
    return DEMO_LINKS[2];
  }
  return DEMO_LINKS[3];
}

function Card({
  title,
  children,
  dark = false,
}: {
  title: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      className={
        dark
          ? "rounded-[2rem] bg-stone-950 p-5 text-stone-100 shadow-[0_24px_80px_rgba(34,23,12,0.28)] sm:p-8"
          : "rounded-[2rem] border border-stone-900/10 bg-white/85 p-5 shadow-[0_24px_80px_rgba(74,52,29,0.14)] backdrop-blur sm:p-8"
      }
    >
      <p
        className={`text-sm uppercase tracking-[0.3em] ${
          dark ? "text-amber-300" : "text-amber-700"
        }`}
      >
        {title}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const asset = one(params.asset, "maya-torres-2026");
  const source = one(params.source, "mailer");
  const channel = one(params.channel, "qr") as TriggerChannel;
  const st = one(params.st, "");
  const issue = one(params.issue, "");
  const geo = one(params.geo, "");
  const timing = one(params.timing, "");
  const tier = one(params.tier, "");
  const q = one(params.q, "");
  const view = one(params.view, "simple");
  const smsMode = normalizeSmsTransportMode(one(params.smsMode, "simulated"));
  const smsNotice = one(params.smsNotice, "");
  const twilioConfigured = hasTwilioEnv();

  if (!st) {
    const created = await initializeDemoSession({
      assetSlug: asset,
      triggerSource: source,
      triggerChannel: channel,
      issueFocus: issue || undefined,
      geography: geo || undefined,
      engagementTier: tier || undefined,
      timingMode: timing || undefined,
    });
    redirect(
      buildSessionUrl({
        asset,
        source,
        channel,
        st: created.session.session_token,
        issue: issue || undefined,
        geo: geo || undefined,
        timing: timing || undefined,
        tier: tier || undefined,
        smsMode,
      }),
    );
  }

  const initialized = await initializeDemoSession({
    assetSlug: asset,
    triggerSource: source,
    triggerChannel: channel,
    sessionToken: st,
    issueFocus: issue || undefined,
    geography: geo || undefined,
    engagementTier: tier || undefined,
    timingMode: timing || undefined,
  });
  const brochure = await assembleBrochure(initialized.asset, initialized.session);
  const privacy = await getPrivacyState(initialized.session.session_token);
  const sms = await getSmsThread(initialized.session.session_token);
  const history = await getSessionHistory(initialized.session.id);
  const qa = q ? await answerSessionQuestion(initialized.session.session_token, q) : null;
  const currentPath = getCurrentPath(asset, source, channel, timing);
  const baseUrl = buildSessionUrl({
    asset,
    source,
    channel,
    st: initialized.session.session_token,
    issue: issue || undefined,
    geo: geo || undefined,
    timing: timing || undefined,
    tier: tier || undefined,
    smsMode,
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4cf_0%,#f8ede0_34%,#efe4d1_60%,#dcc7ab_100%)] text-stone-950">
      <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-6 lg:px-12 lg:py-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="max-w-4xl font-serif text-xl leading-tight sm:text-3xl">
              {initialized.asset.display_name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
              {view === "simple"
                ? "Simple view explains the supporter journey in plain English."
                : "Technical view shows the patent mechanics behind the same journey."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`${baseUrl}&view=simple`} className={`rounded-full px-4 py-2 text-sm ${view === "simple" ? "bg-stone-950 text-white" : "border border-stone-900/10 bg-white/80 text-stone-800"}`}>Simple view</Link>
            <Link href={`${baseUrl}&view=technical`} className={`rounded-full px-4 py-2 text-sm ${view === "technical" ? "bg-stone-950 text-white" : "border border-stone-900/10 bg-white/80 text-stone-800"}`}>Technical view</Link>
            <Link href="/agent" className="rounded-full border border-stone-900/10 bg-white/80 px-4 py-2 text-sm text-stone-800">Agent dashboard</Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[1.4rem] border border-stone-900/10 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-amber-700">
              SMS transport
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Simulated mode powers today&apos;s demo. Twilio mode is wired for v2 and will go live once credentials and a number are added.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={buildSessionUrl({ asset, source, channel, st: initialized.session.session_token, issue: issue || undefined, geo: geo || undefined, timing: timing || undefined, tier: tier || undefined, smsMode: "simulated" })} className={`rounded-full px-4 py-2 text-sm ${smsMode === "simulated" ? "bg-stone-950 text-white" : "border border-stone-900/10 bg-white text-stone-800"}`}>
              Simulated SMS
            </Link>
            <Link href={buildSessionUrl({ asset, source, channel, st: initialized.session.session_token, issue: issue || undefined, geo: geo || undefined, timing: timing || undefined, tier: tier || undefined, smsMode: "twilio" })} className={`rounded-full px-4 py-2 text-sm ${smsMode === "twilio" ? "bg-stone-950 text-white" : "border border-stone-900/10 bg-white text-stone-800"}`}>
              Twilio SMS
            </Link>
            <div className={`rounded-full px-4 py-2 text-sm ${twilioConfigured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {twilioConfigured ? "Twilio configured" : "Twilio not configured yet"}
            </div>
          </div>
        </div>

        {smsMode === "twilio" || smsNotice ? (
          <div className="mt-4 rounded-[1.4rem] border border-stone-900/10 bg-white/80 p-4 text-sm text-stone-700">
            <p className="font-semibold text-stone-900">
              {smsMode === "twilio" ? "Twilio mode is selected." : "SMS transport notice"}
            </p>
            <p className="mt-2 leading-6">
              {!twilioConfigured
                ? "The code path for real Twilio SMS is present, but this deployment does not yet have Twilio credentials or a live phone number."
                : "This deployment has Twilio credentials. Real inbound SMS should hit /api/twilio/inbound, and live outbound relay replies can be sent from sessions that began through Twilio."}
            </p>
            {smsNotice ? (
              <p className="mt-2 text-xs text-stone-500">
                Last SMS action status: {smsNotice.replaceAll("_", " ")}.
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "simple" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[260px_1fr] xl:gap-5">
            <aside className="space-y-4">
              <Card title="Demo Paths">
                <div className="space-y-3">
                  {DEMO_LINKS.map(([label, href, buttonClass, ringClass, softClass]) => {
                    const active = currentPath[0] === label;
                    return (
                      <Link
                        key={href}
                        href={`${href}&view=simple`}
                        className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition sm:py-4 ${buttonClass} ${
                          active ? `ring-4 ${ringClass}` : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span>{label}</span>
                        <span
                          className={`mt-3 block rounded-xl px-3 py-2 text-xs font-medium ${
                            softClass
                          } ${buttonClass.includes("text-white") ? "text-stone-900" : "text-stone-800"}`}
                        >
                          {active ? "Current path" : "Switch to this path"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
              <Card title="What To Try Next">
                <ol className="space-y-3 text-sm leading-6 text-stone-700">
                  <li>1. Run the main workflow in the center.</li>
                  <li>2. Use the grounded question section below it.</li>
                  <li>3. Then show privacy release.</li>
                  <li>4. Then continue the same session in text messaging.</li>
                </ol>
              </Card>
            </aside>

            <div className="space-y-5">
              <WorkflowDemo
                campaignName={initialized.asset.display_name}
                pathLabel={currentPath[0]}
                accentClass={currentPath[2]}
                accentSoftClass={currentPath[4]}
                issueFocus={brochure.context.issueFocus}
                geography={brochure.context.geography}
                triggerSource={brochure.context.triggerSource}
                triggerChannel={brochure.context.triggerChannel}
                timingMode={brochure.context.timingMode}
                inDistrict={brochure.context.inDistrict}
                brochureBlocks={brochure.blocks}
                relayAlias={privacy.relay.relay_identifier}
                releaseState={privacy.relay.release_state}
                supporterAlias={privacy.session.supporter_alias}
                smsMessages={sms.map((message) => ({
                  id: message.id,
                  actor: message.actor,
                  message_text: message.message_text,
                }))}
              />

              <Card title="Technical facts behind the current path">
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ["Current path", currentPath[0]],
                    ["Supporter alias", privacy.session.supporter_alias],
                    ["Relay alias", privacy.relay.relay_identifier],
                    ["Audit events", `${history.triggers.length} triggers / ${history.logs.length} logs`],
                  ].map(([label, value]) => (
                    <div key={label} className={`rounded-2xl p-4 text-sm ${currentPath[4]}`}>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{label}</p>
                      <p className="mt-2 font-semibold text-stone-900">{value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="What to try next">
                <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
                  <div className={`rounded-3xl p-4 ${currentPath[4]}`}>
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      1. Ask a grounded question
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      This proves the assistant only answers from approved campaign content.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "How is my phone number protected?",
                        "What is the current fundraising ask?",
                        "What is the housing message here?",
                        "Tell me about foreign policy.",
                      ].map((sample) => (
                        <Link key={sample} href={`${baseUrl}&view=simple&q=${encodeURIComponent(sample)}`} className="rounded-full border border-stone-900/10 bg-white px-3 py-2 text-xs text-stone-700">
                          {sample}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-stone-700">
                      {qa ? (
                        <>
                          <p className="text-stone-800">{qa.answer}</p>
                          <p className="mt-2 text-xs text-stone-500">
                            {qa.mode === "grounded" ? `Source: ${qa.sourceBlockKeys.join(", ")}` : "Safe fallback answer"}
                          </p>
                        </>
                      ) : (
                        <p>No question selected yet.</p>
                      )}
                    </div>
                  </div>
                  <div className={`rounded-3xl p-4 ${currentPath[4]}`}>
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      2. Show privacy release
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      This shows when the real contact stays hidden and when it unlocks.
                    </p>
                    <div className="mt-3 grid gap-2">
                      {[
                        ["Donation started", "donation_started"],
                        ["Donation confirmed", "donation_confirmed"],
                        ["Event RSVP", "event_rsvp"],
                        ["Direct contact opt-in", "direct_contact_opt_in"],
                      ].map(([label, intentType]) => (
                        <form key={intentType} action={submitVerifiedIntent}>
                          <input type="hidden" name="sessionToken" value={initialized.session.session_token} />
                          <input type="hidden" name="asset" value={asset} />
                          <input type="hidden" name="source" value={source} />
                          <input type="hidden" name="channel" value={channel} />
                          <input type="hidden" name="issue" value={issue} />
                          <input type="hidden" name="geo" value={geo} />
                          <input type="hidden" name="timing" value={timing} />
                          <input type="hidden" name="tier" value={tier} />
                          <input type="hidden" name="smsMode" value={smsMode} />
                          <input type="hidden" name="intentType" value={intentType} />
                          <button type="submit" className="w-full rounded-2xl border border-stone-900/10 bg-white px-4 py-3 text-left text-sm font-medium text-stone-800">{label}</button>
                        </form>
                      ))}
                    </div>
                  </div>
                  <div className={`rounded-3xl p-4 ${currentPath[4]}`}>
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                      3. Continue in text messaging
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      This shows the same session continuing into SMS without losing context.
                    </p>
                    <div className="mt-3 grid gap-2">
                      <form action={submitSmsMessage}>
                        <input type="hidden" name="sessionToken" value={initialized.session.session_token} />
                        <input type="hidden" name="asset" value={asset} />
                        <input type="hidden" name="source" value={source} />
                        <input type="hidden" name="channel" value={channel} />
                        <input type="hidden" name="issue" value={issue} />
                        <input type="hidden" name="geo" value={geo} />
                        <input type="hidden" name="timing" value={timing} />
                        <input type="hidden" name="tier" value={tier} />
                        <input type="hidden" name="smsMode" value={smsMode} />
                        <input type="hidden" name="actor" value="citizen" />
                        <input type="hidden" name="messageText" value="I want to know if my donation is private." />
                        <button type="submit" className="w-full rounded-2xl border border-stone-900/10 bg-white px-4 py-3 text-sm font-medium text-stone-800">{smsMode === "twilio" ? "Expect real inbound text" : "Send supporter text"}</button>
                      </form>
                      <form action={submitSmsMessage}>
                        <input type="hidden" name="sessionToken" value={initialized.session.session_token} />
                        <input type="hidden" name="asset" value={asset} />
                        <input type="hidden" name="source" value={source} />
                        <input type="hidden" name="channel" value={channel} />
                        <input type="hidden" name="issue" value={issue} />
                        <input type="hidden" name="geo" value={geo} />
                        <input type="hidden" name="timing" value={timing} />
                        <input type="hidden" name="tier" value={tier} />
                        <input type="hidden" name="smsMode" value={smsMode} />
                        <input type="hidden" name="actor" value="agent" />
                        <input type="hidden" name="messageText" value="Thanks for reaching out. We can keep messaging through your relay alias until you opt in." />
                        <button type="submit" className="w-full rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white">{smsMode === "twilio" ? "Send live relay reply" : "Send campaign reply"}</button>
                      </form>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <Card title="Technical summary">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Session token", initialized.session.session_token.slice(0, 8)],
                      ["Relay alias", privacy.relay.relay_identifier],
                      ["Release state", privacy.relay.release_state],
                      ["Context mode", brochure.usedFallback ? "fallback" : "targeted"],
                      ["Issue focus", brochure.context.issueFocus],
                      ["Geography", brochure.context.geography],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-stone-500">{label}</p>
                        <p className="mt-2 text-lg font-semibold text-stone-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Selected content blocks" dark>
                  <div className="space-y-4">
                    {brochure.blocks.map((block) => (
                      <div key={block.id} className="rounded-3xl bg-white/8 p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{block.block_key}</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">{block.title}</h2>
                        <p className="mt-3 text-base leading-7 text-stone-200">{block.body}</p>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Audit trail">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3">
                      {history.triggers.map((trigger) => (
                        <div key={trigger.id} className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                          <p className="font-semibold text-stone-950">{trigger.trigger_type} | {trigger.trigger_source}</p>
                          <p className="mt-1">Confidence: {Number(trigger.confidence_score).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {brochure.provenance.map((item) => (
                        <div key={item.blockKey} className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                          <p className="font-semibold text-stone-950">{item.blockKey}</p>
                          <p className="mt-1">Issue {item.whySelected.issueFocus}, geography {item.whySelected.geography}, timing {item.whySelected.timingMode}, source {item.whySelected.triggerSource}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
              <div className="space-y-6">
                <Card title="Q&A endpoint">
                  <p className="text-sm text-stone-600">Use the same sample questions, but this view keeps the metadata visible.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {[
                      "How is my phone number protected?",
                      "What is the current fundraising ask?",
                      "Tell me about foreign policy.",
                    ].map((sample) => (
                      <Link key={sample} href={`${baseUrl}&view=technical&q=${encodeURIComponent(sample)}`} className="rounded-full border border-stone-900/10 bg-stone-50 px-4 py-2 text-sm text-stone-700">{sample}</Link>
                    ))}
                  </div>
                  <div className="mt-5 rounded-3xl bg-stone-50 p-5 text-sm text-stone-700">
                    {qa ? (
                      <>
                        <p className="text-base leading-7 text-stone-800">{qa.answer}</p>
                        <p className="mt-3">Mode: {qa.mode} {qa.sourceBlockKeys.length ? `| Sources: ${qa.sourceBlockKeys.join(", ")}` : ""}{qa.fallbackReason ? ` | ${qa.fallbackReason}` : ""}</p>
                      </>
                    ) : (
                      <p>No question selected.</p>
                    )}
                  </div>
                </Card>
                <Card title="Privacy controls">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Donation started", "donation_started"],
                      ["Donation confirmed", "donation_confirmed"],
                      ["Event RSVP", "event_rsvp"],
                      ["Direct contact opt-in", "direct_contact_opt_in"],
                    ].map(([label, intentType]) => (
                      <form key={intentType} action={submitVerifiedIntent}>
                        <input type="hidden" name="sessionToken" value={initialized.session.session_token} />
                        <input type="hidden" name="asset" value={asset} />
                        <input type="hidden" name="source" value={source} />
                        <input type="hidden" name="channel" value={channel} />
                        <input type="hidden" name="issue" value={issue} />
                        <input type="hidden" name="geo" value={geo} />
                        <input type="hidden" name="timing" value={timing} />
                        <input type="hidden" name="tier" value={tier} />
                        <input type="hidden" name="smsMode" value={smsMode} />
                        <input type="hidden" name="intentType" value={intentType} />
                        <button type="submit" className="w-full rounded-2xl border border-stone-900/10 bg-stone-50 px-4 py-3 text-left text-sm font-medium text-stone-800">{label}</button>
                      </form>
                    ))}
                  </div>
                </Card>
                <Card title="Demo entry links">
                  <div className="space-y-3">
                    {DEMO_LINKS.map(([label, href]) => (
                      <Link key={href} href={`${href}&view=technical`} className="block rounded-2xl border border-stone-900/10 bg-stone-50 p-4 text-sm font-medium text-stone-800">
                        {label}
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
