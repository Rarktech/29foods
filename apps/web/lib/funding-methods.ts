/**
 * Ways a customer can fund their wallet. The funding sheet lists every entry here and
 * /api/wallet/topup only accepts an `enabled` id — so adding a provider means one entry
 * here plus one branch in that route that returns its checkout URL. Shared by the sheet
 * (client) and the route (server), so keep it free of server-only imports.
 */
export type FundingMethodId = "flutterwave";

export interface FundingMethod {
  id: FundingMethodId;
  label: string;
  description: string;
  /** Short badge text shown in the method's icon tile. */
  badge: string;
  enabled: boolean;
}

export const FUNDING_METHODS: FundingMethod[] = [
  {
    id: "flutterwave",
    label: "Card, bank transfer or USSD",
    description: "Secure checkout via Flutterwave",
    badge: "PAY",
    enabled: true,
  },
];

export function isEnabledFundingMethod(id: string): id is FundingMethodId {
  return FUNDING_METHODS.some((m) => m.id === id && m.enabled);
}

/** Pages a top-up may send the customer back to — never an arbitrary URL from the request. */
export const TOPUP_RETURN_PATHS = ["/account", "/cart"] as const;
export type TopupReturnPath = (typeof TOPUP_RETURN_PATHS)[number];
