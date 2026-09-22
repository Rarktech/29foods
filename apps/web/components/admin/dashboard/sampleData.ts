// Exact sample data ported from AdminDashboardWebDark.dc.html's Component class —
// this batch is visual-only (no Supabase), matching the reference's own local-state mockup.
import type {
  BusinessHourRow,
  CustomerDetail,
  DeliveryZoneRow,
  DishSection,
  MenuAddon,
  MenuCombo,
  OrderDetail,
  StaffRow,
  Subscriber,
} from "./types";

export const TREND_RAW = [
  { label: "Mon", value: 38 },
  { label: "Tue", value: 41 },
  { label: "Wed", value: 35 },
  { label: "Thu", value: 47 },
  { label: "Fri", value: 52 },
  { label: "Sat", value: 58 },
  { label: "Sun", value: 47 },
];

export const PAYMENT_SPLIT = [
  { label: "Card", pct: 62, color: "rgb(var(--color-accent))" },
  { label: "Bank transfer", pct: 38, color: "var(--rating-icon)" },
];

export const ORDER_VALUE_BUCKETS = [
  { label: "< ₦2,000", pct: 18, count: 56 },
  { label: "₦2,000–4,000", pct: 62, count: 194 },
  { label: "₦4,000–6,000", pct: 28, count: 44 },
  { label: "₦6,000+", pct: 12, count: 18 },
];

export const TOP_DISHES = [
  { name: "Party Jollof + Chicken", count: 96, revenue: "₦326,400" },
  { name: "Ofada Special", count: 58, revenue: "₦185,600" },
  { name: "Peppered Chicken", count: 44, revenue: "₦92,400" },
  { name: "Garlic Fried Rice", count: 31, revenue: "₦83,700" },
];

export interface OrderRawRow {
  id: string;
  customer: string;
  room: string;
  items: string;
  total: string;
  status: string;
  dotColor: string;
  badgeBg: string;
  /** Mobile Orders card uses its own literal per-status accent, independent of the desktop dotColor. */
  mobileDotColor: string;
  mobileDotRing: string;
  lineItems: { name: string; price: string }[];
  timeline: { label: string; time: string; color: string }[];
}

