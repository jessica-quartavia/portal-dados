import { readFile } from "node:fs/promises";
import { join } from "node:path";

const port = Number(process.env.COMMERCIAL_DASHBOARD_PORT || 5190);
const qvCsvDir = process.env.QV_CSV_DIR || join(process.env.USERPROFILE || "", "Downloads", "QV- csv");
const dashboardPath = join(qvCsvDir, "dashboard_qv.html");

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/" && pathname !== "/index.html") {
      return new Response("Não encontrado", { status: 404 });
    }

    try {
      const html = await readFile(dashboardPath, "utf8");
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      return new Response(
        `Dashboard Comercial QV não encontrado em ${dashboardPath}\n${error instanceof Error ? error.message : error}`,
        { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
  },
});

console.log(`Dashboard Comercial QV em ${server.url}`);
