interface DonutChartWedge {
  id: string;
  color: string;
  value: number;
}

interface DonutChartData {
  total: number;
  wedges: DonutChartWedge[];
}

interface DonutChartOptions {
  container: HTMLElement;
  data: DonutChartData;
}

interface DonutChart {
  init(options: DonutChartOptions): void;
  update(options: DonutChartOptions): void;
}
