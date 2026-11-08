import { describe, expect, it } from "vitest";
import { checkAdmin } from "./admin";

describe("staff sign-in", () => {
  it("accepts the demo account by email or user name", () => {
    expect(checkAdmin("administrator123@udyamdigital.in", "123@123")).toBe(true);
    expect(checkAdmin("  Administrator123 ", "123@123")).toBe(true);
  });
  it("rejects a wrong password or another email", () => {
    expect(checkAdmin("administrator123@udyamdigital.in", "123123")).toBe(false);
    expect(checkAdmin("someone@udyamdigital.in", "123@123")).toBe(false);
  });
});
