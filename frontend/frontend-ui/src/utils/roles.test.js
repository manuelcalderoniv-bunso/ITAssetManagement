import { describe, it, expect } from "vitest";
import { ROLES, PRL_PATH, canAccessPath, homePathFor, canTransitionPrl, filterNavForRole } from "./roles";

const NAV = [
  { to: "/", label: "Dashboard" },
  { key: "assets", label: "Assets", children: [{ label: "All", path: "/assets" }] },
  { to: PRL_PATH, label: "Purchase Request Log" },
  { to: "/auditlogs", label: "Audit Logs" },
];

describe("roles", () => {
  it("Procurement can open only the PRL", () => {
    expect(canAccessPath(ROLES.PROCUREMENT, PRL_PATH)).toBe(true);
    expect(canAccessPath(ROLES.PROCUREMENT, PRL_PATH + "/12")).toBe(true);
    for (const p of ["/", "/assets", "/auditlogs", PRL_PATH + "x"]) {
      expect(canAccessPath(ROLES.PROCUREMENT, p)).toBe(false);
    }
    expect(homePathFor(ROLES.PROCUREMENT)).toBe(PRL_PATH);
  });

  it("other known roles keep full UI access", () => {
    for (const r of [ROLES.SUPER_ADMIN, ROLES.IT_ADMIN, ROLES.IT_MANAGER, ROLES.IT_SUPPORT]) {
      expect(canAccessPath(r, "/assets")).toBe(true);
      expect(canAccessPath(r, PRL_PATH)).toBe(true);
      expect(homePathFor(r)).toBe("/");
    }
  });

  it("unknown or missing role is denied, /login stays public", () => {
    expect(canAccessPath(undefined, "/")).toBe(false);
    expect(canAccessPath("procurement", PRL_PATH)).toBe(false);
    expect(canAccessPath(undefined, "/login")).toBe(true);
  });

  it("IT Support cannot deliver/cancel, others can", () => {
    expect(canTransitionPrl(ROLES.IT_SUPPORT)).toBe(false);
    expect(canTransitionPrl(ROLES.PROCUREMENT)).toBe(true);
  });

  it("sidebar shows only PRL to Procurement and drops empty groups", () => {
    expect(filterNavForRole(NAV, ROLES.PROCUREMENT).map((i) => i.label)).toEqual(["Purchase Request Log"]);
    expect(filterNavForRole(NAV, ROLES.IT_SUPPORT)).toHaveLength(4);
    expect(filterNavForRole(NAV, undefined)).toHaveLength(0);
  });
});
