import { NextRequest, NextResponse } from "next/server";

import { answerSessionQuestion } from "@/lib/demo/qa";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionToken: string }> },
) {
  const { sessionToken } = await context.params;
  const body = (await request.json()) as { question?: string };
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Question is required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await answerSessionQuestion(sessionToken, question);

    return NextResponse.json({
      ok: true,
      question,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : "Q&A lookup failed.",
      },
      { status: 500 },
    );
  }
}
