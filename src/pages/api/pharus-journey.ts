import type { APIRoute } from "astro";
import { loadPharusJourney } from "../../data/pharusJourney";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const data = await loadPharusJourney();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Falha ao consultar dados do dashboard Pharus.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};
