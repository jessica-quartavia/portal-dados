import type { APIRoute } from "astro";
import fallbackSnapshot from "../../data/researchCenterDbSnapshot.json";

function snapshotResponse() {
  return new Response(JSON.stringify(fallbackSnapshot), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export const GET: APIRoute = async () => {
  try {
    const upstreamUrl = (
      (import.meta.env.RESEARCH_CENTER_API_URL as string | undefined) ||
      process.env.RESEARCH_CENTER_API_URL ||
      ""
    ).trim();

    if (upstreamUrl) {
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
        // snapshot abaixo
      }
    }

    return snapshotResponse();
  } catch (error) {
    console.error("[research-center] falha inesperada:", error);
    return snapshotResponse();
  }
};
