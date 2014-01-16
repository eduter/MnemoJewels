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
                for (i in value) {
                    stack.push(i);
                    stack.push(value[i]);
                }
            }
        }
        return bytes;
    }

    return {
        TimeMeter: TimeMeter,
        getStats : function() {
            return TimeMeter.getStats('MA') + ' ' + TimeMeter.getStats('MI') + ' ' + TimeMeter.getStats('CG');
        },
        roughSizeOfObject: roughSizeOfObject
    };
})();
