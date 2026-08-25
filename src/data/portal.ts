export type DashboardEntry = {
  slug: string;
  titulo: string;
  descricao: string;
  tag: string;
  href?: string;
  localService?: boolean;
  devOnly?: boolean;
};

export const dashboards: DashboardEntry[] = [
  {
    slug: "exemplo-vendas",
    titulo: "Vendas — Exemplo",
    descricao: "Modelo de referência: KPIs, gráfico e tabela no padrão Quarta Via.",
    tag: "Exemplo",
    devOnly: true, // oculto no portal; rota continua acessível para dev
  },
  {
    slug: "jornada-cliente-pharus",
    titulo: "Dashboard Jornada do Cliente Pharus",
    descricao: "Funil operacional, etapas atuais, completude financeira, reunioes e saude da jornada.",
    tag: "App Pharus",
  },
  {
    slug: "iapmai26-agendamentos",
    titulo: "Dashboard IAP Maio 26 - Agendamentos",
    descricao: "Agendamentos, no-show, renda e validacao dos dados da campanha IAP Maio 26.",
    tag: "Comercial",
  },
  {
    slug: "produtos",
    titulo: "Dashboard Produto, Operacao e Clientes",
    descricao: "Clientes, cancelamentos, operacao, ascensoes e indicadores do time de Produtos.",
    tag: "Produtos",
  },
  {
    slug: "research-center-insights",
    titulo: "Dashboard CSAT, NPS e Cancelamentos",
    descricao: "Satisfacao, feedbacks, churn, renovacao e analise qualitativa do Research Center.",
    tag: "Research Center",
  },
  {
    slug: "perfil-cliente-infoproduto",
    titulo: "Dashboard Perfil de Cliente Atual vs. Infoproduto",
    descricao: "Comparativo entre a base de clientes QV360 e os leads inscritos no infoproduto.",
    tag: "Marketing",
  },
  {
    slug: "pulso-desafio",
    titulo: "Dashboard Pulso Desafio - Agendamentos",
    descricao: "Agendamentos, comparecimento, no-shows e renda dos leads do desafio.",
    tag: "Comercial",
  },
  {
    slug: "comercial-qv",
    href: "http://127.0.0.1:5190",
    titulo: "Dashboard Comercial QV",
    descricao: "Funil, receita, pagamentos e performance comercial consolidada.",
    tag: "Comercial",
    localService: true,
  },
  {
    slug: "qualidade-dados",
    href: "http://127.0.0.1:4173",
    titulo: "Dashboard de Qualidade dos Dados",
    descricao: "Completude dos campos de clientes, jornada, financeiro, reunioes, NPS e CSAT.",
    tag: "Qualidade",
    localService: true,
  },
  {
    slug: "info-leads",
    href: "http://127.0.0.1:5188",
    titulo: "Dashboard Info Leads",
    descricao: "Consulta operacional dos leads dos pipelines de vendas e desafio.",
    tag: "Business Data",
    localService: true,
  },
  {
    slug: "info-cliente",
    href: "http://127.0.0.1:5187",
    titulo: "Dashboard Info Cliente",
    descricao: "Acompanhamento da view de clientes, completude cadastral e dados operacionais.",
    tag: "Base QV",
    localService: true,
  },
];

export const visibleDashboards = dashboards.filter((d) => !d.devOnly);

export type PortalProjectIcon =
  | "route"
  | "layout-dashboard"
  | "chart-no-axes-combined"
  | "book-open";

export type PortalProject = {
  slug: string;
  title: string;
  category: string;
  description: string;
  href: string;
  external: boolean;
  icon: PortalProjectIcon;
  cta: string;
  meta?: string;
  featured?: boolean;
};

export function getPortalProjects(): PortalProject[] {
  const count = visibleDashboards.length;

  // A ordem deste array define a Home. O primeiro item deve permanecer em destaque.

  return [
    {
      slug: "jornada-cliente",
      title: "Analytics QuartaVia - Jornada do cliente",
      category: "Produto principal",
      description:
        "Portal analítico da Jornada do Cliente, reunindo indicadores, análises e insights sobre comportamento, operação, permanência e experiência dos clientes da QuartaVia.",
      href: "https://dash-simplificado.vercel.app/#executive",
      external: true,
      icon: "route",
      cta: "Abrir jornada do cliente",
      featured: true,
    },
    {
      slug: "dashboards",
      title: "Dashboards",
      category: "Interno",
      description:
        "Indicadores, análises e acompanhamento das principais áreas e operações da QuartaVia.",
      href: "/dashboards",
      external: false,
      icon: "layout-dashboard",
      cta: "Explorar dashboards",
      meta: `${count} dashboard${count === 1 ? "" : "s"} disponíve${count === 1 ? "l" : "is"}`,
    },
    {
      slug: "dashboard-geral",
      title: "Dashboard Geral QuartaVia",
      category: "Analytics",
      description:
        "Visão consolidada de indicadores, dados operacionais e análises da jornada dos clientes da QuartaVia.",
      href: "https://dash-jornada-cliente-dados-automacao.vercel.app/",
      external: true,
      icon: "chart-no-axes-combined",
      cta: "Acessar dashboard",
    },
    {
      slug: "documentacao-ferramentas",
      title: "Documentação de Ferramentas",
      category: "Documentação",
      description:
        "Central de documentação das ferramentas, automações e integrações utilizadas pelos times da QuartaVia.",
      href: "https://quartavia-documentacao.vercel.app/",
      external: true,
      icon: "book-open",
      cta: "Acessar documentação",
    },
  ];
}

export function dashboardHref(d: DashboardEntry): string {
  return d.href ?? `/dashboards/${d.slug}`;
}

export function dashboardSearchText(d: DashboardEntry): string {
  return `${d.titulo} ${d.tag} ${d.descricao}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
