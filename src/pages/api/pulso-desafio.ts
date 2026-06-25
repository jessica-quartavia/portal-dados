import type { APIRoute } from "astro";
import { fetchAgendamentos } from "../../lib/pulsoDesafio";
import type { FiltrosPulso } from "../../types/pulsoDesafio";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const filtros: FiltrosPulso = {
    desafio: url.searchParams.get("desafio") || "",
    dataInicio: url.searchParams.get("dataInicio") || "",
    dataFim: url.searchParams.get("dataFim") || "",
  };

  try {
    const rows = await fetchAgendamentos(filtros);
    return new Response(JSON.stringify({ rows }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Falha ao consultar dados do dashboard Pulso Desafio.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};
