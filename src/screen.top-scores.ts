import score from './score'
import time from './time'


/**
 * Reference to the tbody element where the top scores are rendered.
 * @type {HTMLElement}
 */
var tableBody = document.querySelector('#top-scores table tbody');


/**
 * Updates the screen, when it is displayed.
 */
function update() {
    updateTable(getTableData());
}

/**
 * Builds the data to populate the table.
 * @return {Array.<{score: string, duration: string}>}
 */
function getTableData() {
    var topScores = score.getTopScores();
    var tableData = [];
    for (var i = 0; i < topScores.length; i++) {
        var topScore = topScores[i];
        tableData.push({
            score: '' + topScore.points,
            duration: time.formatDuration(topScore.end - topScore.start, 2)
        });
    }
    while (tableData.length < score.MAX_TOP_SCORES) {
        tableData.push({score: '----', duration: '--:--'});
    }
    return tableData;
}

/**
 * Updates the table with the top scores.
 * @param {Array.<{score: string, duration: string}>} tableData
 */
function updateTable(tableData) {
    var rows = [];
    for (var i = 0; i < tableData.length; i++) {
        var rowData = tableData[i];
        var tr = document.createElement('tr');

        var rankTd = document.createElement('td');
        rankTd.textContent = (i + 1) + '.';
        var scoreTd = document.createElement('td');
        scoreTd.textContent = rowData.score;
        var durationTd = document.createElement('td');
        durationTd.textContent = rowData.duration;

        tr.append(rankTd, scoreTd, durationTd);
        rows.push(tr);
    }
    tableBody.replaceChildren(...rows);
}


export default {
    update: update
};
