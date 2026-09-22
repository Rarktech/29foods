"use client";

import { useState } from "react";

function ModalShell({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-[440px]" : "max-w-[420px]"} rounded-[20px] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]`}
      >
        <div className="mb-[18px] flex items-center justify-between">
          <h3 className="text-[16px] font-extrabold text-heading">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="bg-transparent p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{label}</label>
      <div className="rounded-[10px] border-[1.5px] border-border bg-admin-input px-3.5 py-2.5">{children}</div>
    </div>
  );
}
function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border-none bg-transparent text-[13px] text-heading outline-none" />;
}
function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} className="h-14 w-full resize-none border-none bg-transparent text-[13px] text-heading outline-none" />;
}
function PhotoDropzone() {
  return (
    <div className="rounded-xl2 border-[1.5px] border-dashed border-admin-dashed bg-admin-input px-3.5 py-[18px] text-center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-muted))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 block">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" />
      </svg>
      <div className="text-[12px] font-semibold text-body">Click to upload or drag and drop</div>
      <div className="mt-0.5 text-[10.5px] text-muted">PNG or JPG, up to 5MB</div>
    </div>
  );
}
function ModalActions({ onCancel, onSubmit, submitLabel }: { onCancel: () => void; onSubmit: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2.5">
      <button onClick={onCancel} className="rounded-[10px] bg-border px-[18px] py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
      <button onClick={onSubmit} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">{submitLabel}</button>
    </div>
  );
}

export function AddItemModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("Coconut Rice");
  const [price, setPrice] = useState("₦3,000");
  const [desc, setDesc] = useState("Fragrant rice cooked in coconut milk, served with grilled plantain.");
  return (
    <ModalShell title="Add menu item" wide onClose={onClose}>
      <div className="mb-5 flex flex-col gap-3.5">
        <Field label="Item name"><TextInput value={name} onChange={setName} /></Field>
        <Field label="Category">
          <select className="w-full border-none bg-transparent text-[13px] text-heading outline-none">
            <option>Rice dishes</option><option>Proteins</option><option>Swallow &amp; soups</option><option>Drinks</option>
          </select>
        </Field>
        <Field label="Price (₦)"><TextInput value={price} onChange={setPrice} /></Field>
        <Field label="Description"><TextArea value={desc} onChange={setDesc} /></Field>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Photo</label>
          <PhotoDropzone />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-heading">Available for order</span>
          <span className="relative block h-[22px] w-[38px] rounded-full bg-success">
            <span className="absolute left-0.5 top-0.5 h-[18px] w-[18px] translate-x-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
          </span>
        </div>
      </div>
      <ModalActions onCancel={onClose} onSubmit={onClose} submitLabel="Add item" />
    </ModalShell>
  );
}

export function AddComboModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("Exam Week Combo");
  const [includes, setIncludes] = useState("Party Jollof, Grilled Chicken, Soft drink (35cl)");
  const [standalone, setStandalone] = useState("₦5,000");
  const [comboPrice, setComboPrice] = useState("₦4,300");
  return (
    <ModalShell title="Add combo" wide onClose={onClose}>
      <div className="mb-5 flex flex-col gap-3.5">
        <Field label="Combo name"><TextInput value={name} onChange={setName} /></Field>
        <Field label="Included items"><TextArea value={includes} onChange={setIncludes} /></Field>
        <div className="flex gap-3">
          <div className="flex-1"><Field label="Standalone total (₦)"><TextInput value={standalone} onChange={setStandalone} /></Field></div>
          <div className="flex-1"><Field label="Combo price (₦)"><TextInput value={comboPrice} onChange={setComboPrice} /></Field></div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Photo</label>
          <PhotoDropzone />
        </div>
      </div>
      <ModalActions onCancel={onClose} onSubmit={onClose} submitLabel="Add combo" />
    </ModalShell>
  );
}

export function AddAddonModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("Extra fried plantain");
  const [price, setPrice] = useState("₦350");
  return (
    <ModalShell title="Add add-on" wide onClose={onClose}>
      <div className="mb-5 flex flex-col gap-3.5">
        <Field label="Add-on name"><TextInput value={name} onChange={setName} /></Field>
        <Field label="Price (₦)"><TextInput value={price} onChange={setPrice} /></Field>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Photo</label>
          <PhotoDropzone />
        </div>
      </div>
      <ModalActions onCancel={onClose} onSubmit={onClose} submitLabel="Add add-on" />
    </ModalShell>
  );
}

export function AddCustomerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("Uju Nnamdi");
  const [phone, setPhone] = useState("0803 214 7765");
  const [address, setAddress] = useState("Peace Lodge Rm 18");
  return (
    <ModalShell title="Add customer" wide onClose={onClose}>
      <div className="mb-5 flex flex-col gap-3.5">
        <Field label="Full name"><TextInput value={name} onChange={setName} /></Field>
        <Field label="Phone number"><TextInput value={phone} onChange={setPhone} /></Field>
        <Field label="Hostel / Lodge & room"><TextInput value={address} onChange={setAddress} /></Field>
        <Field label="Meal plan">
          <select className="w-full border-none bg-transparent text-[13px] text-heading outline-none">
            <option>None</option><option>1 Week</option><option defaultValue="">2 Weeks</option><option>1 Month</option>
          </select>
        </Field>
      </div>
      <ModalActions onCancel={onClose} onSubmit={onClose} submitLabel="Add customer" />
    </ModalShell>
  );
}

export function DiscountModal({
  itemName,
  draftType,
  setDraftType,
  existingValue,
  onRemove,
  onClose,
  onSave,
}: {
  itemName: string;
  draftType: "percent" | "flat";
  setDraftType: (t: "percent" | "flat") => void;
  existingValue?: number;
  onRemove: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const placeholder = existingValue !== undefined ? String(existingValue) : draftType === "percent" ? "15" : "300";
  const [value, setValue] = useState(placeholder);
  const [ends, setEnds] = useState("Today 9pm");

  return (
    <ModalShell title="Discount" onClose={onClose}>
      <p className="mb-[18px] text-[12.5px] text-muted">{itemName} · direct item price-slash, no code needed</p>
      <div className="mb-5 flex flex-col gap-3.5">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Discount type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDraftType("percent")}
              className={`flex-1 rounded-[10px] border border-border py-2.5 text-[12.5px] font-bold ${draftType === "percent" ? "bg-heading text-bg" : "bg-card text-body"}`}
            >
              % off
            </button>
            <button
              onClick={() => setDraftType("flat")}
              className={`flex-1 rounded-[10px] border border-border py-2.5 text-[12.5px] font-bold ${draftType === "flat" ? "bg-heading text-bg" : "bg-card text-body"}`}
            >
              ₦ off
            </button>
          </div>
        </div>
        <Field label="Discount value"><TextInput value={value} onChange={setValue} /></Field>
        <Field label="Ends (optional)"><TextInput value={ends} onChange={setEnds} /></Field>
      </div>
      <div className="flex justify-between gap-2.5">
        <button onClick={onRemove} className="rounded-[10px] border border-admin-danger-border bg-admin-danger px-4 py-2.5 text-[12.5px] font-bold text-admin-nav-active">Remove discount</button>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="rounded-[10px] bg-border px-[18px] py-2.5 text-[12.5px] font-bold text-body">Cancel</button>
          <button onClick={onSave} className="rounded-[10px] bg-accent px-[18px] py-2.5 text-[12.5px] font-bold text-white">Save discount</button>
        </div>
      </div>
    </ModalShell>
  );
}
