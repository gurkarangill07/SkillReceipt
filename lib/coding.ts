export const CODING_STARTER = "function totalRevenue(orders) {\n  // Add revenueCents. Skip values that are null.\n  return 0;\n}";
export const CODING_EXAMPLE = "function totalRevenue(orders) {\n  let total = 0;\n  for (const order of orders) {\n    if (order.revenueCents !== null) {\n      total += order.revenueCents;\n    }\n  }\n  return total;\n}";
export const CODING_CASES = [
  { label: "Adds two orders", input: [{ revenueCents: 1200 }, { revenueCents: 850 }], expected: 2050 },
  { label: "Handles an empty list", input: [], expected: 0 },
  { label: "Skips unknown revenue", input: [{ revenueCents: 1000 }, { revenueCents: null }, { revenueCents: 500 }], expected: 1500 },
  { label: "Keeps genuine zero amounts", input: [{ revenueCents: 0 }, { revenueCents: null }], expected: 0 },
] as const;
export type CodingRun = { passed: number; total: number; tests: { label: string; passed: boolean }[] };
