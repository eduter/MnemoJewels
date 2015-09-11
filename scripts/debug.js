mj.modules.debug = (function() {

    var TimeMeter = {

        running: {},

        methods: [],

        start: function(name) {
            this.running[name] = Date.now();
        },

        stop: function(name) {
            var time = Date.now() - this.running[name];
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
            var average = method.calls > 0 ? Math.round(method.total / method.calls) : 0;
            return name + ": " + average + "/" + method.max;
        }

    };

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

    function testCreateGroup() {
        // TODO: adapt this
//        for (var i = 0; i < 300; i++) {
//            console.log('GROUP ' + i);
//            mj.modules.cards.createNewGroup(3, [], function (cards) {
//                while (cards.length) {
//                    var pair = cards[0];
//                    mj.modules.cards.rescheduleMatch(pair.id, cards, 1000);
//                    cards.shift();
//                }
//            });
//        }
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
            results[mj.modules.utils.weighedRandom(weights)]++;
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

    return {
        TimeMeter: TimeMeter,
        getStats : function() {
            return TimeMeter.getStats('CG') + ' ' + TimeMeter.getStats('CA') + ' ' + TimeMeter.getStats('D');
        },
        testCreateGroup: testCreateGroup,
        testWeighedRandom: testWeighedRandom,
        roughSizeOfObject: roughSizeOfObject
    };
})();
