// v1 navigable sections (decision 99d5cbfb). Allocation (E7/R3) is added when that
// epic lands; R1 ships Dashboard, Scenarios, Assets, Household.

export type NavItem = {
  href: string;
  label: string;
  /** Short glyph used in the mobile bottom bar. */
  glyph: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", glyph: "◎" },
  { href: "/scenarios", label: "Scenarios", glyph: "⊞" },
  { href: "/assets", label: "Assets", glyph: "▤" },
  { href: "/allocation", label: "Allocation", glyph: "◑" },
  { href: "/household", label: "Household", glyph: "⌂" },
];
