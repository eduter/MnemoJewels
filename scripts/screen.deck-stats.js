mj.screens['deck-stats'] = (function() {
    var dom, $, cards;

    var firstRun = true;

    /**
     * Map containing the colors to be used for each card state in the chart.
     * @type {Object.<string, string>}
     */
    var colors = {
        NEW:      '#0066FF',
        LEARNING: '#FFFF66',
        KNOWN:    '#00CC33',
        LAPSE:    '#FF3333'
    };

    /**
     * The chart object.
     * @type {DonutChart}
     */
    var chart = null;

    /**
     * Element where the chart is rendered.
     * @type {HTMLElement}
     */
    var chartContainer = null;

    /**
     * Element containing the legend.
     * @type {HTMLElement}
     */
    var legendContainer = null;

    /**
     * One-time initialization.
     */
    function setup() {
        dom = mj.dom;
        $ = dom.$;
        cards = mj.modules.cards;

        chart = Object.create(DonutChart);
        chartContainer = $('#stats-chart')[0];
        legendContainer = $('#deck-stats figcaption dl')[0];
    }

    /**
     * Updates the screen, when it is displayed.
     */
    function run() {
        if (firstRun) {
            setup();
            firstRun = false;
        }
        var stats = cards.getStatesStats();
        updateLegend(stats);
        updateChart(stats);
    }

    /**
     * Converts states stats into the format the chart needs.
     *
     * @param {Array.<{state: string, count: int}>} stats
     * @return {{total: number, wedges: Array.<{id: string, color: string, value: number}>}}
     */
    function statsToChartData(stats) {
        var data = {
            total: 0,
            wedges: []
        };
        for (var i = 0; i < stats.length; i++) {
            var stateData = stats[i];
            if (stateData.count > 0) {
                data.total += stateData.count;
                data.wedges.push({
                    id: stateData.state,
                    color: colors[stateData.state],
                    value: stateData.count
                });
            }
        }
        return data;
    }

    /**
     * Updates the chart legend.
     *
     * @param {Array.<{state: string, count: int}>} stats
     */
    function updateLegend(stats) {
        var content = '';
        for (var i = 0; i < stats.length; i++) {
            var state = stats[i].state;
            content += '<dt style="background-color: ' + colors[state] + '"></dt><dd>' + state + '</dd>';
        }
        legendContainer.innerHTML = content;
    }

    /**
     * Updates the chart.
     *
     * @param {Array.<{state: string, count: int}>} stats
     */
    function updateChart(stats) {
        setTimeout(function(){
            var data = statsToChartData(stats);

            chartContainer.innerHTML = '';
            chart.init({
                container: chartContainer,
                data: data
            });

            // hides the labels from the wedges which are probably too small to have them
            for (var i = 0; i < stats.length; i++) {
                var stateData = stats[i];
                if (stateData.count > 0) {
                    if (stateData.count / data.total < 0.03) {
                        var label = $('#deck-stats .donut-chart div[data-wedge-id="' + stateData.state + '"] .wedge-value')[0];
                        dom.addClass(label, 'too-small');
                    }
                }
            }
        }, 0);
    }

    return {
        run: run
    };
})();
