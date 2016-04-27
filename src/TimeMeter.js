/**
 * Object for measuring time.
 */
var TimeMeter = {

    running: {},

    methods: [],

    now: (window['performance'] && typeof window['performance'].now == 'function' ? function () {
        return window['performance'].now()
    } : function () {
        return Date.now()
    }),

    start: function(name) {
        this.running[name] = this.now();
    },

    stop: function(name) {
        var time = this.now() - this.running[name];
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

export default TimeMeter;
