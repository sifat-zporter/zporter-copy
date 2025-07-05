export interface CreateSponsor {
  playerId: string;
  userId: string;
  cost_of_training: number;
  currency_cost_of_training?: string;
  payment_type_cost_of_training?: string;
  limit_cost: number;
  currency_limit_cost?: string;
  payment_type_limit_cost?: string;
  paymentMethodId: string;
}

export interface Sponsor {
  sum: number;
  exchange: string;
  variable: string;
  uploadImageUrl: string;
  message: string;
}