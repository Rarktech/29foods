"use client";

import { useState } from "react";

interface CatalogItem {
  id: string;
  name: string;
  price: string; // formatted, e.g. "₦2,900" or "+₦500"
}
interface CatalogSection {
  title: string;
  items: CatalogItem[];
}

const CATALOG: CatalogSection[] = [
  {
    title: "Rice dishes",
    items: [
      { id: "jollof", name: "Party Jollof", price: "₦2,900" },
      { id: "native", name: "Native Jollof", price: "₦2,600" },
      { id: "ofada", name: "Ofada Special", price: "₦3,200" },
      { id: "garlic", name: "Garlic Fried Rice", price: "₦2,700" },
    ],
  },
  {
    title: "Proteins",
    items: [
      { id: "chicken", name: "Grilled Chicken", price: "₦1,800" },
      { id: "peppered", name: "Peppered Chicken", price: "₦2,100" },
      { id: "assortedMeat", name: "Assorted Meat Dish", price: "₦2,400" },
    ],
  },
  {
    title: "Swallow & soups",
    items: [
      { id: "poundedYamEgusi", name: "Pounded Yam & Egusi", price: "₦2,800" },
      { id: "semoOgbono", name: "Semo & Ogbono", price: "₦2,600" },
    ],
  },
  {
    title: "Drinks",
    items: [
      { id: "fanta", name: "Soft drink (35cl)", price: "₦300" },
      { id: "zobo", name: "Zobo (50cl)", price: "₦400" },
      { id: "chapman", name: "Chapman (50cl)", price: "₦600" },
    ],
  },
  {
    title: "Combos",
    items: [
      { id: "comboJollofChickenDrink", name: "Jollof + Chicken + Drink Combo", price: "₦4,300" },
      { id: "comboStudentSpecial", name: "Student Special", price: "₦4,200" },
      { id: "comboSwallowDuo", name: "Swallow Duo Combo", price: "₦4,700" },
      { id: "comboOfadaAssorted", name: "Ofada + Assorted Combo", price: "₦5,200" },
    ],
  },
  {
    title: "Add-ons",
    items: [
      { id: "addonExtraProtein", name: "Extra protein", price: "+₦500" },
      { id: "addonExtraPlantain", name: "Extra plantain", price: "+₦300" },
      { id: "addonExtraSauce", name: "Extra sauce", price: "+₦150" },
      { id: "addonBottledWater", name: "Bottled water", price: "+₦200" },
    ],
  },
];
const ITEM_BY_ID = new Map(CATALOG.flatMap((s) => s.items).map((i) => [i.id, i]));

const CUSTOMER_DIRECTORY = [
  { phone: "08034127781", name: "Ada Okafor", orders: 43 },
  { phone: "08099215540", name: "Emeka Obi", orders: 27 },
  { phone: "07061884492", name: "Ngozi Eze", orders: 18 },
];

function parseNaira(s: string) {
  return Number(s.replace(/[₦,+]/g, ""));
}
function formatNaira(n: number) {
  return "₦" + Math.max(0, Math.round(n)).toLocaleString("en-NG");
}
function findCustomer(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return CUSTOMER_DIRECTORY.find((c) => c.phone === digits) ?? null;
}

type PaymentMethod = "cash" | "pos" | "transfer" | null;
interface LastSale {
  heading: string;
  items: { qty: number; name: string; lineTotal: string }[];
  total: string;
  paymentLabel: string;
  showChange: boolean;
  amountReceived: string;
  changeDue: string;
}

