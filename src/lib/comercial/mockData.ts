import type { ComercialDashboardData } from '../../types/comercial';

/** Estado vazio enquanto as views Supabase não estão conectadas. */
export function emptyComercialData(): ComercialDashboardData {
  return {
    metrics: {
      reunioesAgendadas: 0,
      novosAgendamentos: 0,
      reunioesRealizadas: 0,
      reunioesFuturas: 0,
      noShow: 0,
    },
    noShowTypes: [],
    income: [
      { faixa: 'Acima de 20k', quantidade: 0 },
      { faixa: 'De 15k à 20k', quantidade: 0 },
      { faixa: 'Nao informado', quantidade: 0 },
    ],
    incomeByDay: [],
    meetings: [],
    validationRows: [],
    generatedAt: new Date().toISOString(),
  };
}
