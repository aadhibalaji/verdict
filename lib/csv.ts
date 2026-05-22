import Papa from "papaparse";

export interface Transaction {
  date: string | null;
  description: string;
  amount: number;
  category?: string | null;
  raw: Record<string, string>;
}

export interface StatementSummary {
  rowCount: number;
  parsedCount: number;
  dateRange: { start: string | null; end: string | null };
  totalInflow: number;
  totalOutflow: number;
  net: number;
  topCategories: Array<{ category: string; total: number; count: number }>;
  topMerchants: Array<{ name: string; total: number; count: number }>;
  largestDebits: Transaction[];
  largestCredits: Transaction[];
  weekendSpending: number;
  weekdaySpending: number;
  smallTransactionsUnder10: number;
  recurringCandidates: Array<{ name: string; count: number; total: number }>;
}

const DATE_KEYS = ["date", "posted", "posting date", "transaction date", "post date", "time"];
const DESC_KEYS = ["description", "details", "memo", "narration", "transaction", "payee", "merchant", "name"];
const AMOUNT_KEYS = ["amount", "value", "transaction amount", "amt"];
const DEBIT_KEYS = ["debit", "withdrawal", "withdrawals", "money out"];
const CREDIT_KEYS = ["credit", "deposit", "deposits", "money in"];
const CATEGORY_KEYS = ["category", "type", "classification"];

