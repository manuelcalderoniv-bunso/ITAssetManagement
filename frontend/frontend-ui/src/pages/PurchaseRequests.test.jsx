// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { apiGet } from "../api/client";
import { getUser } from "../hooks/useAuth";
import PurchaseRequests from "./PurchaseRequests";

vi.mock("../api/client", () => ({
  apiGet: vi.fn(),
  apiSend: vi.fn(),
  unwrapList: (p) => (Array.isArray(p) ? p : []),
}));
vi.mock("../hooks/useAuth", () => ({ getUser: vi.fn() }));

const ROWS = [
  { id: 1, prNo: "PR-2026-00001", itemDescription: "POS Printer", itemType: "POS Printer", qty: 2, priority: "High",
    requesterName: "Ana", department: "Store", vendor: "ETI", estCost: 7000, status: "New", requestedAt: "2026-11-10", completedAt: null, cancelReason: null },
  { id: 2, prNo: "PR-2026-00002", itemDescription: "Mouse", itemType: "Accessory", qty: 5, priority: "Low",
    requesterName: "Ben", department: "IT", vendor: null, estCost: null, status: "Delivered", requestedAt: "2026-11-01", completedAt: "2026-11-08", cancelReason: null },
];

beforeEach(() => {
  cleanup();
  apiGet.mockResolvedValue(ROWS);
});

describe("PurchaseRequests", () => {
  it("IT Support can edit and print but not deliver or cancel", async () => {
    getUser.mockReturnValue({ role: "IT Support" });
    render(<PurchaseRequests />);
    await waitFor(() => screen.getByText("PR-2026-00001"));
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mark delivered" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.getByRole("button", { name: "+ New Request" })).toBeTruthy();
  });

  it("Procurement and Super Admin can deliver and cancel", async () => {
    for (const role of ["Procurement", "Super Admin"]) {
      cleanup();
      getUser.mockReturnValue({ role });
      render(<PurchaseRequests />);
      await waitFor(() => screen.getByText("PR-2026-00001"));
      expect(screen.getByRole("button", { name: "Mark delivered" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    }
  });

  it("shows a clear message on 401", async () => {
    getUser.mockReturnValue({ role: "Super Admin" });
    apiGet.mockRejectedValue(new Error("GET /procurement/requests?status=all failed (401)"));
    render(<PurchaseRequests />);
    await waitFor(() => screen.getByText(/session has expired/i));
  });
});
