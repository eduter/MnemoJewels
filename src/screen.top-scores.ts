import score from './score';
import time from './time';

const tableBody = document.querySelector('#top-scores table tbody')!;

interface TableRowData {
  score: string;
  duration: string;
}

function update(): void {
  updateTable(getTableData());
}

function getTableData(): TableRowData[] {
  const topScores = score.getTopScores();
  const tableData: TableRowData[] = [];
  for (let i = 0; i < topScores.length; i++) {
    const topScore = topScores[i];
    tableData.push({
      score: '' + topScore.points,
      duration: time.formatDuration(topScore.end - topScore.start, 2),
    });
  }
  while (tableData.length < score.MAX_TOP_SCORES) {
    tableData.push({ score: '----', duration: '--:--' });
  }
  return tableData;
}

function updateTable(tableData: TableRowData[]): void {
  const rows: HTMLTableRowElement[] = [];
  for (let i = 0; i < tableData.length; i++) {
    const rowData = tableData[i];
    const tr = document.createElement('tr');

    const rankTd = document.createElement('td');
    rankTd.textContent = (i + 1) + '.';
    const scoreTd = document.createElement('td');
    scoreTd.textContent = rowData.score;
    const durationTd = document.createElement('td');
    durationTd.textContent = rowData.duration;

    tr.append(rankTd, scoreTd, durationTd);
    rows.push(tr);
  }
  tableBody.replaceChildren(...rows);
}

export default {
  update,
};
