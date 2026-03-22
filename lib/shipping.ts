export type ShippingSettings = {
  freeShippingThreshold: number;
  keralaShippingCharge: number;
  otherStatesShippingCharge: number;
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  freeShippingThreshold: 799,
  keralaShippingCharge: 49,
  otherStatesShippingCharge: 59,
};

function normalizeNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeState(state: string | null | undefined) {
  return state?.trim().toLowerCase() ?? '';
}

export function normalizeShippingSettings(
  value?: Partial<ShippingSettings> | null
): ShippingSettings {
  return {
    freeShippingThreshold: normalizeNumber(
      value?.freeShippingThreshold,
      DEFAULT_SHIPPING_SETTINGS.freeShippingThreshold
    ),
    keralaShippingCharge: normalizeNumber(
      value?.keralaShippingCharge,
      DEFAULT_SHIPPING_SETTINGS.keralaShippingCharge
    ),
    otherStatesShippingCharge: normalizeNumber(
      value?.otherStatesShippingCharge,
      DEFAULT_SHIPPING_SETTINGS.otherStatesShippingCharge
    ),
  };
}

export function isKeralaState(state: string | null | undefined) {
  const normalized = normalizeState(state);
  return normalized === 'kerala' || normalized === 'kl';
}

export function calculateShippingCharge(input: {
  subtotal: number;
  discount?: number;
  state?: string | null;
  settings?: Partial<ShippingSettings> | null;
}) {
  const settings = normalizeShippingSettings(input.settings);
  const merchandiseTotal = Math.max(0, input.subtotal - (input.discount || 0));

  if (merchandiseTotal >= settings.freeShippingThreshold) {
    return 0;
  }

  if (!normalizeState(input.state)) {
    return null;
  }

  return isKeralaState(input.state)
    ? settings.keralaShippingCharge
    : settings.otherStatesShippingCharge;
}
