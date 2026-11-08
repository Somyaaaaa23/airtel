import { describe, expect, it } from "vitest";
import { goLiveDay, nextUpdate, planTasks, taskStates } from "./orders";
import { computeQuote } from "./quote";

const items = [{ productId: "P02", qty: 1 }, { productId: "P07", qty: 3 }, { productId: "P23", qty: 4 }];

describe("order tracker", () => {
  it("goes live on the same day the quote promised when KYC is verified", () => {
    const tasks = planTasks({ items, kycStatus: "verified", visit: { day: 1, slot: "morning" } });
    expect(goLiveDay(tasks)).toBe(computeQuote(items).goLiveDays);
  });
  it("delivers SIMs without waiting for the technician visit", () => {
    const tasks = planTasks({ items, kycStatus: "verified", visit: { day: 4, slot: "evening" } });
    expect(tasks.find((t) => t.productId === "P07")!.dueDay).toBe(1);
    expect(tasks.find((t) => t.productId === "P02")!.dueDay).toBe(8); // fibre: 5 install days from the day-4 visit
  });
  it("adds a day when KYC needs a back-office review", () => {
    const a = goLiveDay(planTasks({ items, kycStatus: "verified" }));
    const b = goLiveDay(planTasks({ items, kycStatus: "review" }));
    expect(b).toBeGreaterThanOrEqual(a);
    expect(planTasks({ items, kycStatus: "review" }).find((t) => t.kind === "kyc")!.dueDay).toBe(1);
  });
  it("marks done, next and later tasks for a simulated day", () => {
    const tasks = planTasks({ items, kycStatus: "verified" });
    const states = taskStates(tasks, 1);
    expect(states[0]).toBe("done");
    expect(states).toContain("next");
    expect(states[states.length - 1]).toBe("later");
  });
});

describe("next update", () => {
  const o = { items, kycStatus: "verified" as const, visit: { day: 1, slot: "morning" as const } };
  it("is the first task still to happen after the current day", () => {
    const tasks = planTasks(o);
    const n = nextUpdate({ ...o, simDay: 0 })!;
    expect(n.day).toBe(tasks.find((x) => x.dueDay > 0)!.dueDay);
    expect(n.day).toBeGreaterThan(0);
  });
  it("moves forward as days pass and is null once live", () => {
    const first = nextUpdate({ ...o, simDay: 0 })!.day;
    expect(nextUpdate({ ...o, simDay: first })!.day).toBeGreaterThan(first);
    expect(nextUpdate({ ...o, simDay: goLiveDay(planTasks(o)) })).toBeNull();
  });
});
