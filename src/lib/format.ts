export function formatMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${currency} ${Math.round(amount || 0).toLocaleString()}`;
  }
}

export function formatCompact(n: number, currency = "INR") {
  const abs = Math.abs(n || 0);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${currency} ${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}${currency} ${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}${currency} ${(abs / 1e3).toFixed(1)} K`;
  return `${sign}${currency} ${abs.toFixed(0)}`;
}
