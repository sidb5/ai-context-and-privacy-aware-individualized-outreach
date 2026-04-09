"use client";

import { useState } from "react";

type BrochureBlock = {
  id: string;
  block_type: string;
  title: string;
  body: string;
  cta_label: string | null;
};

type SmsMessage = {
  id: string;
  actor: string;
  message_text: string | null;
};

type WorkflowDemoProps = {
  campaignName: string;
  pathLabel: string;
  accentClass: string;
  accentSoftClass: string;
  issueFocus: string;
  geography: string;
  triggerSource: string;
  triggerChannel: string;
  timingMode: string;
  inDistrict: boolean;
  brochureBlocks: BrochureBlock[];
  relayAlias: string;
  releaseState: string;
  supporterAlias: string;
  smsMessages: SmsMessage[];
};

type StepKey =
  | "trigger"
  | "context"
  | "assembly"
  | "delivery"
  | "privacy"
  | "sms";

const STEP_ORDER: StepKey[] = [
  "trigger",
  "context",
  "assembly",
  "delivery",
  "privacy",
  "sms",
];

function getEntryDetails(
  triggerSource: string,
  triggerChannel: string,
  campaignName: string,
) {
  if (triggerChannel === "sms") {
    return {
      mode: "sms" as const,
      shortCode: "72821",
      keyword:
        campaignName.includes("Maya") ? "MAYA" : "FUTURE",
      headline: "Supporter starts by texting a campaign short code",
      detail: "The first action is an SMS to the campaign number, which creates the session.",
    };
  }

  return {
    mode: "qr" as const,
    shortCode: "",
    keyword: "",
    headline: "Supporter starts by scanning a campaign QR code",
    detail: `The QR appears on the ${triggerSource} and opens the personalized session.`,
  };
}

function DeviceFrame({
  children,
  mobile = false,
  title,
  accentClass,
}: {
  children: React.ReactNode;
  mobile?: boolean;
  title: string;
  accentClass: string;
}) {
  return (
    <div
      className={
        mobile
          ? `mx-auto w-full max-w-[340px] rounded-[2.5rem] border-[10px] ${accentClass} bg-stone-950 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.22)]`
          : `w-full rounded-[1.75rem] border border-stone-900/10 bg-stone-100 p-3 shadow-[0_24px_70px_rgba(74,52,29,0.16)] ring-4 ${accentClass}`
      }
    >
      {mobile ? (
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-stone-700" />
      ) : (
        <div className="mb-3 flex items-center gap-2 px-2 pt-1">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            {title}
          </span>
        </div>
      )}
      <div className="rounded-[1.5rem] bg-white p-4">{children}</div>
    </div>
  );
}