function pickKey(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  for (const candidate of candidates) {
    const idx = lower.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseAmount(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value)
    .replace(/[\s,$£€]/g, "")
    .replace(/[()]/g, (m) => (m === "(" ? "-" : ""))
    .trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return trimmed;
}

function merchantKey(description: string): string {
  return description
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\b(POS|DEBIT|CREDIT|PURCHASE|PAYMENT|ACH|TRANSFER|ONLINE|RECURRING)\b/g, "")
    .replace(/\s+\d{2,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

export function parseStatement(csvText: string): { transactions: Transaction[]; summary: StatementSummary } {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = result.data.filter((r) => r && typeof r === "object");
  const headers = result.meta.fields ?? Object.keys(rows[0] ?? {});

  const dateKey = pickKey(headers, DATE_KEYS);
  const descKey = pickKey(headers, DESC_KEYS);
  const amountKey = pickKey(headers, AMOUNT_KEYS);
  const debitKey = pickKey(headers, DEBIT_KEYS);
  const creditKey = pickKey(headers, CREDIT_KEYS);
  const categoryKey = pickKey(headers, CATEGORY_KEYS);

  const transactions: Transaction[] = [];

  for (const row of rows) {
    const description = (descKey ? row[descKey] : "") ?? "";
    let amount: number | null = null;

    if (amountKey) {
      amount = parseAmount(row[amountKey]);
    } else if (debitKey || creditKey) {
      const debit = debitKey ? parseAmount(row[debitKey]) : null;
      const credit = creditKey ? parseAmount(row[creditKey]) : null;
      if (debit && debit !== 0) amount = -Math.abs(debit);
      else if (credit && credit !== 0) amount = Math.abs(credit);
    }

    if (amount === null) continue;

    transactions.push({
      date: dateKey ? normalizeDate(row[dateKey]) : null,
      description: description.toString().trim(),
      amount,
      category: categoryKey ? row[categoryKey]?.toString().trim() ?? null : null,
      raw: row,
    });
  }

  const inflows = transactions.filter((t) => t.amount > 0);
  const outflows = transactions.filter((t) => t.amount < 0);

  const totalInflow = inflows.reduce((s, t) => s + t.amount, 0);
  const totalOutflow = outflows.reduce((s, t) => s + t.amount, 0);

  const dates = transactions
    .map((t) => t.date)
    .filter((d): d is string => !!d)
    .sort();

  const categoryAgg = new Map<string, { total: number; count: number }>();
  for (const t of outflows) {
    if (!t.category) continue;
    const e = categoryAgg.get(t.category) ?? { total: 0, count: 0 };
    e.total += Math.abs(t.amount);
    e.count += 1;
    categoryAgg.set(t.category, e);
  }

  const merchantAgg = new Map<string, { total: number; count: number }>();
  for (const t of outflows) {
    const key = merchantKey(t.description);
    if (!key) continue;
    const e = merchantAgg.get(key) ?? { total: 0, count: 0 };
    e.total += Math.abs(t.amount);
    e.count += 1;
    merchantAgg.set(key, e);
  }

  const largestDebits = [...outflows]
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 8);
  const largestCredits = [...inflows]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  let weekendSpending = 0;
  let weekdaySpending = 0;
  for (const t of outflows) {
    if (!t.date) continue;
    const d = new Date(t.date);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    if (day === 0 || day === 6) weekendSpending += Math.abs(t.amount);
    else weekdaySpending += Math.abs(t.amount);
  }

  const smallTransactionsUnder10 = outflows.filter((t) => Math.abs(t.amount) < 10).length;

  const recurringCandidates = [...merchantAgg.entries()]
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([name, v]) => ({ name, count: v.count, total: v.total }));

  const summary: StatementSummary = {
    rowCount: rows.length,
    parsedCount: transactions.length,
    dateRange: {
      start: dates[0] ?? null,
      end: dates[dates.length - 1] ?? null,
    },
    totalInflow,
    totalOutflow,
    net: totalInflow + totalOutflow,
    topCategories: [...categoryAgg.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([category, v]) => ({ category, total: v.total, count: v.count })),
    topMerchants: [...merchantAgg.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([name, v]) => ({ name, total: v.total, count: v.count })),
    largestDebits,
    largestCredits,
    weekendSpending,
    weekdaySpending,
    smallTransactionsUnder10,
    recurringCandidates,
  };

  return { transactions, summary };
}

export function formatCurrency(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function summaryToBrief(summary: StatementSummary): string {
  const lines: string[] = [];
  lines.push(`EXHIBIT A — STATEMENT BRIEF`);
  lines.push(`Period: ${summary.dateRange.start ?? "unknown"} → ${summary.dateRange.end ?? "unknown"}`);
  lines.push(`Transactions analyzed: ${summary.parsedCount} of ${summary.rowCount} rows`);
  lines.push(`Total inflow: ${formatCurrency(summary.totalInflow)}`);
  lines.push(`Total outflow: ${formatCurrency(summary.totalOutflow)}`);
  lines.push(`Net: ${formatCurrency(summary.net)}`);
  lines.push(`Weekend spending: ${formatCurrency(summary.weekendSpending)} | Weekday: ${formatCurrency(summary.weekdaySpending)}`);
  lines.push(`Small (<$10) charges: ${summary.smallTransactionsUnder10}`);
  if (summary.topCategories.length) {
    lines.push("");
    lines.push("Top categories (by spend):");
    for (const c of summary.topCategories) {
      lines.push(`  • ${c.category} — ${formatCurrency(c.total)} across ${c.count} charges`);
    }
  }
  if (summary.topMerchants.length) {
    lines.push("");
    lines.push("Top merchants (by spend):");
    for (const m of summary.topMerchants) {
      lines.push(`  • ${m.name} — ${formatCurrency(m.total)} across ${m.count} charges`);
    }
  }
  if (summary.recurringCandidates.length) {
    lines.push("");
    lines.push("Likely recurring charges:");
    for (const r of summary.recurringCandidates) {
      lines.push(`  • ${r.name} — ${r.count}x, ${formatCurrency(r.total)} total`);
    }
  }
  if (summary.largestDebits.length) {
    lines.push("");
    lines.push("Largest debits:");
    for (const t of summary.largestDebits) {
      lines.push(`  • ${t.date ?? "??"} | ${t.description} | ${formatCurrency(t.amount)}`);
    }
  }
  if (summary.largestCredits.length) {
    lines.push("");
    lines.push("Largest credits:");
    for (const t of summary.largestCredits) {
      lines.push(`  • ${t.date ?? "??"} | ${t.description} | ${formatCurrency(t.amount)}`);
    }
  }
  return lines.join("\n");
}
