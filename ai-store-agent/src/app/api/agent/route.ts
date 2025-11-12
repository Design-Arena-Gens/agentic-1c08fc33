import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { buildAgentPrompt } from "@/lib/prompt";
import { SAMPLE_AGENT_RESPONSE } from "@/lib/sample-plan";
import type { AgentBrief, AgentResponse, MediaAttachment } from "@/types/agent";

const mediaSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.union([z.literal("image"), z.literal("video")]),
  dataUrl: z.string(),
  notes: z.string().optional(),
});

const payloadSchema = z.object({
  objective: z.string().min(8, "Objective is too short"),
  focusAreas: z.array(
    z.union([
      z.literal("catalog"),
      z.literal("sales"),
      z.literal("loyalty"),
      z.literal("seo"),
      z.literal("automation"),
      z.literal("ads"),
      z.literal("support"),
    ])
  ),
  tone: z.string().optional(),
  constraints: z.string().optional(),
  targetChannels: z.array(z.string()),
  tasks: z.array(z.string()),
  media: z.array(mediaSchema),
  budget: z
    .object({
      amount: z.number().positive(),
      currency: z.string(),
      cadence: z.union([
        z.literal("daily"),
        z.literal("weekly"),
        z.literal("monthly"),
      ]),
      platform: z.union([z.literal("meta"), z.literal("google"), z.literal("both")]).optional(),
    })
    .optional(),
});

function deriveMediaTokens(media: MediaAttachment[]): string[] {
  return media.map((item) => {
    const descriptor = item.notes ? `Notes: ${item.notes}` : "No notes provided";
    return `${item.kind.toUpperCase()} - ${item.name} (${descriptor})`;
  });
}

async function runModel(brief: AgentBrief, mediaTokens: string[]): Promise<AgentResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return SAMPLE_AGENT_RESPONSE;
  }

  const client = new OpenAI({ apiKey });
  const prompt = buildAgentPrompt(brief, mediaTokens);

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    max_output_tokens: 1400,
  });

  const outputText = response.output_text;

  const parsedPlan = JSON.parse(outputText);

  return {
    plan: parsedPlan,
    raw: outputText,
    usedSample: false,
  };
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = payloadSchema.parse(json);

    const brief: AgentBrief = {
      objective: parsed.objective,
      focusAreas: parsed.focusAreas,
      tone: parsed.tone,
      constraints: parsed.constraints,
      targetChannels: parsed.targetChannels,
      tasks: parsed.tasks,
      media: parsed.media,
      budget: parsed.budget,
    };

    const mediaTokens = deriveMediaTokens(parsed.media);
    const agentResponse = await runModel(brief, mediaTokens);

    return NextResponse.json(agentResponse);
  } catch (error) {
    console.error("Agent API failure", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          issues: error.flatten(),
        },
        { status: 400 }
      );
    }

    try {
      return NextResponse.json(SAMPLE_AGENT_RESPONSE);
    } catch (fallbackError) {
      console.error("Fallback response failure", fallbackError);
      return NextResponse.json(
        { error: "Agent unavailable" },
        { status: 500 }
      );
    }
  }
}
