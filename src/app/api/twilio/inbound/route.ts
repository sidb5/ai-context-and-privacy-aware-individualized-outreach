import { NextResponse } from "next/server";
import twilio from "twilio";

import { handleTwilioInboundMessage } from "@/lib/demo/messaging";
import { isTwilioConfigured } from "@/lib/twilio/client";

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = String(formData.get("From") ?? "").trim();
  const to = String(formData.get("To") ?? "").trim();
  const body = String(formData.get("Body") ?? "").trim();
  const response = new twilio.twiml.MessagingResponse();

  if (!isTwilioConfigured()) {
    response.message(
      "Twilio mode is present in code but not configured yet. Add credentials and a phone number to activate live SMS.",
    );

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  if (!from || !to || !body) {
    response.message("Missing inbound SMS fields.");

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }

  const result = await handleTwilioInboundMessage({ from, to, body });
  response.message(
    `Your message was received. Session ${result.sessionToken.slice(0, 8)} is active and ready for relay-safe follow-up.`,
  );

  return new NextResponse(response.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}
