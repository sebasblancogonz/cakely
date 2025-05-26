export enum PlanId {
  FREE = 'free',
  BASICO = 'basico',
  PRO = 'pro',
  VITALICIO = 'vitalicio'
}

export const STRIPE_PRICE_ID_TO_PLAN_ID: Record<string, PlanId> = {
  price_1RObViDMvGCWBYUyH37UyLMy: PlanId.BASICO,
  price_1RObViDMvGCWBYUycKZf1H8c: PlanId.BASICO,
  price_1ROdz1DMvGCWBYUyUxkysBfh: PlanId.PRO,
  price_1ROdz1DMvGCWBYUyWavSndVB: PlanId.PRO
};

export interface PlanFeatureConfig {
  maxPedidosMes?: number | 'unlimited';
  maxClientes?: number | 'unlimited';
  maxRecetas?: number | 'unlimited';

  analiticasAvanzadas: boolean;
  multiplesUsuarios: boolean;
  soportePrioritario: boolean;
  integracionesPersonalizadas: boolean;
  calculadoraPresupuesto: boolean;
}

export const PLANS_CONFIG: Record<PlanId, PlanFeatureConfig> = {
  [PlanId.FREE]: {
    maxPedidosMes: 10,
    maxClientes: 20,
    maxRecetas: 5,
    analiticasAvanzadas: false,
    multiplesUsuarios: false,
    soportePrioritario: false,
    integracionesPersonalizadas: false,
    calculadoraPresupuesto: false
  },
  [PlanId.BASICO]: {
    maxPedidosMes: 50,
    maxClientes: 30,
    maxRecetas: 5,
    analiticasAvanzadas: false,
    multiplesUsuarios: false,
    soportePrioritario: false,
    integracionesPersonalizadas: false,
    calculadoraPresupuesto: false
  },
  [PlanId.PRO]: {
    maxPedidosMes: 'unlimited',
    maxClientes: 'unlimited',
    maxRecetas: 'unlimited',
    analiticasAvanzadas: true,
    multiplesUsuarios: true,
    soportePrioritario: true,
    integracionesPersonalizadas: true,
    calculadoraPresupuesto: true
  },
  [PlanId.VITALICIO]: {
    maxPedidosMes: 'unlimited',
    maxClientes: 'unlimited',
    maxRecetas: 'unlimited',
    analiticasAvanzadas: true,
    multiplesUsuarios: true,
    soportePrioritario: true,
    integracionesPersonalizadas: true,
    calculadoraPresupuesto: true
  }
};

export function getPlanConfig(
  stripePriceId?: string | null,
  isLifetime?: boolean | null,
  subscriptionStatus?: string | null
): PlanFeatureConfig {
  if (isLifetime) {
    return PLANS_CONFIG[PlanId.VITALICIO];
  }

  const isActiveOrTrialing =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  if (
    isActiveOrTrialing &&
    stripePriceId &&
    STRIPE_PRICE_ID_TO_PLAN_ID[stripePriceId]
  ) {
    const planId = STRIPE_PRICE_ID_TO_PLAN_ID[stripePriceId];
    return PLANS_CONFIG[planId];
  }

  throw new Error(
    `No plan found for stripePriceId: ${stripePriceId}, isLifetime: ${isLifetime}, subscriptionStatus: ${subscriptionStatus}`
  );
}
