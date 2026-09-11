interface MethodStats {
  total: number;
  calls: number;
  max: number;
}

interface FullStats {
  calls: number;
  total: number;
  average: number;
  max: number;
}

const TimeMeter = {
  running: {} as Record<string, number | null>,
  methods: {} as Record<string, MethodStats>,

  now: (window.performance && typeof window.performance.now === 'function'
    ? () => window.performance.now()
    : () => Date.now()),

  start(name: string): void {
    this.running[name] = this.now();
  },

  stop(name: string): void {
    const startTime = this.running[name];
    if (startTime == null) {
      return;
    }
    const elapsed = this.now() - startTime;
    this.running[name] = null;
    const method = this.getByName(name);
    method.total += elapsed;
    method.calls++;
    method.max = Math.max(method.max, elapsed);
  },

  getByName(name: string): MethodStats {
    if (!this.methods[name]) {
      this.methods[name] = {
        total: 0,
        calls: 0,
        max: 0,
      };
    }
    return this.methods[name];
  },

  getStats(name: string): string {
    const method = this.getByName(name);
    const average = method.calls > 0 ? Math.round(10 * method.total / method.calls) / 10 : 0;
    const max = Math.round(10 * method.max) / 10;
    return name + ': ' + average + '/' + max;
  },

  getFullStats(name: string): FullStats {
    const method = this.getByName(name);
    const average = method.calls > 0 ? method.total / method.calls : 0;
    return {
      calls: method.calls,
      total: Math.round(1000 * method.total) / 1000,
      average: Math.round(1000 * average) / 1000,
      max: Math.round(1000 * method.max) / 1000,
    };
  },
};

export default TimeMeter;
