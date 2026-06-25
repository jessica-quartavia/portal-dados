import type { APIRoute } from "astro";
import fallbackSnapshot from "../../data/researchCenterDbSnapshot.json";

const DEFAULT_RESEARCH_CENTER_API_URL =
  "https://merry-creponne-2f6ab1.netlify.app/api/research-center";

export const GET: APIRoute = async () => {
  const upstreamUrl =
    import.meta.env.RESEARCH_CENTER_API_URL || DEFAULT_RESEARCH_CENTER_API_URL;

  try {
    const response = await fetch(`${upstreamUrl}?ts=${Date.now()}`, {
      headers: { accept: "application/json" },
    });

    if (response.ok) {
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  } catch {
    // Fall through to the bundled snapshot so the dashboard remains usable.
  }

  return new Response(JSON.stringify(fallbackSnapshot), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