export const ORDERS_RAW: OrderRawRow[] = [
  {
    id: "#29F-1042",
    customer: "Ada Okafor",
    room: "Peace Lodge Rm 12",
    items: "Party Jollof + Chicken, Fanta",
    total: "₦4,000",
    status: "ON THE WAY",
    dotColor: "var(--rating-icon)",
    badgeBg: "#2A2010",
    mobileDotColor: "#FFB25C",
    mobileDotRing: "rgba(255,178,92,0.25)",
    lineItems: [
      { name: "Party Jollof + Chicken", price: "₦3,400" },
      { name: "Fanta 35cl", price: "₦300" },
    ],
    timeline: [
      { label: "Order placed", time: "7:02pm", color: "rgb(var(--color-success))" },
      { label: "Preparing", time: "7:05pm", color: "rgb(var(--color-success))" },
      { label: "Rider assigned", time: "7:18pm", color: "rgb(var(--color-success))" },
      { label: "On the way", time: "7:24pm", color: "var(--rating-icon)" },
    ],
  },
  {
    id: "#29F-1041",
    customer: "Chidi Nwosu",
    room: "Peace Lodge Rm 14",
    items: "Ofada Special",
    total: "₦3,500",
    status: "PREPARING",
    dotColor: "#6FA8FF",
    badgeBg: "#151F2E",
    mobileDotColor: "#5FA8FF",
    mobileDotRing: "rgba(95,168,255,0.25)",
    lineItems: [{ name: "Ofada Special", price: "₦3,200" }],
    timeline: [
      { label: "Order placed", time: "7:10pm", color: "rgb(var(--color-success))" },
      { label: "Preparing", time: "7:12pm", color: "var(--rating-icon)" },
      { label: "Rider assigned", time: "—", color: "#3A332C" },
      { label: "On the way", time: "—", color: "#3A332C" },
    ],
  },
  {
    id: "#29F-1039",
    customer: "Ngozi Eze",
    room: "Hilltop Hostel B4",
    items: "Peppered Chicken ×2",
    total: "₦4,500",
    status: "RIDER ASSIGNED",
    dotColor: "var(--rating-icon)",
    badgeBg: "#2A2010",
    mobileDotColor: "#F0C989",
    mobileDotRing: "rgba(240,201,137,0.3)",
    lineItems: [{ name: "Peppered Chicken ×2", price: "₦4,200" }],
    timeline: [
      { label: "Order placed", time: "6:48pm", color: "rgb(var(--color-success))" },
      { label: "Preparing", time: "6:50pm", color: "rgb(var(--color-success))" },
      { label: "Rider assigned", time: "7:02pm", color: "var(--rating-icon)" },
      { label: "On the way", time: "—", color: "#3A332C" },
    ],
  },
  {
    id: "#29F-1038",
    customer: "Emeka Obi",
    room: "Unity Hall Rm 8",
    items: "Garlic Fried Rice, Fanta",
    total: "₦3,300",
    status: "DELAYED",
    dotColor: "var(--admin-nav-active-text)",
    badgeBg: "var(--admin-danger-bg)",
    mobileDotColor: "#E0281F",
    mobileDotRing: "rgba(224,40,31,0.25)",
    lineItems: [
      { name: "Garlic Fried Rice", price: "₦2,700" },
      { name: "Fanta 35cl", price: "₦300" },
    ],
    timeline: [
      { label: "Order placed", time: "6:30pm", color: "rgb(var(--color-success))" },
      { label: "Preparing", time: "6:33pm", color: "rgb(var(--color-success))" },
      { label: "Rider assigned", time: "6:50pm", color: "rgb(var(--color-success))" },
      { label: "Delayed — 15+ min", time: "7:10pm", color: "var(--admin-nav-active-text)" },
    ],
  },
];

export const DISH_SECTIONS_BASE: DishSection[] = [
  {
    sectionTitle: "Rice dishes",
    items: [
      { id: "jollof", name: "Party Jollof", price: "₦2,900", category: "Rice" },
      { id: "native", name: "Native Jollof", price: "₦2,600", category: "Rice" },
      { id: "ofada", name: "Ofada Special", price: "₦3,200", category: "Rice" },
      { id: "garlic", name: "Garlic Fried Rice", price: "₦2,700", category: "Rice" },
    ],
  },
  {
    sectionTitle: "Proteins",
    items: [
      { id: "chicken", name: "Grilled Chicken", price: "₦1,800", category: "Protein" },
      { id: "peppered", name: "Peppered Chicken", price: "₦2,100", category: "Protein" },
      { id: "assortedMeat", name: "Assorted Meat Dish", price: "₦2,400", category: "Protein" },
    ],
  },
  {
    sectionTitle: "Swallow & soups",
    items: [
      { id: "poundedYamEgusi", name: "Pounded Yam & Egusi", price: "₦2,800", category: "Swallow" },
      { id: "semoOgbono", name: "Semo & Ogbono", price: "₦2,600", category: "Swallow" },
    ],
  },
  {
    sectionTitle: "Drinks",
    items: [
      { id: "fanta", name: "Soft drink (35cl)", price: "₦300", category: "Drinks" },
      { id: "zobo", name: "Zobo (50cl)", price: "₦400", category: "Drinks" },
      { id: "chapman", name: "Chapman (50cl)", price: "₦600", category: "Drinks" },
    ],
  },
];