function ProcessStep({
  active,
  title,
  body,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-3xl border p-3 text-left transition ${
        active
          ? "border-cyan-300/60 bg-cyan-300/12 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.15)]"
          : "border-white/10 bg-white/5 text-stone-200 hover:border-white/20 hover:bg-white/8"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{title}</p>
      <p className="mt-1 text-sm font-semibold">{body}</p>
      <p className="mt-1 text-xs leading-5 text-stone-300">{detail}</p>
    </button>
  );
}

export function WorkflowDemo(props: WorkflowDemoProps) {
  const [step, setStep] = useState<StepKey>("trigger");
  const stepIndex = STEP_ORDER.indexOf(step);
  const currentBlocks = props.brochureBlocks.slice(0, 3);
  const entryDetails = getEntryDetails(
    props.triggerSource,
    props.triggerChannel,
    props.campaignName,
  );
  const trafficLines = [
    [
      "POST /api/session/create_or_resume 200",
      "creates or resumes the supporter session",
    ],
    [
      `POST /api/context/resolve issue=${props.issueFocus} geo=${props.geography}`,
      "figures out what kind of supporter this is",
    ],
    [
      "GET /api/content/approved-blocks 200",
      "pulls only approved campaign content",
    ],
    [
      `POST /api/brochure/assemble mode=${props.pathLabel.toLowerCase()}`,
      "builds the supporter-facing response",
    ],
    [
      `POST /api/privacy/enforce relay=${props.relayAlias}`,
      "keeps the real contact hidden behind the relay",
    ],
    [
      "POST /api/continuity/bind-channel sms|web",
      "keeps the same conversation alive across channels",
    ],
  ] as const;

  return (
    <section className="space-y-6">
      <div className="rounded-[1.6rem] border border-stone-900/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(74,52,29,0.12)]">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700">
          Overall Flow
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-6">
          {[
            "Supporter enters",
            "Server reads context",
            "Approved pieces selected",
            "Personalized response delivered",
            "Privacy rules enforced",
            "Conversation continues",
          ].map((item, index) => (
            <div
              key={item}
              className={`rounded-2xl px-3 py-2 text-sm ${
                index <= stepIndex
                  ? "bg-stone-950 text-white"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.1rem] border border-stone-900/20 bg-black px-3 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-stone-400">
            network-console.log
          </p>
          <p className="font-mono text-[10px] text-stone-500">
            live backend trace
          </p>
        </div>
        <div className="h-[126px] overflow-y-auto font-mono text-[11px] leading-5">
          {trafficLines.slice(0, stepIndex + 2).map(([line, explanation], index) => (
            <div
              key={`${index}-${line}`}
              className="flex items-start gap-2 whitespace-nowrap text-stone-100"
            >
              <span className="shrink-0 text-stone-500">
                [{String(index + 1).padStart(2, "0")}]
              </span>
              <span className="truncate">{line}</span>
              <span className="truncate text-cyan-400">
                ({explanation})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.6rem] border border-stone-900/10 bg-white/90 p-5 shadow-[0_20px_60px_rgba(74,52,29,0.12)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-700">
                Supporter View
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                This is the actual experience the supporter would see for the
                selected demo path.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setStep(STEP_ORDER[Math.max(0, stepIndex - 1)])
                }
                className="rounded-full border border-stone-900/10 bg-stone-50 px-4 py-2 text-sm text-stone-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  setStep(
                    STEP_ORDER[Math.min(STEP_ORDER.length - 1, stepIndex + 1)],
                  )
                }
                className="rounded-full bg-stone-950 px-4 py-2 text-sm text-white"
              >
                Next
              </button>
            </div>
          </div>

          <div className="mt-4">
            {step === "sms" ? (
              <DeviceFrame mobile title="Supporter phone" accentClass={props.accentClass}>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  SMS conversation
                </p>
                <div className="mt-4 space-y-3">
                  {props.smsMessages.length > 0 ? (
                    props.smsMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          message.actor === "agent"
                            ? "mr-auto bg-stone-100 text-stone-700"
                            : "ml-auto bg-emerald-500 text-white"
                        }`}
                      >
                        {message.message_text}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="ml-auto max-w-[85%] rounded-2xl bg-emerald-500 px-4 py-3 text-sm text-white">
                        I want to know if my donation is private.
                      </div>
                      <div className="mr-auto max-w-[85%] rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
                        We can keep messaging through your relay alias until you opt in.
                      </div>
                    </>
                  )}
                </div>
              </DeviceFrame>
            ) : step === "trigger" && entryDetails.mode === "sms" ? (
              <DeviceFrame mobile title="Supporter phone" accentClass={props.accentClass}>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Text entry
                </p>
                <div className="mt-3 rounded-3xl bg-stone-100 p-4 text-stone-800">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                    New message
                  </p>
                  <p className="mt-2 text-sm">
                    To: <span className="font-semibold">{entryDetails.shortCode}</span>
                  </p>
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
                    {entryDetails.keyword}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-stone-500">
                    Supporter texts the keyword to the campaign short code to start the session.
                  </p>
                </div>
                <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-stone-950">
                    {entryDetails.headline}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    {entryDetails.detail}
                  </p>
                </div>
              </DeviceFrame>
            ) : step === "trigger" ? (
              <DeviceFrame title="Supporter browser" accentClass={props.accentClass}>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  Entry point
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className={`rounded-3xl p-5 ${props.accentSoftClass}`}>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">
                      Campaign flyer
                    </p>
                    <p className="mt-2 text-xl font-semibold text-stone-950">
                      Scan to see where {props.campaignName.split(" ")[0]} stands
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-700">
                      Supporters scan this code from the {props.triggerSource} to open a tailored campaign experience.
                    </p>
                    <div className="mt-4 inline-flex rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium text-stone-700">
                      Entry channel: QR scan
                    </div>
                  </div>
                  <div className="rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="mx-auto grid h-36 w-36 grid-cols-6 gap-1 rounded-2xl bg-stone-950 p-3">
                      {Array.from({ length: 36 }).map((_, index) => {
                        const filled = [
                          0, 1, 2, 6, 8, 12, 13, 14, 17, 18, 20, 22, 24, 25, 26, 29, 30, 31, 33, 35,
                        ].includes(index);
                        return (
                          <div
                            key={index}
                            className={filled ? "rounded-[2px] bg-white" : "rounded-[2px] bg-stone-800"}
                          />
                        );
                      })}
                    </div>
                    <p className="mt-3 text-center text-xs leading-5 text-stone-600">
                      Supporter opens camera, scans the QR code, and lands in the session.
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-stone-950">
                    {entryDetails.headline}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stone-600">
                    {entryDetails.detail}
                  </p>
                </div>
              </DeviceFrame>
            ) : (
              <DeviceFrame title="Supporter browser" accentClass={props.accentClass}>
                <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                  {props.pathLabel}
                </p>
                {step === "context" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Issue", props.issueFocus],
                      ["Location", props.geography],
                      ["Timing", props.timingMode],
                      ["District match", props.inDistrict ? "Yes" : "No"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-stone-50 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                          {label}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-stone-950">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {step === "assembly" || step === "delivery" ? (
                  <div className="mt-4 space-y-4">
                    {currentBlocks[0] ? (
                      <div className={`rounded-3xl p-5 ${props.accentSoftClass}`}>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                          {props.pathLabel}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-stone-950">
                          {currentBlocks[0].title}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-stone-700">
                          {currentBlocks[0].body}
                        </p>
                        <div className="mt-4 inline-flex rounded-full border border-stone-900/10 bg-white/80 px-3 py-1 text-[11px] font-medium text-stone-700">
                          Tailored for {props.issueFocus} • {props.geography} • {props.timingMode}
                        </div>
                      </div>
                    ) : null}
                    {currentBlocks[1] ? (
                      <div className="rounded-3xl bg-stone-50 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                          Follow-up detail
                        </p>
                        <p className="mt-2 text-lg font-semibold text-stone-950">
                          {currentBlocks[1].title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                          {currentBlocks[1].body}
                        </p>
                        {currentBlocks[1].cta_label ? (
                          <div className="mt-3 inline-flex rounded-full bg-stone-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                            {currentBlocks[1].cta_label}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {currentBlocks[2] ? (
                      <div className="rounded-2xl border border-stone-900/10 bg-white p-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                          Privacy note
                        </p>
                        <p className="mt-1 text-xs leading-5 text-stone-700">
                          {currentBlocks[2].body}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {step === "privacy" ? (
                  <div className="mt-4 space-y-4">
                    <div className={`rounded-3xl p-5 ${props.accentSoftClass}`}>
                      <p className="text-lg font-semibold text-stone-950">
                        Privacy status
                      </p>
                      <p className="mt-3 text-sm leading-7 text-stone-700">
                        Staff sees {props.supporterAlias} and replies through{" "}
                        {props.relayAlias}. Direct contact is currently{" "}
                        {props.releaseState === "released"
                          ? "released"
                          : "still hidden"}.
                      </p>
                    </div>
                  </div>
                ) : null}
              </DeviceFrame>
            )}
          </div>
        </div>

        <div className="rounded-[1.6rem] bg-stone-950 p-5 text-stone-100 shadow-[0_20px_60px_rgba(34,23,12,0.24)]">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
            Server Processing
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            This box shows what the platform is doing underneath the supporter
            experience. Click a step or use Next/Back to move through the flow.
          </p>

          <div className="mt-4 max-h-[480px] space-y-2 overflow-y-auto pr-2">
            <ProcessStep
              active={step === "trigger"}
              onClick={() => setStep("trigger")}
              title="Step 1"
              body="Receive trigger"
              detail={`Supporter enters from ${props.triggerSource} on ${props.triggerChannel}. A session begins immediately.`}
            />
            <ProcessStep
              active={step === "context"}
              onClick={() => setStep("context")}
              title="Step 2"
              body="Determine context"
              detail={`The system resolves issue=${props.issueFocus}, geography=${props.geography}, timing=${props.timingMode}, in_district=${props.inDistrict}.`}
            />
            <ProcessStep
              active={step === "assembly"}
              onClick={() => setStep("assembly")}
              title="Step 3"
              body="Select approved content"
              detail={`The server fetches approved campaign blocks and chooses only the pieces that match this context.`}
            />
            <ProcessStep
              active={step === "delivery"}
              onClick={() => setStep("delivery")}
              title="Step 4"
              body="Assemble and deliver"
              detail={`The chosen blocks are assembled into the supporter-facing experience and sent back to the device.`}
            />
            <ProcessStep
              active={step === "privacy"}
              onClick={() => setStep("privacy")}
              title="Step 5"
              body="Apply privacy rules"
              detail={`Campaign staff talk through relay ${props.relayAlias}. Direct contact stays hidden until verified intent.`}
            />
            <ProcessStep
              active={step === "sms"}
              onClick={() => setStep("sms")}
              title="Step 6"
              body="Continue across channel"
              detail={`The same session continues into SMS with the same context and relay protections.`}
            />
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-300/20 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Processing Console
            </p>
            <div className="mt-4 space-y-2 font-mono text-xs text-stone-300">
              <p>{">"} session.create_or_resume()</p>
              <p>{">"} context.resolve(trigger, geography, issue, timing)</p>
              <p>{">"} content.fetch_approved_blocks()</p>
              <p>{">"} brochure.assemble_for_supporter()</p>
              <p>{">"} relay.enforce_privacy_policy()</p>
              <p>{">"} continuity.bind_web_and_sms()</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
