export type CustomerAddressInput = {
  fullName: string;
  phone: string;
  addressLine: string;
  apartment?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export type CustomerAddress = CustomerAddressInput & {
  id: string;
  customerId: string;
  createdAt: string;
};

export function normalizeAddressInput(input: CustomerAddressInput): CustomerAddressInput {
  return {
    fullName: input.fullName.trim().replace(/\s+/g, ' '),
    phone: input.phone.trim().replace(/\s+/g, ' '),
    addressLine: input.addressLine.trim(),
    apartment: input.apartment?.trim() || '',
    city: input.city.trim(),
    state: input.state.trim(),
    pincode: input.pincode.trim(),
    isDefault: Boolean(input.isDefault),
  };
}

export function splitAddressFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  const [firstName = '', ...rest] = normalized.split(' ');

  return {
    firstName,
    lastName: rest.join(' '),
  };
}
