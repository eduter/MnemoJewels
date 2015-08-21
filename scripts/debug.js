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
//                    mj.modules.cards.rescheduleMatch(pair.fiPairId, cards, 1000);
//                    cards.shift();
//                }
//            });
//        }
    }

    return {
        TimeMeter: TimeMeter,
        getStats : function() {
            return TimeMeter.getStats('CG') + ' ' + TimeMeter.getStats('CA') + ' ' + TimeMeter.getStats('D');
        },
        testCreateGroup: testCreateGroup,
        roughSizeOfObject: roughSizeOfObject
    };
})();
