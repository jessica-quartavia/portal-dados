import type { APIRoute } from "astro";
import { fetchProdutosMetrics, type ProdutosFilters } from "../../lib/produtos";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const filters: ProdutosFilters = {
    start: url.searchParams.get("start") || "",
    end: url.searchParams.get("end") || "",
    program: url.searchParams.get("program") || "",
    cohort: url.searchParams.get("cohort") || "",
  };

  try {
    const result = await fetchProdutosMetrics(filters);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Falha ao consultar dados do dashboard Produtos.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};
