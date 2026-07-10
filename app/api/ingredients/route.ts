import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Google AI Studio model used to read ingredients from a food photo.
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const PROMPT = `You are helping a home-cooking app build a shopping list.
Look at this photo of a dish and list the ingredients likely needed to cook it.
Rules:
- One ingredient per line, with a rough quantity for 2 portions (e.g. "300g squid", "2 eggs", "olive oil").
- Plain text only: no numbering, no bullets, no headings, no commentary.
- 5 to 12 lines.
- If the photo does not show food, reply with exactly: NOT_FOOD`;

function isAllowedImageUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (url.hostname.endsWith(".supabase.co") || url.hostname === "images.unsplash.com")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI ingredient detection isn't set up yet. Add GEMINI_API_KEY to the server environment." },
      { status: 501 }
    );
  }

  // Private app: only signed-in users may use the detector.
  const supabase = await createClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to detect ingredients." }, { status: 401 });
    }
  }

  const body = (await request.json().catch(() => null)) as { imageUrl?: string } | null;
  const imageUrl = body?.imageUrl;

  if (!imageUrl || !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Send a valid photo URL from the archive." }, { status: 400 });
  }

  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    return NextResponse.json({ error: "Could not load this photo." }, { status: 400 });
  }

  const imageBuffer = await imageResponse.arrayBuffer();

  if (imageBuffer.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "This photo is too large to analyse." }, { status: 400 });
  }

  const contentType = imageResponse.headers.get("content-type");
  const mimeType = contentType?.startsWith("image/") ? contentType : "image/jpeg";

  const geminiResponse = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: Buffer.from(imageBuffer).toString("base64") } },
            { text: PROMPT }
          ]
        }
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 }
    })
  });

  if (!geminiResponse.ok) {
    const detail = (await geminiResponse.json().catch(() => null)) as { error?: { message?: string } } | null;

    return NextResponse.json(
      { error: detail?.error?.message || "The AI service could not read this photo. Try again in a moment." },
      { status: 502 }
    );
  }

  const data = (await geminiResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n");

  if (text.includes("NOT_FOOD")) {
    return NextResponse.json({ error: "This photo doesn't look like a dish, so no ingredients were found." }, { status: 422 });
  }

  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s*\-•\d.)]+/, "").trim())
    .filter(Boolean);

  if (!lines.length) {
    return NextResponse.json({ error: "Couldn't read ingredients from this photo." }, { status: 422 });
  }

  return NextResponse.json({ ingredients: lines.join("\n") });
}
