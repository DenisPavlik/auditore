/** The staff member the mocked "@/lib/auth" sees; tests set it before calling an admin action. */
export const staff: { current: { id: string; name: string; email: string; role: "owner" | "demo" } | null } = {
  current: { id: "owner", name: "Il Maître", email: "maitre@auditore.it", role: "owner" },
};

export const asOwner = () => (staff.current = { id: "owner", name: "Il Maître", email: "maitre@auditore.it", role: "owner" });
export const asDemo = () => (staff.current = { id: "demo", name: "Ospite", email: "ospite@auditore.it", role: "demo" });
