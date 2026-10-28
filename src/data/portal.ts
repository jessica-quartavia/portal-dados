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

export type InternalLegacyItem = {
  slug: string;
  title: string;
  description: string;
  href: string;
  tag: string;
  external?: boolean;
  localService?: boolean;
};

export type InternalSection = {
  id: string;
  title: string;
  description?: string;
  items: InternalLegacyItem[];
};

export function getInternalCurrentDashboard(): InternalLegacyItem {
  return {
    slug: "dashboard-geral",
    title: "Dashboard Geral Inteligência",
    description:
      "Painel de estudos e análises do time de Inteligência, com visão consolidada de indicadores, dados operacionais e análises estratégicas.",
    href: "https://dash-jornada-cliente-dados-automacao.vercel.app/",
    tag: "Analytics",
    external: true,
  };
}

export function getInternalLegacyItems(): InternalLegacyItem[] {
  return visibleDashboards.map((d) => ({
    slug: d.slug,
    title: d.titulo,
    description: d.descricao,
    href: dashboardHref(d),
    tag: d.tag,
    external: Boolean(d.href?.startsWith("http")),
    localService: d.localService,
  }));
}

export function getInternalSections(): InternalSection[] {
  return [
    {
      id: "legacy",
      title: "Conteúdo antigo",
      description: "Dashboards e painéis legados mantidos para consulta.",
      items: getInternalLegacyItems(),
    },
  ];
}

export type PortalLucideIcon =
  | "layout-dashboard"
  | "chart-no-axes-combined"
  | "book-open"
  | "activity"
  | "lock"
  | "list-checks"
  | "refresh-cw"
  | "gauge";

export type PortalProjectIcon =
  | { type: "lucide"; name: PortalLucideIcon }
  | { type: "image"; src: string; alt: string };

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
  statusBadge?: string;
  restrictedAccess?: boolean;
};

export function getInternalPortalProject(): PortalProject {
  return {
    slug: "interno-inteligencia",
    title: "Interno Inteligência",
    category: "INTERNO",
    description:
      "Dashboards, estudos e análises de uso interno do time de Inteligência.",
    href: "/dashboards",
    external: false,
    icon: { type: "lucide", name: "lock" },
    cta: "Acessar área interna",
    restrictedAccess: true,
  };
}

export function getPortalProjects(): PortalProject[] {
  // A ordem deste array define a Home. O primeiro item deve permanecer em destaque.
  // O card Interno Inteligência é renderizado separadamente (allowlist).

  return [
    {
      slug: "jornada-cliente",
      title: "Analytics QuartaVia - Jornada do cliente",
      category: "Produto principal",
      description:
        "Portal analítico da Jornada do Cliente, reunindo indicadores, análises e insights sobre comportamento, operação, permanência e experiência dos clientes da QuartaVia.",
      href: "https://dash-simplificado.vercel.app/#executive",
      external: true,
      icon: { type: "image", src: "/icons/favicon-qv.ico", alt: "QuartaVia" },
      cta: "Abrir jornada do cliente",
      featured: true,
    },
    {
      slug: "dashboard-app-pharus",
      title: "Dashboard App Pharus",
      category: "App Pharus",
      description:
        "Dashboard de acompanhamento do App Pharus, reunindo indicadores, análises e informações operacionais da plataforma.",
      href: "https://dash-app-pharus.vercel.app/",
      external: true,
      icon: { type: "image", src: "/icons/pharus-logo.png", alt: "App Pharus" },
      cta: "Acessar dashboard",
      statusBadge: "Em construção",
    },
    {
      slug: "dashboard-operacoes",
      title: "Dashboard Operações",
      category: "Operações",
      description:
        "Dashboard de acompanhamento das operações, reunindo indicadores, análises e informações operacionais para acompanhamento do time.",
      href: "https://dash-operacoes-omega.vercel.app/",
      external: true,
      icon: { type: "lucide", name: "activity" },
      cta: "Acessar dashboard",
    },
    {
      slug: "renovacao-eps",
      title: "Renovação EPs",
      category: "RENOVAÇÕES",
      description:
        "Acompanhamento de renovações por EP, com indicadores e análises para monitoramento da carteira e dos ciclos de renovação.",
      href: "https://renovacoes-eps.vercel.app/",
      external: true,
      icon: { type: "lucide", name: "refresh-cw" },
      cta: "Acessar dashboard",
    },
    {
      slug: "performance-wrike",
      title: "Performance Wrike",
      category: "PERFORMANCE",
      description:
        "Dashboard de acompanhamento de performance, tarefas, responsáveis e indicadores operacionais do Wrike.",
      href: "https://performance-wrike.vercel.app/",
      external: true,
      icon: { type: "lucide", name: "gauge" },
      cta: "Acessar dashboard",
    },
    {
      slug: "analytics-squad-f-tasks",
      title: "Analytics (Squad F) - Tasks",
      category: "GESTÃO",
      description:
        "Planejamento e acompanhamento das tarefas, projetos e entregas do Squad F de Analytics.",
      href: "https://www.wrike.com/shared/gantt#token=eyJ0IjoiZ2MiLCJhbGciOiJIUzUxMiJ9.eyJhIjo3MjI5MzQ4LCJyIjoiVVMiLCJpZCI6MjY3MDQwNSwiZXhwIjoxODIxMDMxNjk3LCJpYXQiOjE3ODk0OTU2OTd9.wJ1IukyObhxa4HpH97W2MHadD67JxsshYcX8owZ-Puhn4ie6if230V2zb2whw7BppVCCPKPmVbUPJvh5AS69zg",
      external: true,
      icon: { type: "lucide", name: "list-checks" },
      cta: "Abrir tarefas",
    },
    {
      slug: "documentacao-ferramentas",
      title: "Documentação de Ferramentas",
      category: "Documentação",
      description:
        "Central de documentação das ferramentas, automações e integrações utilizadas pelos times da QuartaVia.",
      href: "https://quartavia-documentacao.vercel.app/",
      external: true,
      icon: { type: "lucide", name: "book-open" },
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
