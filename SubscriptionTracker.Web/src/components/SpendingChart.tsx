export type SpendingChartPoint = {
  monthKey: string;
  label: string;
  monthlySpend: number;
  cumulativeSpend: number;
  changeFromPrevious: number;
  changePercent: number;
};

interface SpendingChartProps {
  chartData: SpendingChartPoint[];
  selectedMonthIndex: number;
  onSelectMonth: (index: number) => void;
}

export default function SpendingChart({
  chartData,
  selectedMonthIndex,
  onSelectMonth,
}: SpendingChartProps) {
  const chartWidth = 760;
  const chartHeight = 260;
  const chartPadding = { top: 20, right: 16, bottom: 34, left: 38 };
  const maxMonthlySpend = Math.max(
    ...chartData.map((point) => point.monthlySpend),
    1,
  );
  const maxCumulativeSpend = Math.max(
    ...chartData.map((point) => point.cumulativeSpend),
    1,
  );

  const selectedMonth =
    chartData[selectedMonthIndex] ?? chartData[chartData.length - 1];
  const monthlyPointCoords = chartData.map((point, index) => {
    const x =
      chartData.length > 1
        ? chartPadding.left +
          (index / (chartData.length - 1)) *
            (chartWidth - chartPadding.left - chartPadding.right)
        : chartWidth / 2;
    const y =
      chartPadding.top +
      (1 - point.monthlySpend / maxMonthlySpend) *
        (chartHeight - chartPadding.top - chartPadding.bottom);
    return { ...point, x, y };
  });

  const cumulativePointCoords = chartData.map((point, index) => {
    const x =
      chartData.length > 1
        ? chartPadding.left +
          (index / (chartData.length - 1)) *
            (chartWidth - chartPadding.left - chartPadding.right)
        : chartWidth / 2;
    const y =
      chartPadding.top +
      (1 - point.cumulativeSpend / maxCumulativeSpend) *
        (chartHeight - chartPadding.top - chartPadding.bottom);
    return { ...point, x, y };
  });

  const monthlyBars = monthlyPointCoords.map((point, index) => {
    const barWidth =
      chartData.length > 1
        ? (chartWidth - chartPadding.left - chartPadding.right) /
          chartData.length
        : 48;
    const barHeight = chartHeight - chartPadding.bottom - point.y;

    return {
      ...point,
      index,
      barWidth,
      barHeight,
    };
  });

  const monthlyPath = monthlyPointCoords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const cumulativePath = cumulativePointCoords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <main className="chart-page">
      <section className="panel chart-panel">
        <div className="chart-header">
          <div>
            <p className="eyebrow">Analysis</p>
            <h2>Spending over time</h2>
          </div>
        </div>

        <div className="chart-summary-grid">
          <article className="metric-card">
            <span>
              Total spent by {selectedMonth?.label ?? 'selected month'}
            </span>
            <strong>
              ${selectedMonth?.cumulativeSpend.toFixed(2) ?? '0.00'}
            </strong>
          </article>
          <article className="metric-card">
            <span>Monthly spend</span>
            <strong>${selectedMonth?.monthlySpend.toFixed(2) ?? '0.00'}</strong>
          </article>
          <article className="metric-card accent">
            <span>Change vs previous month</span>
            <strong>
              {selectedMonth && selectedMonth.changeFromPrevious >= 0
                ? '+'
                : ''}
              ${selectedMonth?.changeFromPrevious.toFixed(2) ?? '0.00'}
            </strong>
          </article>
        </div>

        {chartData.length === 0 ? (
          <p className="empty-state">
            Add a subscription to see the chart history.
          </p>
        ) : (
          <>
            <div className="chart-legend">
              <span>
                <i className="legend-dot monthly-dot" /> Monthly spend
              </span>
              <span>
                <i className="legend-dot cumulative-dot" /> Cumulative spend
              </span>
            </div>

            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="chart-svg"
              role="img"
              aria-label="Subscription spending trend chart"
            >
              {[0, 1, 2, 3].map((step) => {
                const y =
                  chartPadding.top +
                  (step / 3) *
                    (chartHeight - chartPadding.top - chartPadding.bottom);

                return (
                  <line
                    key={step}
                    x1={chartPadding.left}
                    x2={chartWidth - chartPadding.right}
                    y1={y}
                    y2={y}
                    className="chart-gridline"
                  />
                );
              })}

              <path d={monthlyPath} className="chart-line monthly-line" />
              <path d={cumulativePath} className="chart-line cumulative-line" />

              {monthlyBars.map((point) => (
                <g key={point.monthKey}>
                  <rect
                    x={point.x - point.barWidth / 2}
                    y={point.y}
                    width={Math.max(point.barWidth - 10, 12)}
                    height={point.barHeight}
                    rx={8}
                    className={
                      selectedMonthIndex === point.index
                        ? 'chart-bar selected'
                        : 'chart-bar'
                    }
                    onClick={() => onSelectMonth(point.index)}
                  />
                </g>
              ))}

              {monthlyPointCoords.map((point, index) => (
                <circle
                  key={`${point.monthKey}-point`}
                  cx={point.x}
                  cy={point.y}
                  r={selectedMonthIndex === index ? 5 : 4}
                  className={
                    selectedMonthIndex === index
                      ? 'chart-point selected'
                      : 'chart-point'
                  }
                  onClick={() => onSelectMonth(index)}
                />
              ))}
            </svg>

            <div className="chart-ticks">
              {chartData.map((point, index) => (
                <button
                  type="button"
                  key={point.monthKey}
                  className={
                    selectedMonthIndex === index
                      ? 'chart-tick active'
                      : 'chart-tick'
                  }
                  onClick={() => onSelectMonth(index)}
                >
                  {point.label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
