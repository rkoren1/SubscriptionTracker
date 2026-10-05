interface SummaryMetrics {
  activeCount: number;
  estimatedMonthlySpend: number;
  yearlyTotal: number;
}

interface SummaryCardsProps {
  summary: SummaryMetrics;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className="summary-grid">
      <article className="metric-card">
        <span>Active plans</span>
        <strong>{summary.activeCount}</strong>
      </article>
      <article className="metric-card">
        <span>Estimated monthly</span>
        <strong>${summary.estimatedMonthlySpend.toFixed(2)}</strong>
      </article>
      <article className="metric-card accent">
        <span>Yearly total</span>
        <strong>${summary.yearlyTotal.toFixed(2)}</strong>
      </article>
    </section>
  );
}
