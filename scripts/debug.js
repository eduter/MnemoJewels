mj.modules.debug = (function() {

    var TimeMeter = {

        running: {},

        methods: [],

        start: function(name) {
            this.running[name] = window.performance.now();
        },

        stop: function(name) {
            var time = window.performance.now() - this.running[name];
            this.running[name] = null;
            var method = this.getByName(name);
            method.total += time;
            method.calls++;
            method.max = Math.max(method.max, time);
        },

        getByName: function(name) {
            if (!this.methods[name]) {
                this.methods[name] = {
                    total: 0,
                    calls: 0,
                    max: 0
                }
            }
            return this.methods[name];
        },

        getStats: function(name) {
            var method = this.getByName(name);
            var average = method.calls > 0 ? Math.round(10 * method.total / method.calls) / 10 : 0;
            var max = Math.round(10 * method.max) / 10;
            return name + ": " + average + "/" + max;
        },

        getFullStats: function(name) {
            var method = this.getByName(name);
            var average = method.calls > 0 ? (method.total / method.calls) : 0;
            return {
                calls: method.calls,
                total: Math.round(1000 * method.total) / 1000,
                average: Math.round(1000 * average) / 1000,
                max: Math.round(1000 * method.max) / 1000
            };
        }

    };

    // If there's no deck stored, import and select the test deck
    function prepareTestDeck() {
        var selectedDeck = mj.modules.decks.getSelectedDeck();
        if (selectedDeck === null) {
            var deck = mj.modules.decks.importDeck(testDeck);
            mj.modules.decks.selectDeck(deck.id);
        }
    }

    function testChooseAlternative() {
        var start = 1300;
        var end = 1875;
        var matches = 0;
        var method1 = 'chooseAlternatives2';
        var method2 = 'chooseAlternatives3';
        for (var i = start; i < end; i++) {
            var card = mj.modules.cards.getCard(i);
            if (card.front.length > 6) {
                TimeMeter.start(method1);
                var result1 = formatAlternatives(mj.modules.cards[method1](3, card));
                TimeMeter.stop(method1);
                TimeMeter.start(method2);
                var result2 = formatAlternatives(mj.modules.cards[method2](3, card));
                TimeMeter.stop(method2);
                if (result1 == result2) {
                    matches++;
                } else {
                    var info = {card: formatCard(card)};
                    info[method1] = result1;
                    info[method2] = result2;
                    console.dir(info);
                }
            }
        }
        console.log(method1 + ' and ' + method2 + ' matched ' + Math.round(100 * matches / (end - start)) + "% of the time");
        console.log(method1 + ': ' + JSON.stringify(TimeMeter.getFullStats(method1)));
        console.log(method2 + ': ' + JSON.stringify(TimeMeter.getFullStats(method2)));
    }

    function formatAlternatives(alternatives) {
        var a = [];
        for (var i = 0; i < alternatives.length; i++) {
            a.push(formatCard(alternatives[i]));
        }
        return '[' + a.join(',') + ']';
    }
    function formatCard(card) {
        return '(' + card.front + ',' + card.back + ')';
    }

    function roughSizeOfObject(object) {
        var objectList = [];
        var stack = [object];
        var bytes = 0;

        while (stack.length) {
            var value = stack.pop();

            if (typeof value === 'boolean') {
                bytes += 4;
            } else if (typeof value === 'string') {
                bytes += value.length * 2;
            } else if (typeof value === 'number') {
                bytes += 8;
            } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {
                objectList.push(value);
                for (var i in value) {
                    if (value.hasOwnProperty(i)) {
                        stack.push(i);
                        stack.push(value[i]);
                    }
                }
            }
        }
        return bytes;
    }

    function testWeighedRandom() {
        var weights = [1, 2, 7];
        var iterations = 10000;
        var acceptableError = 0.03;

        var i;
        var totalWeight = 0;
        var results = [];
        for (i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
            results.push(0);
        }
        for (i = 0; i < iterations; i++) {
            var selectedOption = mj.modules.utils.weighedRandom(weights);
            if (!(selectedOption in weights)) {
                console.error("x '" + selectedOption + "' is not a valid option");
                return;
            }
            results[selectedOption]++;
        }
        for (var r = 0; r < results.length; r++) {
            var proportion = results[r] / iterations;
            var expectedProportion = weights[r] / totalWeight;
            var diff = Math.abs(expectedProportion - proportion);
            if (diff > acceptableError) {
                console.error("x weighedRandom exceeded the acceptable error margin");
                return;
            }
        }
        console.log("+ weighedRandom is within the acceptable error margin");
    }

    function testTransactions() {
        var runTransaction = testTransaction(true);
        var rollbackTransaction = testTransaction(false);

        return runTransaction && rollbackTransaction;
    }

    function testTransaction(mustSucceed) {
        var testResult = true;
        var exceptionThrown = false;
        var testCases = [
            {initialValue: 'value1', newValue: 'value2'},
            {initialValue: 1, newValue: 2},
            {initialValue: true, newValue: false},
            {initialValue: null, newValue: 'notNull'},
            {initialValue: 'notNull', newValue: null}
        ];

        try {
            var previousStorageLength = localStorage.length;

            storeValues(testCases.map(function(value, index){
                return {
                    key: 'key' + index,
                    value: value.initialValue
                };
            }));

            mj.modules.storage.transaction(function(){
                storeValues(testCases.map(function(value, index){
                    return {
                        key: 'key' + index,
                        value: value.newValue
                    };
                }));
                if (!mustSucceed) {
                    var a = null;
                    a['CRASH!'] = true;
                }
            });
        } catch(e) {
            exceptionThrown = true;
        }

        if (exceptionThrown == mustSucceed) {
            console.log(exceptionThrown ? 'x Unexpected exception thrown' : 'x Expected exception was not thrown');
            testResult = false;
        }
        for (var i = 0; i < testCases.length; i++) {
            var key = 'key' + i;
            var value = mj.modules.storage.load(key);
            var expectedValue = (mustSucceed ? testCases[i].newValue : testCases[i].initialValue);

            if (value !== expectedValue) {
                if (mustSucceed) {
                    console.log('x Failed to run transaction (' + value + ' != ' + expectedValue + ') - ' + key);
                } else {
                    console.log('x Failed to rollback an unsuccessful transaction (' + value + ' != ' + expectedValue + ') - ' + key);
                }
                testResult = false;
                break;
            }
        }
        for (i = 0; i < testCases.length; i++) {
            mj.modules.storage.remove('key' + i);
        }
        if (localStorage.length !== previousStorageLength) {
            console.log('x localStorage.length unexpectedly changed (' + previousStorageLength + ' -> ' + localStorage.length + ')');
            testResult = false;
        } else if (testResult) {
            console.log(mustSucceed ? '+ Run transaction' : '+ Rollback an unsuccessful transaction');
        }
        return testResult;
    }

    function storeValues(keyValues) {
        for (var i = 0; i < keyValues.length; i++) {
            var key = keyValues[i].key;
            var value = keyValues[i].value;

            if (value === null) {
                mj.modules.storage.remove(key);
            } else {
                mj.modules.storage.store(key, value);
            }
        }
    }

    function setup() {
        if (location.hash == '#test') {
            testTransactions();
            testWeighedRandom();
        }
    }
    return {
        setup: setup,
        TimeMeter: TimeMeter,
        prepareTestDeck: prepareTestDeck,
        getStats : function() {
            return TimeMeter.getStats('CA') + ' ' + TimeMeter.getStats('D');
        },
        testChooseAlternative: testChooseAlternative,
        roughSizeOfObject: roughSizeOfObject
    };
})();
