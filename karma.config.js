var webpackConfig = require('./webpack.config.js');
webpackConfig.entry = {};

module.exports = function(config) {
    config.set({
        basePath: '',
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome'],
        singleRun: false,
        autoWatchBatchDelay: 300,
        files: [
            './tests/**/*.spec.js'
        ],
        preprocessors: {
            './tests/**/*.spec.js': ['webpack']
        },
        frameworks: ['jasmine'],
        reporters: ['progress'],
        webpack: webpackConfig,
        webpackMiddleware: {
            noInfo: true
        }
    });
};