export default function AdminCashierPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [amountReceivedInput, setAmountReceivedInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLookedUp, setCustomerLookedUp] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [saleCounter, setSaleCounter] = useState(142);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  function incItem(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    setCartSheetOpen(true);
  }
  function decItem(id: string) {
    setCart((c) => {
      const next = { ...c };
      const cur = next[id] ?? 0;
      if (cur <= 1) delete next[id];
      else next[id] = cur - 1;
      return next;
    });
  }

  const q = searchQuery.trim().toLowerCase();
  const menuSections = CATALOG.map((sec) => ({
    title: sec.title,
    items: sec.items.filter((m) => !q || m.name.toLowerCase().includes(q)),
  })).filter((sec) => sec.items.length > 0);

  const cartItemIds = Object.keys(cart).filter((id) => (cart[id] ?? 0) > 0);
  const cartEmpty = cartItemIds.length === 0;
  const cartItems = cartItemIds.map((id) => {
    const base = ITEM_BY_ID.get(id)!;
    const unit = parseNaira(base.price);
    const qty = cart[id] ?? 0;
    return {
      id,
      name: base.name,
      qty,
      unitPrice: (base.price.startsWith("+") ? "+" : "") + formatNaira(unit),
      lineTotal: formatNaira(unit * qty),
    };
  });
  const subtotalNum = cartItemIds.reduce((sum, id) => sum + parseNaira(ITEM_BY_ID.get(id)!.price) * (cart[id] ?? 0), 0);
  const subtotal = formatNaira(subtotalNum);

  const isCashSelected = paymentMethod === "cash";
  const amountReceivedNum = parseNaira(amountReceivedInput || "0") || 0;
  const changeDueNum = amountReceivedNum - subtotalNum;
  const changeDueOk = isCashSelected && amountReceivedInput !== "" && changeDueNum >= 0;
  const changeDueLabel = !isCashSelected ? "Change due" : changeDueNum < 0 ? "Amount still owed" : "Change due";
  const changeDueDisplay = !isCashSelected ? formatNaira(0) : formatNaira(Math.abs(changeDueNum));
  const owedNow = changeDueNum < 0 && isCashSelected && amountReceivedInput !== "";

  const paymentLabels: Record<string, string> = { cash: "Cash", pos: "POS Machine", transfer: "Bank transfer" };
  const canComplete = !cartEmpty && !!paymentMethod && (!isCashSelected || changeDueOk);

  const customerMatch = customerLookedUp ? findCustomer(customerPhone) : null;
  const customerRecognised = !!customerMatch;
  const recognisedLabel = customerMatch ? `Returning: ${customerMatch.name} — ${customerMatch.orders} orders` : "";
  const customerHint = customerRecognised
    ? `This sale will be added to ${customerMatch!.name}'s order history and loyalty count.`
    : "Optional — a name and number let this sale join that customer's history and loyalty count. Leave it blank if the customer would rather not say.";
  const customerLabel = (customerMatch ? customerMatch.name : customerName).trim();

  const saleReference = "Walk-in sale #WI-" + String(saleCounter).padStart(4, "0");

  function lookUpCustomer() {
    const phone = customerPhone.trim() === "" ? "0803 412 7781" : customerPhone;
    const hit = findCustomer(phone);
    setCustomerPhone(phone);
    setCustomerLookedUp(true);
    if (hit) setCustomerName(hit.name);
  }

  function completeSale() {
    if (!canComplete) return;
    const summary: LastSale = {
      heading: saleReference + (customerLabel ? ` — ${customerLabel}` : ""),
      items: cartItems.map((l) => ({ qty: l.qty, name: l.name, lineTotal: l.lineTotal })),
      total: subtotal,
      paymentLabel: paymentLabels[paymentMethod!]!,
      showChange: isCashSelected,
      amountReceived: formatNaira(amountReceivedNum),
      changeDue: formatNaira(Math.max(0, changeDueNum)),
    };
    setSaleCompleted(true);
    setLastSale(summary);
    setSaleCounter((n) => n + 1);
    setCart({});
    setPaymentMethod(null);
    setAmountReceivedInput("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLookedUp(false);
  }
  function newSale() {
    setSaleCompleted(false);
    setLastSale(null);
    setCartSheetOpen(false);
  }

  return (
    <div className="flex h-full">
      {/* Menu picker */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <h1 className="text-[18px] font-extrabold text-heading">Cashier / POS</h1>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent-tint text-[10.5px] font-extrabold text-admin-nav-active">K</span>
            <span className="text-[12px] font-bold text-heading">Logged in as: Kemi Alao — Cashier</span>
          </div>
        </div>

        <div className="scrollbar-none flex-1 overflow-y-auto p-5">
          <div className="mb-[18px] grid grid-cols-3 gap-2 lg:gap-3">
            <div className="relative overflow-hidden rounded-xl2 p-2.5 px-3 lg:rounded-[14px] lg:p-3.5 lg:px-4" style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, #9E1717 100%)" }}>
              <div className="absolute -right-4 -top-4 h-[74px] w-[74px] rounded-full bg-white/[0.08]" />
              <p className="relative z-[1] mb-1.5 text-[9px] font-bold uppercase tracking-[0.04em] text-[#FFD9A0] lg:mb-2 lg:text-[10.5px] lg:tracking-[0.05em]">Walk-in sales</p>
              <p className="relative z-[1] text-[14px] font-extrabold tabular-nums text-white lg:text-[21px]">₦86,400</p>
            </div>
            <div className="rounded-xl2 border border-border bg-card p-2.5 px-3 lg:rounded-[14px] lg:p-3.5 lg:px-4">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.04em] text-muted lg:mb-2 lg:text-[10.5px] lg:tracking-[0.05em]">Orders</p>
              <p className="text-[14px] font-extrabold tabular-nums text-heading lg:text-[21px]">19</p>
            </div>
            <div className="rounded-xl2 border border-border bg-card p-2.5 px-3 lg:rounded-[14px] lg:p-3.5 lg:px-4">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.04em] text-muted lg:mb-2 lg:text-[10.5px] lg:tracking-[0.05em]">Top dish</p>
              <p className="text-[11px] font-extrabold leading-[1.2] text-heading lg:text-[15px]">Party Jollof</p>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 py-2.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, combos, add-ons..."
              className="flex-1 border-none bg-transparent text-[12.5px] text-heading outline-none"
            />
          </div>

          {menuSections.map((sec) => (
            <div key={sec.title} className="mb-5">
              <h3 className="mb-2.5 text-[13px] font-extrabold text-heading">{sec.title}</h3>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
                {sec.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => incItem(item.id)}
                    className="flex flex-col gap-1.5 rounded-2xl border-[1.5px] border-border bg-card p-2 text-left transition-colors hover:border-accent active:scale-[0.98] lg:gap-2 lg:p-2.5"
                  >
                    <div className="h-14 w-full rounded-[9px] bg-bg lg:h-16 lg:rounded-[10px]" />
                    <div>
                      <div className="text-[11.5px] font-bold leading-[1.25] text-heading lg:text-[12px]">{item.name}</div>
                      <div className="mt-0.5 text-[11.5px] font-extrabold tabular-nums text-accent lg:text-[12px]">{item.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart panel — persistent on desktop */}
      <div className="hidden w-[360px] shrink-0 flex-col border-l border-border bg-card lg:flex">
        <CartContent
          saleCompleted={saleCompleted}
          cartEmpty={cartEmpty}
          cartItems={cartItems}
          decItem={decItem}
          incItem={incItem}
          subtotal={subtotal}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          setCustomerLookedUp={setCustomerLookedUp}
          lookUpCustomer={lookUpCustomer}
          customerRecognised={customerRecognised}
          recognisedLabel={recognisedLabel}
          customerHint={customerHint}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          isCashSelected={isCashSelected}
          amountReceivedInput={amountReceivedInput}
          setAmountReceivedInput={setAmountReceivedInput}
          owedNow={owedNow}
          changeDueLabel={changeDueLabel}
          changeDueDisplay={changeDueDisplay}
          canComplete={canComplete}
          completeSale={completeSale}
          lastSale={lastSale}
          newSale={newSale}
        />
      </div>

      {/* Mobile: floating "view cart" bar + bottom sheet */}
      {!cartSheetOpen && !cartEmpty && !saleCompleted && (
        <button
          onClick={() => setCartSheetOpen(true)}
          className="fixed inset-x-4 bottom-[18px] z-40 flex items-center justify-between rounded-2xl bg-heading px-4 py-3.5 text-bg shadow-[0_8px_22px_rgba(0,0,0,0.35)] lg:hidden"
        >
          <span className="text-[12.5px] font-bold">{cartItemIds.reduce((n, id) => n + (cart[id] ?? 0), 0)} items · View cart</span>
          <span className="text-[14px] font-extrabold">{subtotal}</span>
        </button>
      )}
      {(cartSheetOpen || saleCompleted) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 lg:hidden" onClick={() => !saleCompleted && setCartSheetOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[84%] w-full flex-col rounded-t-[20px] bg-card p-[18px] shadow-[0_-12px_32px_rgba(0,0,0,0.3)]">
            {!saleCompleted && (
              <div className="mb-3.5 flex items-center justify-end">
                <button onClick={() => setCartSheetOpen(false)} aria-label="Close" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-bg">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <CartContent
              saleCompleted={saleCompleted}
              cartEmpty={cartEmpty}
              cartItems={cartItems}
              decItem={decItem}
              incItem={incItem}
              subtotal={subtotal}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              setCustomerLookedUp={setCustomerLookedUp}
              lookUpCustomer={lookUpCustomer}
              customerRecognised={customerRecognised}
              recognisedLabel={recognisedLabel}
              customerHint={customerHint}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              isCashSelected={isCashSelected}
              amountReceivedInput={amountReceivedInput}
              setAmountReceivedInput={setAmountReceivedInput}
              owedNow={owedNow}
              changeDueLabel={changeDueLabel}
              changeDueDisplay={changeDueDisplay}
              canComplete={canComplete}
              completeSale={completeSale}
              lastSale={lastSale}
              newSale={newSale}
              sheet
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface CartContentProps {
  saleCompleted: boolean;
  cartEmpty: boolean;
  cartItems: { id: string; name: string; qty: number; unitPrice: string; lineTotal: string }[];
  decItem: (id: string) => void;
  incItem: (id: string) => void;
  subtotal: string;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  setCustomerLookedUp: (v: boolean) => void;
  lookUpCustomer: () => void;
  customerRecognised: boolean;
  recognisedLabel: string;
  customerHint: string;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  isCashSelected: boolean;
  amountReceivedInput: string;
  setAmountReceivedInput: (v: string) => void;
  owedNow: boolean;
  changeDueLabel: string;
  changeDueDisplay: string;
  canComplete: boolean;
  completeSale: () => void;
  lastSale: LastSale | null;
  newSale: () => void;
  sheet?: boolean;
}

function CartContent(props: CartContentProps) {
  const {
    saleCompleted, cartEmpty, cartItems, decItem, incItem, subtotal,
    customerName, setCustomerName, customerPhone, setCustomerPhone, setCustomerLookedUp, lookUpCustomer,
    customerRecognised, recognisedLabel, customerHint,
    paymentMethod, setPaymentMethod, isCashSelected, amountReceivedInput, setAmountReceivedInput,
    owedNow, changeDueLabel, changeDueDisplay, canComplete, completeSale, lastSale, newSale, sheet,
  } = props;

  if (saleCompleted) {
    return (
      <div className="scrollbar-none flex flex-1 flex-col items-center overflow-y-auto px-[22px] py-[26px] text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-success))" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 className="mb-1 text-[17px] font-extrabold text-heading">Sale complete</h3>
        <p className="mb-[18px] text-[13px] font-bold text-accent">{lastSale?.heading}</p>

        <div className="mb-3.5 w-full rounded-2xl border border-border bg-bg p-3.5 text-left">
          <div className="mb-2.5 flex flex-col gap-1.5">
            {lastSale?.items.map((line, i) => (
              <div key={i} className="flex justify-between text-[12px] text-body">
                <span>{line.qty}× {line.name}</span>
                <span className="tabular-nums">{line.lineTotal}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-[13px] font-extrabold text-heading">
            <span>Total</span><span className="tabular-nums">{lastSale?.total}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-[12px] text-body">
            <span>Payment method</span><span className="font-bold text-heading">{lastSale?.paymentLabel}</span>
          </div>
          {lastSale?.showChange && (
            <>
              <div className="mt-1 flex justify-between text-[12px] text-body">
                <span>Amount received</span><span className="tabular-nums">{lastSale.amountReceived}</span>
              </div>
              <div className="mt-1 flex justify-between text-[12.5px] font-bold text-success">
                <span>Change due</span><span className="tabular-nums">{lastSale.changeDue}</span>
              </div>
            </>
          )}
        </div>

        <p className="mb-5 text-[11px] leading-[1.4] text-muted">This sale counts toward today&rsquo;s portions sold and revenue.</p>

        <button onClick={newSale} className="w-full rounded-xl2 bg-heading py-3.5 text-[14px] font-extrabold text-bg">New sale</button>
      </div>
    );
  }

  return (
    <>
      {!sheet && (
        <div className="border-b border-border px-[18px] pb-3 pt-[18px]">
          <h3 className="text-[15px] font-extrabold text-heading">Current sale</h3>
          <p className="mt-0.5 text-[11.5px] text-muted">Walk-in counter order</p>
        </div>
      )}

      <div className={`scrollbar-none overflow-y-auto ${sheet ? "mb-3" : "flex-1 px-[18px] py-3.5"}`}>
        {cartEmpty ? (
          <div className="flex flex-col items-center justify-center px-2.5 py-6 text-center text-muted">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-border))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mb-2.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M2 11h20" /><path d="M6 15h4" /><path d="M9 3v4M15 3v4" /></svg>
            <p className="text-[12.5px] font-semibold">No items yet</p>
            <p className="mt-1 text-[11px]">Tap a menu item to add it to this sale.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {cartItems.map((line) => (
              <div key={line.id} className="flex items-center gap-2.5 border-b border-admin-row-border pb-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-heading">{line.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{line.unitPrice} each</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button aria-label="Decrease" onClick={() => decItem(line.id)} className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-border bg-bg text-[14px] font-bold text-heading">−</button>
                  <span className="w-4 text-center text-[12.5px] font-bold text-heading">{line.qty}</span>
                  <button aria-label="Increase" onClick={() => incItem(line.id)} className="flex h-6 w-6 items-center justify-center rounded-[7px] border border-border bg-bg text-[14px] font-bold text-heading">+</button>
                </div>
                <span className="w-[68px] shrink-0 text-right text-[12.5px] font-extrabold tabular-nums text-heading">{line.lineTotal}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={sheet ? "scrollbar-none overflow-y-auto border-t border-border pt-3.5" : "border-t border-border bg-bg px-[18px] pb-[18px] pt-4"}>
        <div className="mb-1 flex justify-between">
          <span className="text-[12.5px] text-body">Subtotal</span>
          <span className="text-[12.5px] font-bold tabular-nums text-heading">{subtotal}</span>
        </div>
        <div className="mb-3.5 flex justify-between">
          <span className="text-[14px] font-extrabold text-heading">Total</span>
          <span className="text-[16px] font-extrabold tabular-nums text-accent">{subtotal}</span>
        </div>

        <div className="mb-3.5 border-b border-border pb-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Customer</span>
            <span className="rounded-full bg-border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em] text-muted">Optional</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="rounded-[10px] border-[1.5px] border-border bg-card px-3 py-2.5">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
            </div>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-border bg-card px-3 py-2.5">
                <input
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setCustomerLookedUp(false);
                  }}
                  placeholder="Phone number"
                  className="w-full border-none bg-transparent text-[13px] text-heading outline-none"
                />
              </div>
              <button onClick={lookUpCustomer} className="shrink-0 rounded-[10px] border-[1.5px] border-border px-3.5 text-[11.5px] font-bold text-body">Look up</button>
            </div>
          </div>
          {customerRecognised && (
            <div className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-success))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              <span className="text-[11px] font-bold text-success">{recognisedLabel}</span>
            </div>
          )}
          <p className="mt-2.5 text-[10.5px] leading-[1.45] text-muted">{customerHint}</p>
        </div>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Payment method</p>
        <div className="mb-3.5 grid grid-cols-3 gap-2">
          <PayPill label="Cash" active={paymentMethod === "cash"} onClick={() => setPaymentMethod("cash")}>
            <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 10v4M18 10v4" />
          </PayPill>
          <PayPill label="POS" active={paymentMethod === "pos"} onClick={() => setPaymentMethod("pos")}>
            <rect x="4" y="3" width="16" height="18" rx="2" /><rect x="7" y="6" width="10" height="6" rx="1" /><path d="M7 15h.01M11 15h.01M15 15h.01M7 18h.01M11 18h.01M15 18h.01" />
          </PayPill>
          <PayPill label={"Bank\ntransfer"} active={paymentMethod === "transfer"} onClick={() => setPaymentMethod("transfer")}>
            <path d="M17 3v12M17 3l-4 4M17 3l4 4" /><path d="M7 21V9M7 21l-4-4M7 21l4-4" />
          </PayPill>
        </div>

        {isCashSelected && (
          <div className="mb-3.5">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Amount received (₦)</label>
            <div className="mb-2 rounded-[10px] border-[1.5px] border-border bg-card px-3 py-2.5">
              <input value={amountReceivedInput} onChange={(e) => setAmountReceivedInput(e.target.value)} placeholder="e.g. 5000" className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />
            </div>
            <div className={`flex items-center justify-between rounded-[10px] px-3 py-2.5 ${owedNow ? "bg-accent-tint" : "bg-success-bg"}`}>
              <span className={`text-[12px] font-bold ${owedNow ? "text-accent" : "text-success"}`}>{changeDueLabel}</span>
              <span className={`text-[13.5px] font-extrabold tabular-nums ${owedNow ? "text-accent" : "text-success"}`}>{changeDueDisplay}</span>
            </div>
          </div>
        )}

        <button
          onClick={completeSale}
          disabled={!canComplete}
          className="w-full rounded-xl2 py-3.5 text-[14px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          style={{ background: canComplete ? "rgb(var(--color-accent))" : "rgb(var(--color-border))" }}
        >
          Complete sale
        </button>
        <p className="mt-2.5 text-center text-[10.5px] leading-[1.4] text-muted">This sale will count toward today&rsquo;s portions sold and revenue.</p>
      </div>
    </>
  );
}

function PayPill({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  const color = active ? "var(--admin-nav-active-text)" : "rgb(var(--color-body))";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl2 border-[1.5px] px-1.5 py-2.5 transition-colors ${active ? "border-admin-nav-active bg-accent-tint" : "border-border bg-card"}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span className="whitespace-pre-line text-center text-[11px] font-bold leading-[1.15]" style={{ color }}>
        {label}
      </span>
    </button>
  );
}
