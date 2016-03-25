var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
    entry: './src/initial.js',
    output: {
        path: 'target/',
        publicPath: 'target/',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract("style-loader", "css?-url!sass")
            },
            {
                test: /\/decks\/.+\.json$/,
                loader: './loaders/deck-data-loader'
            }
        ]
    },
    // Use the plugin to specify the resulting filename (and add needed behavior to the compiler)
    plugins: [
        new ExtractTextPlugin("bundle.css")
    ]
};
