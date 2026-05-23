'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
      Loading chart...
    </div>
  ),
});

interface TrendDataPoint {
  label: string;
  count: number;
  qualified: number;
  failed: number;
  pooling: number;
  date: string;
}

export default function PlotlyTrendChart({ data }: { data: TrendDataPoint[] }) {
  const layout = useMemo(() => ({
    height: 200,
    margin: { t: 10, r: 10, b: 30, l: 40 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'Arial, sans-serif', size: 11, color: '#6b7280' },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      y: 1.12,
      x: 0,
      font: { size: 11 },
    },
    barmode: 'group' as const,
    bargap: 0.15,
    bargroupgap: 0.1,
    xaxis: {
      tickfont: { size: 10, color: '#9ca3af' },
      linecolor: '#e5e7eb',
      gridcolor: 'transparent',
    },
    yaxis: {
      tickfont: { size: 10, color: '#9ca3af' },
      gridcolor: '#f1f5f9',
      linecolor: 'transparent',
      zeroline: false,
    },
    hovermode: 'x unified' as const,
    hoverlabel: {
      bgcolor: '#1e293b',
      font: { color: '#fff', size: 12 },
      bordercolor: 'transparent',
    },
  }), []);

  const traces = useMemo(() => {
    const labels = data.map(d => d.label);
    return [
      {
        type: 'bar' as const,
        name: 'Total',
        x: labels,
        y: data.map(d => d.count),
        marker: { color: '#1E40AF', line: { color: '#1E40AF', width: 0 } },
        hovertemplate: '%{y} applicants<extra></extra>',
      },
      {
        type: 'bar' as const,
        name: 'Qualified',
        x: labels,
        y: data.map(d => d.qualified),
        marker: { color: '#10B981', line: { color: '#10B981', width: 0 } },
        hovertemplate: '%{y} qualified<extra></extra>',
      },
      {
        type: 'bar' as const,
        name: 'For Pooling',
        x: labels,
        y: data.map(d => d.pooling),
        marker: { color: '#F59E0B', line: { color: '#F59E0B', width: 0 } },
        hovertemplate: '%{y} for pooling<extra></extra>',
      },
      {
        type: 'bar' as const,
        name: 'Not Recommended',
        x: labels,
        y: data.map(d => d.failed),
        marker: { color: '#EF4444', line: { color: '#EF4444', width: 0 } },
        hovertemplate: '%{y} not recommended<extra></extra>',
      },
    ];
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
        No application trend data available
      </div>
    );
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%', height: 200 }}
      useResizeHandler
    />
  );
}
