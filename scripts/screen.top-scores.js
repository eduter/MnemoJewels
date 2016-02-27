mj.screens['top-scores'] = (function() {

    var score;

    var firstRun = true;

    /**
     * Reference to the tbody element where the top scores are rendered.
     * @type {jQuery}
     */
    var $tableBody;

    /**
     * One-time initialization.
     */
    function setup() {
        score = mj.modules.score;
        $tableBody = $('#top-scores').find('table tbody');
    }

    /**
     * Updates the screen, when it is displayed.
     */
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
        }
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
                duration: mj.modules.time.formatDuration(topScore.end - topScore.start, 2)
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
        $tableBody.empty();
        for (var i = 0; i < tableData.length; i++) {
            var rowData = tableData[i];
            var $tr = $('<tr>');

            $tr.append('<td>' + (i + 1) + '.</td>');
            $tr.append('<td>' + rowData.score + '</td>');
            $tr.append('<td>' + rowData.duration + '</td>');
            $tableBody.append($tr);
        }
    }

    return {
        run: run
    };
})();
