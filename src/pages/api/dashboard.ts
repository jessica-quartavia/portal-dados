import type { APIRoute } from "astro";
import { fetchDashboardData } from "../../data/iapmai26/dashboard-service";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!start || !end) {
    return new Response(JSON.stringify({ error: "Informe start e end." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  try {
    const data = await fetchDashboardData({ start, end });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Falha ao consultar dados do dashboard.",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