export const COMBO_BASE: MenuCombo[] = [
  { id: "comboJollofChickenDrink", name: "Jollof + Chicken + Drink Combo", includes: "Party Jollof, Grilled Chicken, Soft drink (35cl)", originalPrice: "₦5,000", comboPrice: "₦4,300" },
  { id: "comboStudentSpecial", name: "Student Special", includes: "Native Jollof, Peppered Chicken, Soft drink (35cl)", originalPrice: "₦5,000", comboPrice: "₦4,200" },
  { id: "comboSwallowDuo", name: "Swallow Duo Combo", includes: "Pounded Yam & Egusi, Semo & Ogbono (half portions)", originalPrice: "₦5,400", comboPrice: "₦4,700" },
  { id: "comboOfadaAssorted", name: "Ofada + Assorted Combo", includes: "Ofada Special, Assorted Meat Dish, Zobo (50cl)", originalPrice: "₦6,000", comboPrice: "₦5,200" },
];

export const ADDON_BASE: MenuAddon[] = [
  { id: "addonExtraProtein", name: "Extra protein (+₦500)", price: "+₦500" },
  { id: "addonExtraPlantain", name: "Extra plantain (+₦300)", price: "+₦300" },
  { id: "addonExtraSauce", name: "Extra sauce (+₦150)", price: "+₦150" },
  { id: "addonBottledWater", name: "Bottled water (+₦200)", price: "+₦200" },
];

export const SUBSCRIBERS_RAW: Subscriber[] = [
  {
    id: "ada", initial: "A", name: "Ada Okafor", plan: "2 Weeks", room: "Peace Lodge Rm 12", daysLeft: "9 days left", lifetimeSpend: "₦134,200",
    history: [
      { item: "Party Jollof + Chicken, Fanta", date: "Today, 7:02pm", total: "₦3,700" },
      { item: "Ofada Special", date: "3 days ago", total: "₦3,200" },
      { item: "Peppered Chicken", date: "Last week", total: "₦2,100" },
    ],
  },
  {
    id: "chidi", initial: "C", name: "Chidi Nwosu", plan: "1 Month", room: "Peace Lodge Rm 14", daysLeft: "22 days left", lifetimeSpend: "₦91,500",
    history: [
      { item: "Ofada Special", date: "Today, 7:10pm", total: "₦3,200" },
      { item: "Native Jollof", date: "2 days ago", total: "₦2,600" },
    ],
  },
  {
    id: "ngozi", initial: "N", name: "Ngozi Eze", plan: "1 Week", room: "Hilltop Hostel B4", daysLeft: "3 days left", lifetimeSpend: "₦12,600",
    history: [{ item: "Peppered Chicken ×2", date: "Today, 6:48pm", total: "₦4,200" }],
  },
  {
    id: "emeka", initial: "E", name: "Emeka Obi", plan: "2 Weeks", room: "Unity Hall Rm 8", daysLeft: "12 days left", lifetimeSpend: "₦35,900",
    history: [{ item: "Garlic Fried Rice, Fanta", date: "Today, 6:30pm", total: "₦3,000" }],
  },
  {
    id: "funke", initial: "F", name: "Funke Adeyemi", plan: "1 Month", room: "Peace Lodge Rm 20", daysLeft: "27 days left", lifetimeSpend: "₦120,300",
    history: [{ item: "Party Jollof + Chicken", date: "Yesterday", total: "₦3,400" }],
  },
];

export const BUSINESS_HOURS: BusinessHourRow[] = [
  { day: "Monday", hours: "10:00am – 10:00pm" },
  { day: "Tuesday", hours: "10:00am – 10:00pm" },
  { day: "Wednesday", hours: "10:00am – 10:00pm" },
  { day: "Thursday", hours: "10:00am – 10:00pm" },
  { day: "Friday", hours: "10:00am – 11:00pm" },
  { day: "Saturday", hours: "11:00am – 11:00pm" },
  { day: "Sunday", hours: "12:00pm – 9:00pm" },
];

