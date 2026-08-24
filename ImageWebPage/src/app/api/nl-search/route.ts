import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) {
    return NextResponse.json({ tags: [], type: null, favourites: false });
  }

  // Fetch available tags from Spring Boot
  let availableTags: string[] = [];
  try {
    const tagsRes = await fetch(`${BACKEND}/api/tags/ranked`, { cache: "no-store" });
    if (tagsRes.ok) {
      const ranked: { name: string }[] = await tagsRes.json();
      availableTags = ranked.map((t) => t.name);
    }
  } catch {
    // Proceed with empty tag list — Claude will still handle type/favourites
  }

  // Fetch available media types
  let availableTypes: string[] = [];
  try {
    const countsRes = await fetch(`${BACKEND}/api/images/counts`, { cache: "no-store" });
    if (countsRes.ok) {
      const counts: Record<string, number> = await countsRes.json();
      availableTypes = Object.keys(counts);
    }
  } catch {
    availableTypes = ["Video", "GIF", "WEBP"];
  }

  const prompt = `You are a search assistant for a personal photo and video gallery app.

Available tags in this gallery: ${availableTags.length ? availableTags.join(", ") : "(none yet)"}
Available media types: ${availableTypes.length ? availableTypes.join(", ") : "Video, GIF, WEBP"}

The user typed: "${query}"

Interpret their search intent and return ONLY a valid JSON object with no explanation:
{
  "tags": [],
  "type": null,
  "favourites": false
}

Rules:
- tags: only include values from the available tags list; match semantically (e.g. "sunset" could match tag "TheSunset")
- type: set to one of the available media types only if the user explicitly mentions that kind of media (video, gif, webp, animated); otherwise null
- favourites: true only if the user mentions "favourite", "starred", "liked", "hearted", or similar
- If nothing matches confidently, return all empty/null/false — do NOT invent tags`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

    // Strip markdown code fences if the model wraps the JSON
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json({
      tags: Array.isArray(result.tags) ? result.tags : [],
      type: typeof result.type === "string" && result.type ? result.type : null,
      favourites: result.favourites === true,
    });
  } catch {
    // On any failure return empty filters — results page shows "0 items"
    return NextResponse.json({ tags: [], type: null, favourites: false });
  }
}
