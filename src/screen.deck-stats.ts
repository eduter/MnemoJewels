import cards from './cards';
import '../lib/donut-chart';
import type { StateStat } from './types';

const colors: Record<string, string> = {
  NEW: '#0066FF',
  LEARNING: '#FFFF66',
  KNOWN: '#00CC33',
  LAPSE: '#FF3333',
};

let chart: DonutChart | null = null;
let chartContainer: HTMLElement | null = null;
let legendContainer: HTMLElement | null = null;

function setup(): void {
  chart = Object.create(DonutChart);
  chartContainer = document.getElementById('stats-chart');
  legendContainer = document.querySelector('#deck-stats figcaption dl');
}

function update(): void {
  const stats = cards.getStatesStats();
  updateLegend(stats);
  updateChart(stats);
}

interface ChartData {
  total: number;
  wedges: Array<{ id: string; color: string; value: number }>;
}

function statsToChartData(stats: StateStat[]): ChartData {
  const data: ChartData = {
    total: 0,
    wedges: [],
  };
  for (let i = 0; i < stats.length; i++) {
    const stateData = stats[i];
    if (stateData.count > 0) {
      data.total += stateData.count;
      data.wedges.push({
        id: stateData.state,
        color: colors[stateData.state],
        value: stateData.count,
      });
    }
  }
  return data;
}

function updateLegend(stats: StateStat[]): void {
  if (!legendContainer) {
    return;
  }
  let content = '';
  for (let i = 0; i < stats.length; i++) {
    const state = stats[i].state;
    content += '<dt style="background-color: ' + colors[state] + '"></dt><dd>' + state + '</dd>';
  }
  legendContainer.innerHTML = content;
}

function updateChart(stats: StateStat[]): void {
  setTimeout(function () {
    if (!chart || !chartContainer) {
      return;
    }
    const data = statsToChartData(stats);

    chartContainer.innerHTML = '';
    chart.init({
      container: chartContainer,
      data,
    });

    const deckStats = document.getElementById('deck-stats');
    for (let i = 0; i < stats.length; i++) {
      const stateData = stats[i];
      if (stateData.count > 0) {
        if (stateData.count / data.total < 0.03) {
          const label = deckStats?.querySelector('.donut-chart div[data-wedge-id="' + stateData.state + '"] .wedge-value');
          if (label) {
            label.classList.add('too-small');
          }
        }
      }
    }
  }, 0);
}

export default {
  setup,
  update,
};
