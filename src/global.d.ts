declare global {
  interface Array<T> {
    binarySearch(searchElement: T, cmpFunc: (a: T, b: T) => number): number;
  }

  var DonutChart: DonutChart;
}

export {};
