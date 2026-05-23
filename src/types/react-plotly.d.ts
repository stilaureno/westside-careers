declare module 'react-plotly.js' {
  import * as Plotly from 'plotly.js-dist-min';

  interface PlotParams {
    data: Plotly.Data[];
    layout?: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    onInitialized?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
    onPurge?: (figure: Plotly.Figure, graphDiv: HTMLElement) => void;
    onError?: (err: Error) => void;
    onClick?: (event: { points: Plotly.PlotDatum[] }) => void;
    onHover?: (event: { points: Plotly.PlotDatum[] }) => void;
    divId?: string;
  }

  const Plot: React.ComponentType<PlotParams>;
  export default Plot;
}
