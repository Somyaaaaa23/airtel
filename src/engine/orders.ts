/**
 * Order tracker: turns an accepted quote into a dated delivery plan the owner can follow without calling.
 * Installs run in parallel after KYC, as in the quote; on-site work waits for the visit slot the owner picks.
 * Due days come from typical_install_days in the catalogue.
 */
import { product } from "./catalogue";
import { addDays, type Check, type DocKind } from "./kyc";

export type TaskKind = "placed" | "kyc" | "scheduled" | "engineer" | "visit" | "service" | "live";
export interface Task { id: string; kind: TaskKind; productId?: string; qty?: number; dueDay: number }
export type VisitSlot = "morning" | "afternoon" | "evening";

export interface Order {
  id: string;
  placedOn: string;
  phone: string;
  businessName: string;
  signatory?: string;
  city?: string;
  pincode?: string;
  items: { productId: string; qty: number }[];
  monthly: number;
  setup: number;
  contractMonths: number;
  /** "review": KYC passed with a note the back office clears on day 1 (e.g. authorisation letter). "rejected": back office asked for new documents. */
  kycStatus: "verified" | "review" | "rejected";
  /** KYC as checked, for the back-office review queue. Document images are not kept; only extracted fields (IDs masked). */
  kyc?: { checks: Check[]; docs: Partial<Record<DocKind, Record<string, string>>>; edited: string[]; reviewNote?: string };
  contract?: { signedAt: string; method: "otp" | "aadhaar"; signatory: string };
  payment?: { ref: string; method: "upi" | "card"; amount: number; attempts: number };
  /** Share of install days cut by a priority crew (manufacturer playbook). */
  installCut?: number;
  /** Demo clock: days since the order, so the tracker keeps its place between screens. */
  simDay?: number;
  gstVerified: boolean;
  udyamVerified: boolean;
  visit?: { day: number; slot: VisitSlot };
  /** Propensity score (0–1) at the time the order was placed, for the back office. */
  score?: number;
  segment: string;
  employees: number;
  sites: number;
  lang: "en" | "hi";
}

/** Products a technician installs on site. Everything else is delivered (SIMs, devices) or set up remotely. */
const ON_SITE = new Set(["P01", "P02", "P03", "P04", "P05", "P06", "P09", "P10", "P21", "P22", "P23", "P24"]);
export const needsVisit = (items: { productId: string }[]) => items.some((i) => ON_SITE.has(i.productId));
export const isOnSite = (id: string) => ON_SITE.has(id);
export const DEFAULT_VISIT_DAY = 2;
/** Days the owner can pick for the technician visit. */
export const VISIT_DAYS = [1, 2, 3, 4];
export const SLA_DAYS = 21;

export function planTasks(o: Pick<Order, "items" | "kycStatus" | "visit" | "installCut">): Task[] {
  const kycDay = o.kycStatus === "review" ? 1 : 0;
  const visitDay = o.visit?.day ?? DEFAULT_VISIT_DAY;
  const tasks: Task[] = [{ id: "placed", kind: "placed", dueDay: 0 }, { id: "kyc", kind: "kyc", dueDay: kycDay }];
  if (needsVisit(o.items)) {
    const visit = Math.max(visitDay, kycDay + 1);
    tasks.push(
      // Scheduled once the owner has picked a visit slot.
      { id: "scheduled", kind: "scheduled", dueDay: o.visit ? kycDay : kycDay + 1 },
      { id: "engineer", kind: "engineer", dueDay: Math.max(kycDay, visit - 1) },
      { id: "visit", kind: "visit", dueDay: visit },
    );
  }
  for (const i of o.items) {
    const p = product(i.productId);
    const start = isOnSite(p.id) ? Math.max(visitDay, kycDay + 1) - 1 : kycDay;
    const days = Math.max(1, Math.ceil(p.installDays * (1 - (o.installCut ?? 0))));
    tasks.push({ id: p.id, kind: "service", productId: p.id, qty: i.qty, dueDay: Math.max(start + days, kycDay + 1) });
  }
  tasks.push({ id: "live", kind: "live", dueDay: Math.max(...tasks.map((t) => t.dueDay)) });
  return tasks.sort((a, b) => a.dueDay - b.dueDay || order(a) - order(b));
}
const order = (t: Task) => ["placed", "kyc", "scheduled", "engineer", "visit", "service", "live"].indexOf(t.kind);

const ENGINEERS = ["Ravi Kumar", "Sameer Shaikh", "Anil Yadav", "Pradeep Nair", "Vikas Patil", "Joseph Thomas"];
/** Field engineer assigned to the visit (deterministic for the demo). */
export const engineerFor = (o: Pick<Order, "id">) => ENGINEERS[Number(o.id.slice(-4)) % ENGINEERS.length];

export type TaskState = "done" | "next" | "later";
/** State of each task on simulated day `day` after the order. */
export function taskStates(tasks: Task[], day: number): TaskState[] {
  const firstOpen = tasks.findIndex((t) => t.dueDay > day);
  return tasks.map((t, i) => (t.dueDay <= day ? "done" : i === firstOpen || t.dueDay === tasks[firstOpen]?.dueDay ? "next" : "later"));
}

export const dueDate = (o: Pick<Order, "placedOn">, t: Task) => addDays(o.placedOn, t.dueDay);
export const goLiveDay = (tasks: Task[]) => tasks[tasks.length - 1].dueDay;

let seq = 0;
/** Short order number shown to the owner, e.g. AB-260715-4821. */
export function orderId(placedOn: string, phone: string) {
  seq++;
  const n = (Number(phone.slice(-4)) * 7 + seq * 131) % 10000;
  return `AB-${placedOn.slice(2).replace(/-/g, "")}-${String(n).padStart(4, "0")}`;
}
