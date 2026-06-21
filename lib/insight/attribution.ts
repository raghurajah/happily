/**
 * Holdings attribution (E7-S1, decision 99d5cbfb): diff two consecutive position
 * Snapshots and attribute each holding's balance move to a PRICE effect vs a FLOW
 * effect (shares bought/sold). Pure + unit-tested. The "what moved my number" view.
 *
 *   ΔMarketValue = newQty·newPrice − oldQty·oldPrice
 *                = oldQty·(newPrice − oldPrice)   [price effect]
 *                + (newQty − oldQty)·newPrice      [flow effect]
 */
export interface HoldingSnapshot {
  symbol: string;
  quantity: number;
  marketValue: number;
}

export interface HoldingAttribution {
  symbol: string;
  oldValue: number;
  newValue: number;
  deltaValue: number;
  priceEffect: number;
  flowEffect: number;
}

export interface AttributionResult {
  holdings: HoldingAttribution[];
  totalDelta: number;
  totalPriceEffect: number;
  totalFlowEffect: number;
}

function priceOf(h: HoldingSnapshot | undefined): number | null {
  if (!h || h.quantity === 0) return null;
  return h.marketValue / h.quantity;
}

export function attributeChange(
  oldHoldings: HoldingSnapshot[],
  newHoldings: HoldingSnapshot[],
): AttributionResult {
  const oldBy = new Map(oldHoldings.map((h) => [h.symbol, h]));
  const newBy = new Map(newHoldings.map((h) => [h.symbol, h]));
  const symbols = [...new Set([...oldBy.keys(), ...newBy.keys()])].sort();

  const holdings: HoldingAttribution[] = symbols.map((symbol) => {
    const o = oldBy.get(symbol);
    const n = newBy.get(symbol);
    const oldQty = o?.quantity ?? 0;
    const newQty = n?.quantity ?? 0;
    const oldValue = o?.marketValue ?? 0;
    const newValue = n?.marketValue ?? 0;
    // Use whichever price we have; if both exist, price effect uses old qty.
    const oldPrice = priceOf(o) ?? priceOf(n) ?? 0;
    const newPrice = priceOf(n) ?? priceOf(o) ?? 0;

    const priceEffect = oldQty * (newPrice - oldPrice);
    const flowEffect = (newQty - oldQty) * newPrice;
    return {
      symbol,
      oldValue,
      newValue,
      deltaValue: newValue - oldValue,
      priceEffect,
      flowEffect,
    };
  });

  return {
    holdings,
    totalDelta: holdings.reduce((s, h) => s + h.deltaValue, 0),
    totalPriceEffect: holdings.reduce((s, h) => s + h.priceEffect, 0),
    totalFlowEffect: holdings.reduce((s, h) => s + h.flowEffect, 0),
  };
}
