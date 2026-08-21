/**
 * Uses a small tolerance to avoid false mismatches caused by decimal precision.
 * The database trigger repeats this calculation so browser values are never trusted.
 */
export function isThreeWayMatch(
  purchaseOrderAmount: number,
  receivedGoodsAmount: number,
  invoiceAmount: number,
): boolean {
  const amounts = [purchaseOrderAmount, receivedGoodsAmount, invoiceAmount];
  return amounts.every((amount) => Number.isFinite(amount) && amount >= 0)
    && Math.max(...amounts) - Math.min(...amounts) < 0.01;
}