export const DELIVERY_ZONES: DeliveryZoneRow[] = [
  { name: "Peace Lodge", fee: "₦300" },
  { name: "Hilltop Hostel", fee: "₦400" },
  { name: "Unity Hall", fee: "₦350" },
  { name: "Off-campus (≤2km)", fee: "₦600" },
];

export const STAFF: StaffRow[] = [
  { initial: "R", name: "Richard", role: "Owner" },
  { initial: "T", name: "Tolu Bankole", role: "Kitchen lead" },
  { initial: "S", name: "Sadiq Musa", role: "Rider coordinator" },
  { initial: "K", name: "Kemi Alao", role: "Support" },
];

const DELIVERED = { status: "DELIVERED", statusClass: "text-success bg-success-bg" };
const ON_THE_WAY = { status: "ON THE WAY", statusClass: "text-warning bg-warning/15" };

export const CUSTOMER_DETAILS: Record<string, CustomerDetail> = {
  ada: {
    id: "ada", initial: "A", name: "Ada Okafor", phone: "0803 214 7765", address: "Peace Lodge, Room 12",
    joinDate: "Feb 14, 2026", plan: "2 Weeks — Active", planActive: true,
    tag: "VIP — 40+ orders", tagClass: "text-accent bg-accent-tint",
    orderCount: 43, avgOrder: "₦3,120", lifetimeSpend: "₦134,200",
    feedback: [
      { orderId: "#29F-0961", dish: "Native Jollof", reason: "Cold food", status: "REPLACEMENT SENT", statusClass: "text-success bg-success-bg", date: "2 weeks ago" },
    ],
    history: [
      { id: "#29F-1042", date: "Today, 7:02pm", dish: "Party Jollof + Chicken, Fanta", amount: "₦4,000", ...ON_THE_WAY },
      { id: "#29F-1019", date: "3 days ago", dish: "Ofada Special", amount: "₦3,200", ...DELIVERED },
      { id: "#29F-0994", date: "1 week ago", dish: "Peppered Chicken", amount: "₦2,100", ...DELIVERED },
      { id: "#29F-0961", date: "2 weeks ago", dish: "Native Jollof, Fanta", amount: "₦2,900", ...DELIVERED },
      { id: "#29F-0930", date: "3 weeks ago", dish: "Party Jollof + Chicken", amount: "₦3,400", ...DELIVERED },
      { id: "#29F-0891", date: "4 weeks ago", dish: "Garlic Fried Rice", amount: "₦2,700", ...DELIVERED },
      { id: "#29F-0844", date: "5 weeks ago", dish: "Ofada Special, Fanta", amount: "₦3,500", ...DELIVERED },
      { id: "#29F-0799", date: "6 weeks ago", dish: "Peppered Chicken ×2", amount: "₦4,200", ...DELIVERED },
    ],
  },
  chidi: {
    id: "chidi", initial: "C", name: "Chidi Nwosu", phone: "0806 552 3391", address: "Peace Lodge, Room 14",
    joinDate: "Apr 2, 2026", plan: "1 Month — Active", planActive: true,
    tag: "Regular — 20+ orders", tagClass: "text-admin-nav-active bg-accent-tint",
    orderCount: 27, avgOrder: "₦3,390", lifetimeSpend: "₦91,500",
    feedback: [],
    history: [
      { id: "#29F-1041", date: "Today, 7:10pm", dish: "Ofada Special", amount: "₦3,500", ...ON_THE_WAY },
      { id: "#29F-1015", date: "2 days ago", dish: "Native Jollof", amount: "₦2,600", ...DELIVERED },
      { id: "#29F-0980", date: "1 week ago", dish: "Peppered Chicken", amount: "₦2,100", ...DELIVERED },
      { id: "#29F-0932", date: "3 weeks ago", dish: "Party Jollof + Chicken, Fanta", amount: "₦3,700", ...DELIVERED },
      { id: "#29F-0870", date: "5 weeks ago", dish: "Garlic Fried Rice", amount: "₦2,700", ...DELIVERED },
    ],
  },
  ngozi: {
    id: "ngozi", initial: "N", name: "Ngozi Eze", phone: "0813 907 4420", address: "Hilltop Hostel, Room B4",
    joinDate: "Sep 8, 2026", plan: "1 Week — Active", planActive: true,
    tag: "New customer", tagClass: "text-muted bg-admin-row-hover",
    orderCount: 4, avgOrder: "₦3,150", lifetimeSpend: "₦12,600",
    feedback: [],
    history: [
      { id: "#29F-1039", date: "Today, 6:48pm", dish: "Peppered Chicken ×2", amount: "₦4,500", ...ON_THE_WAY },
      { id: "#29F-1002", date: "3 days ago", dish: "Native Jollof", amount: "₦2,600", ...DELIVERED },
      { id: "#29F-0985", date: "5 days ago", dish: "Ofada Special", amount: "₦3,200", ...DELIVERED },
      { id: "#29F-0961", date: "1 week ago", dish: "Garlic Fried Rice", amount: "₦2,600", ...DELIVERED },
    ],
  },
  emeka: {
    id: "emeka", initial: "E", name: "Emeka Obi", phone: "0902 118 6654", address: "Unity Hall, Room 8",
    joinDate: "May 20, 2026", plan: "2 Weeks — Active", planActive: true,
    tag: "Regular — 20+ orders", tagClass: "text-admin-nav-active bg-accent-tint",
    orderCount: 22, avgOrder: "₦3,270", lifetimeSpend: "₦35,900",
    feedback: [
      { orderId: "#29F-1038", dish: "Garlic Fried Rice", reason: "Cold food", status: "REPLACEMENT SENT", statusClass: "text-success bg-success-bg", date: "Today" },
    ],
    history: [
      { id: "#29F-1038", date: "Today, 6:30pm", dish: "Garlic Fried Rice, Fanta", amount: "₦3,300", ...ON_THE_WAY },
      { id: "#29F-1008", date: "4 days ago", dish: "Ofada Special", amount: "₦3,200", ...DELIVERED },
      { id: "#29F-0972", date: "2 weeks ago", dish: "Peppered Chicken", amount: "₦2,100", ...DELIVERED },
      { id: "#29F-0918", date: "4 weeks ago", dish: "Party Jollof + Chicken", amount: "₦3,400", ...DELIVERED },
    ],
  },
  funke: {
    id: "funke", initial: "F", name: "Funke Adeyemi", phone: "0705 331 8827", address: "Peace Lodge, Room 20",
    joinDate: "Jan 30, 2026", plan: "1 Month — Active", planActive: true,
    tag: "VIP — 40+ orders", tagClass: "text-accent bg-accent-tint",
    orderCount: 51, avgOrder: "₦2,360", lifetimeSpend: "₦120,300",
    feedback: [],
    history: [
      { id: "#29F-1030", date: "Yesterday", dish: "Party Jollof + Chicken", amount: "₦3,400", ...DELIVERED },
      { id: "#29F-1005", date: "1 week ago", dish: "Native Jollof, Fanta", amount: "₦2,900", ...DELIVERED },
      { id: "#29F-0961", date: "2 weeks ago", dish: "Ofada Special", amount: "₦3,200", ...DELIVERED },
      { id: "#29F-0899", date: "4 weeks ago", dish: "Peppered Chicken", amount: "₦2,100", ...DELIVERED },
      { id: "#29F-0830", date: "6 weeks ago", dish: "Garlic Fried Rice", amount: "₦2,700", ...DELIVERED },
    ],
  },
};

