import Link from "next/link";

import {
  getDashboardSessionDetail,
  listDashboardSessions,
} from "@/lib/demo/dashboard";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(
  value: string | string[] | undefined,
  fallback: string,
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function AgentDashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedToken = one(params.session, "");
  const sessions = await listDashboardSessions();
  const activeToken = selectedToken || sessions[0]?.session_token || "";
  const detail = activeToken ? await getDashboardSessionDetail(activeToken) : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#122235_0%,#0f1a28_55%,#1d354e_100%)] text-stone-100">
      <section className="mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl leading-tight text-white">
              Agent dashboard
            </h1>
            <p className="mt-1 text-sm text-stone-300">
              Select a supporter session, review context, and decide whether to
              reply through the relay or move to direct follow-up.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-stone-200"
          >
            Back to citizen flow
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
          <Panel title="Session List">
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link
                  key={session.session_token}
                  href={`/agent?session=${session.session_token}`}
                  className={`block rounded-2xl border px-4 py-3 transition ${
                    activeToken === session.session_token
                      ? "border-cyan-300/50 bg-cyan-300/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {session.supporter_alias}
                      </p>
                      <p className="mt-1 text-xs text-stone-300">
                        {session.campaign_assets?.display_name}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-200">
                      {session.release_state}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-stone-300">
                    <p>{session.issue_focus ?? "unknown"} • {session.geography ?? "unknown"}</p>
                    <p>{session.current_channel} • {session.engagement_tier}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <div className="space-y-4">
            {detail ? (
              <>
                <Panel title="Selected Session">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-white">
                        {detail.session.supporter_alias}
                      </h2>
                      <p className="mt-1 text-sm text-stone-300">
                        {detail.session.campaign_assets?.display_name} •{" "}
                        {detail.session.campaign_assets?.office_or_mission}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/6 px-4 py-3 text-sm text-stone-200">
                      <p>Relay: {detail.relay.relay_identifier}</p>
                      <p className="mt-1">
                        Direct contact:{" "}
                        {detail.relay.release_state === "released"
                          ? detail.relay.direct_identifier_encrypted
                          : "hidden behind relay"}
                      </p>
                    </div>
                  </div>
                </Panel>

                <div className="grid gap-4 md:grid-cols-4">
                  <Panel title="Issue">
                    <p className="text-sm text-stone-200">
                      {detail.session.issue_focus ?? "unknown"}
                    </p>
                  </Panel>
                  <Panel title="Geography">
                    <p className="text-sm text-stone-200">
                      {detail.session.geography ?? "unknown"}
                    </p>
                  </Panel>
                  <Panel title="Privacy">
                    <p className="text-sm text-stone-200">
                      {detail.relay.release_state}
                    </p>
                  </Panel>
                  <Panel title="Channel">
                    <p className="text-sm text-stone-200">
                      {detail.session.current_channel}
                    </p>
                  </Panel>
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                  <Panel title="Privacy And Release">
                    <div className="space-y-2 text-sm text-stone-200">
                      <p>Release state: {detail.relay.release_state}</p>
                      <p>Release reason: {detail.relay.release_reason ?? "none"}</p>
                      <p>
                        Direct contact:{" "}
                        {detail.relay.release_state === "released"
                          ? detail.relay.direct_identifier_encrypted
                          : "not visible to staff"}
                      </p>
                    </div>
                  </Panel>

                  <Panel title="Timeline">
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {detail.intents.map((intent) => (
                        <div
                          key={intent.id}
                          className="rounded-2xl bg-white/5 p-3 text-sm text-stone-200"
                        >
                          <p className="font-semibold text-white">
                            Intent: {intent.intent_type}
                          </p>
                          <p className="mt-1 text-stone-300">{intent.status}</p>
                        </div>
                      ))}
                      {detail.logs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-2xl bg-white/5 p-3 text-sm text-stone-200"
                        >
                          <p className="font-semibold text-white">
                            {log.interaction_type}
                          </p>
                          <p className="mt-1 text-stone-300">{log.message_text}</p>
                        </div>
                      ))}
                      {detail.intents.length === 0 && detail.logs.length === 0 ? (
                        <p className="text-sm text-stone-300">
                          No activity recorded for this session yet.
                        </p>
                      ) : null}
                    </div>
                  </Panel>
                </div>
              </>
            ) : (
              <Panel title="Selected Session">
                <p className="text-sm text-stone-300">No sessions available.</p>
              </Panel>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
