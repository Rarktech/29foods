export interface PromoRow {
  code: string;
  discount: string;
  uses: number;
  limit: number;
  expiry: string;
  status: "ACTIVE" | "EXPIRED" | "SCHEDULED";
  statusClass: string;
}

export const PROMOTIONS: PromoRow[] = [
  { code: "WELCOME10", discount: "10% off", uses: 214, limit: 500, expiry: "No expiry", status: "ACTIVE", statusClass: "text-success bg-success-bg" },
  { code: "EXAMWEEK", discount: "₦500 off", uses: 132, limit: 300, expiry: "Oct 4, 2026", status: "ACTIVE", statusClass: "text-success bg-success-bg" },
  { code: "PEACELODGE", discount: "15% off", uses: 58, limit: 100, expiry: "Sep 30, 2026", status: "ACTIVE", statusClass: "text-success bg-success-bg" },
  { code: "FRESHERS25", discount: "₦1,000 off", uses: 300, limit: 300, expiry: "Sep 10, 2026", status: "EXPIRED", statusClass: "text-muted bg-border" },
  { code: "RAINYDAY", discount: "20% off", uses: 0, limit: 200, expiry: "Starts Oct 1, 2026", status: "SCHEDULED", statusClass: "text-warning bg-warning/15" },
  { code: "REFER5", discount: "₦300 off", uses: 41, limit: 250, expiry: "No expiry", status: "ACTIVE", statusClass: "text-success bg-success-bg" },
];

export interface PromoRedemption {
  customer: string;
  orderId: string;
  date: string;
  discountApplied: string;
}
export interface PromoRateBar {
  label: string;
  value: number;
}
export interface PromoDetail {
  code: string;
  discount: string;
  uses: number;
  limit: number;
  totalDiscount: string;
  validWindow: string;
  status: PromoRow["status"];
  statusClass: string;
  rateBars: PromoRateBar[];
  redemptions: PromoRedemption[];
}

export const PROMO_DETAILS: Record<string, PromoDetail> = {
  WELCOME10: {
    code: "WELCOME10", discount: "10% off", uses: 214, limit: 500, totalDiscount: "₦64,800", validWindow: "No expiry",
    status: "ACTIVE", statusClass: "text-success bg-success-bg",
    rateBars: [
      { label: "W1", value: 24 }, { label: "W2", value: 31 }, { label: "W3", value: 28 },
      { label: "W4", value: 40 }, { label: "W5", value: 45 }, { label: "W6", value: 46 },
    ],
    redemptions: [
      { customer: "Funke Adeyemi", orderId: "#29F-1040", date: "Today", discountApplied: "₦340" },
      { customer: "Tobi Alabi", orderId: "#29F-1033", date: "Yesterday", discountApplied: "₦260" },
      { customer: "Chiamaka Nnadi", orderId: "#29F-1021", date: "2 days ago", discountApplied: "₦270" },
      { customer: "David Okon", orderId: "#29F-1008", date: "3 days ago", discountApplied: "₦420" },
      { customer: "Uche Igwe", orderId: "#29F-0987", date: "5 days ago", discountApplied: "₦320" },
      { customer: "Ngozi Eze", orderId: "#29F-0960", date: "1 week ago", discountApplied: "₦210" },
    ],
  },
  EXAMWEEK: {
    code: "EXAMWEEK", discount: "₦500 off", uses: 132, limit: 300, totalDiscount: "₦66,000", validWindow: "Until Oct 4, 2026",
    status: "ACTIVE", statusClass: "text-success bg-success-bg",
    rateBars: [
      { label: "W1", value: 12 }, { label: "W2", value: 18 }, { label: "W3", value: 21 },
      { label: "W4", value: 26 }, { label: "W5", value: 29 }, { label: "W6", value: 26 },
    ],
    redemptions: [
      { customer: "Emeka Obi", orderId: "#29F-1036", date: "Today", discountApplied: "₦500" },
      { customer: "Ada Okafor", orderId: "#29F-1027", date: "Yesterday", discountApplied: "₦500" },
      { customer: "Chidi Nwosu", orderId: "#29F-1014", date: "2 days ago", discountApplied: "₦500" },
      { customer: "Fatima Sani", orderId: "#29F-0999", date: "4 days ago", discountApplied: "₦500" },
    ],
  },
  PEACELODGE: {
    code: "PEACELODGE", discount: "15% off", uses: 58, limit: 100, totalDiscount: "₦27,900", validWindow: "Until Sep 30, 2026",
    status: "ACTIVE", statusClass: "text-success bg-success-bg",
    rateBars: [
      { label: "W1", value: 6 }, { label: "W2", value: 9 }, { label: "W3", value: 11 },
      { label: "W4", value: 13 }, { label: "W5", value: 10 }, { label: "W6", value: 9 },
    ],
    redemptions: [
      { customer: "Ngozi Eze", orderId: "#29F-1039", date: "Today", discountApplied: "₦630" },
      { customer: "Ada Okafor", orderId: "#29F-1019", date: "3 days ago", discountApplied: "₦480" },
      { customer: "Funke Adeyemi", orderId: "#29F-0961", date: "1 week ago", discountApplied: "₦510" },
    ],
  },
  FRESHERS25: {
    code: "FRESHERS25", discount: "₦1,000 off", uses: 300, limit: 300, totalDiscount: "₦300,000", validWindow: "Expired Sep 10, 2026",
    status: "EXPIRED", statusClass: "text-muted bg-border",
    rateBars: [
      { label: "W1", value: 42 }, { label: "W2", value: 68 }, { label: "W3", value: 90 },
      { label: "W4", value: 100 }, { label: "W5", value: 0 }, { label: "W6", value: 0 },
    ],
    redemptions: [
      { customer: "Tobi Alabi", orderId: "#29F-0912", date: "Sep 10, 2026", discountApplied: "₦1,000" },
      { customer: "David Okon", orderId: "#29F-0905", date: "Sep 9, 2026", discountApplied: "₦1,000" },
      { customer: "Chiamaka Nnadi", orderId: "#29F-0891", date: "Sep 8, 2026", discountApplied: "₦1,000" },
    ],
  },
  RAINYDAY: {
    code: "RAINYDAY", discount: "20% off", uses: 0, limit: 200, totalDiscount: "₦0", validWindow: "Starts Oct 1, 2026",
    status: "SCHEDULED", statusClass: "text-warning bg-warning/15",
    rateBars: [
      { label: "W1", value: 0 }, { label: "W2", value: 0 }, { label: "W3", value: 0 },
      { label: "W4", value: 0 }, { label: "W5", value: 0 }, { label: "W6", value: 0 },
    ],
    redemptions: [],
  },
  REFER5: {
    code: "REFER5", discount: "₦300 off", uses: 41, limit: 250, totalDiscount: "₦12,300", validWindow: "No expiry",
    status: "ACTIVE", statusClass: "text-success bg-success-bg",
    rateBars: [
      { label: "W1", value: 4 }, { label: "W2", value: 6 }, { label: "W3", value: 8 },
      { label: "W4", value: 9 }, { label: "W5", value: 7 }, { label: "W6", value: 7 },
    ],
    redemptions: [
      { customer: "Kelechi Obi", orderId: "#29F-1031", date: "Yesterday", discountApplied: "₦300" },
      { customer: "Sadiq Musa", orderId: "#29F-1002", date: "4 days ago", discountApplied: "₦300" },
    ],
  },
};