const STEP_DONE = "bg-success";
const STEP_CURRENT = "bg-warning";
const STEP_PENDING = "bg-border";
const STEP_DANGER = "bg-accent";

export const ORDER_DETAILS: Record<string, OrderDetail> = {
  "#29F-1042": {
    id: "#29F-1042", customer: "Ada Okafor", customerId: "ada", phone: "0803 214 7765",
    address: "Peace Lodge, Room 12, Behind FUAFIA Gate, Abakaliki",
    status: "ON THE WAY", statusClass: "text-warning bg-warning/15",
    lineItems: [
      { name: "Party Jollof + Chicken", price: "₦3,400" },
      { name: "Fanta 35cl", price: "₦300" },
    ],
    subtotal: "₦3,700", deliveryFee: "₦300", total: "₦4,000", paymentMethod: "Card",
    rider: { initial: "S", name: "Sadiq Musa", phone: "0806 552 1093", status: "ON THE WAY", statusClass: "text-warning bg-warning/15" },
    timeline: [
      { label: "Order placed", time: "Today, 7:02pm", colorClass: STEP_DONE },
      { label: "Confirmed", time: "Today, 7:03pm", colorClass: STEP_DONE },
      { label: "Prep started", time: "Today, 7:05pm", colorClass: STEP_DONE },
      { label: "Prep ready", time: "Today, 7:16pm", colorClass: STEP_DONE },
      { label: "Rider assigned — Sadiq Musa", time: "Today, 7:18pm", colorClass: STEP_DONE },
      { label: "Picked up", time: "Today, 7:22pm", colorClass: STEP_DONE },
      { label: "On the way", time: "Today, 7:24pm", colorClass: STEP_CURRENT },
    ],
    pastOrders: [
      { id: "#29F-1019", items: "Ofada Special", date: "3 days ago", total: "₦3,200" },
      { id: "#29F-0994", items: "Peppered Chicken", date: "1 week ago", total: "₦2,100" },
      { id: "#29F-0961", items: "Native Jollof, Fanta", date: "2 weeks ago", total: "₦2,900" },
      { id: "#29F-0930", items: "Party Jollof + Chicken", date: "3 weeks ago", total: "₦3,400" },
    ],
  },
  "#29F-1041": {
    id: "#29F-1041", customer: "Chidi Nwosu", customerId: "chidi", phone: "0806 552 3391",
    address: "Peace Lodge, Room 14, Behind FUAFIA Gate, Abakaliki",
    status: "PREPARING", statusClass: "text-[#6FA8FF] bg-[#151F2E] dark:text-[#6FA8FF] dark:bg-[#151F2E]",
    lineItems: [{ name: "Ofada Special", price: "₦3,200" }],
    subtotal: "₦3,200", deliveryFee: "₦300", total: "₦3,500", paymentMethod: "Bank transfer",
    rider: null,
    timeline: [
      { label: "Order placed", time: "Today, 7:10pm", colorClass: STEP_DONE },
      { label: "Confirmed", time: "Today, 7:11pm", colorClass: STEP_DONE },
      { label: "Prep started", time: "Today, 7:12pm", colorClass: STEP_CURRENT },
      { label: "Prep ready", time: "—", colorClass: STEP_PENDING },
      { label: "Rider assigned", time: "—", colorClass: STEP_PENDING },
      { label: "Picked up", time: "—", colorClass: STEP_PENDING },
      { label: "On the way", time: "—", colorClass: STEP_PENDING },
    ],
    pastOrders: [
      { id: "#29F-1015", items: "Native Jollof", date: "2 days ago", total: "₦2,600" },
      { id: "#29F-0980", items: "Peppered Chicken", date: "1 week ago", total: "₦2,100" },
      { id: "#29F-0932", items: "Party Jollof + Chicken, Fanta", date: "3 weeks ago", total: "₦3,700" },
    ],
  },
  "#29F-1039": {
    id: "#29F-1039", customer: "Ngozi Eze", customerId: "ngozi", phone: "0813 907 4420",
    address: "Hilltop Hostel, Room B4, Off Presco Road, Abakaliki",
    status: "RIDER ASSIGNED", statusClass: "text-warning bg-warning/15",
    lineItems: [{ name: "Peppered Chicken ×2", price: "₦4,200" }],
    subtotal: "₦4,200", deliveryFee: "₦300", total: "₦4,500", paymentMethod: "Card",
    rider: { initial: "T", name: "Tochukwu Eze", phone: "0812 340 5561", status: "ASSIGNED", statusClass: "text-warning bg-warning/15" },
    timeline: [
      { label: "Order placed", time: "Today, 6:48pm", colorClass: STEP_DONE },
      { label: "Confirmed", time: "Today, 6:49pm", colorClass: STEP_DONE },
      { label: "Prep started", time: "Today, 6:50pm", colorClass: STEP_DONE },
      { label: "Prep ready", time: "Today, 7:00pm", colorClass: STEP_DONE },
      { label: "Rider assigned — Tochukwu Eze", time: "Today, 7:02pm", colorClass: STEP_CURRENT },
      { label: "Picked up", time: "—", colorClass: STEP_PENDING },
      { label: "On the way", time: "—", colorClass: STEP_PENDING },
    ],
    pastOrders: [
      { id: "#29F-1002", items: "Native Jollof", date: "3 days ago", total: "₦2,600" },
      { id: "#29F-0985", items: "Ofada Special", date: "5 days ago", total: "₦3,200" },
      { id: "#29F-0961", items: "Garlic Fried Rice", date: "1 week ago", total: "₦2,600" },
    ],
  },
  "#29F-1038": {
    id: "#29F-1038", customer: "Emeka Obi", customerId: "emeka", phone: "0902 118 6654",
    address: "Unity Hall, Room 8, Ebonyi State University Road, Abakaliki",
    status: "DELAYED", statusClass: "text-accent bg-admin-danger",
    lineItems: [
      { name: "Garlic Fried Rice", price: "₦2,700" },
      { name: "Fanta 35cl", price: "₦300" },
    ],
    subtotal: "₦3,000", deliveryFee: "₦300", total: "₦3,300", paymentMethod: "Card",
    rider: { initial: "K", name: "Kelechi Obi", phone: "0703 822 9910", status: "DELAYED", statusClass: "text-accent bg-admin-danger" },
    timeline: [
      { label: "Order placed", time: "Today, 6:30pm", colorClass: STEP_DONE },
      { label: "Confirmed", time: "Today, 6:31pm", colorClass: STEP_DONE },
      { label: "Prep started", time: "Today, 6:33pm", colorClass: STEP_DONE },
      { label: "Prep ready", time: "Today, 6:45pm", colorClass: STEP_DONE },
      { label: "Rider assigned — Kelechi Obi", time: "Today, 6:50pm", colorClass: STEP_DONE },
      { label: "Picked up", time: "Today, 6:54pm", colorClass: STEP_DONE },
      { label: "Delayed — 15+ min", time: "Today, 7:10pm", colorClass: STEP_DANGER },
    ],
    pastOrders: [
      { id: "#29F-1008", items: "Ofada Special", date: "4 days ago", total: "₦3,200" },
      { id: "#29F-0972", items: "Peppered Chicken", date: "2 weeks ago", total: "₦2,100" },
      { id: "#29F-0918", items: "Party Jollof + Chicken", date: "4 weeks ago", total: "₦3,400" },
    ],
  },
};

export function parseNaira(s: string) {
  return Number(String(s).replace(/[₦,]/g, ""));
}
export function formatNaira(n: number) {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}
export function discountBadgeLabel(discount: { type: "percent" | "flat"; value: number }) {
  return discount.type === "percent" ? `${discount.value}% OFF` : `${formatNaira(discount.value)} OFF`;
}
export function applyDiscount(priceStr: string, discount: { type: "percent" | "flat"; value: number } | undefined) {
  const base = parseNaira(priceStr);
  if (!discount) return base;
  if (discount.type === "percent") return base - (base * discount.value) / 100;
  return Math.max(0, base - discount.value);
}
