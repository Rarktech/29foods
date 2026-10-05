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

/** A page a top-up may send the customer back to — never an arbitrary URL from the request. */
export type TopupReturnPath = "/account" | "/cart" | `/plans/${string}/setup`;

const PLAN_SETUP_PATH = /^\/plans\/(1_week|2_weeks|1_month)\/setup$/;

export function isTopupReturnPath(path: unknown): path is TopupReturnPath {
  return path === "/account" || path === "/cart" || (typeof path === "string" && PLAN_SETUP_PATH.test(path));
}
