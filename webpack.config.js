const {resolve} = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { addHarpWebpackConfig } = require("@here/harp-webpack-utils/scripts/HarpWebpackConfig");

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: {
        main: './src/app.js',
        'harpgl-decoder': './src/harp-decoder.js'
    },

    devServer: {
        port: 3000,
        host: 'localhost',
        inline: true,
        hot: true,
        historyApiFallback: {
          index: 'index.html',
        },
        contentBase: 'public',
        overlay: {
          errors: true,
          warnings: true,
        },
    },
    
    output: {        
        filename: '[name].bundle.js',
        globalObject: 'this'
    },
  
    module: {
        rules: [
          {
            // Transpile ES6 to ES5 with babel
            // Remove if your app does not use JSX or you don't need to support old browsers
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: [/node_modules/]
          }
        ]
    },

    resolve: {
        alias: {
          // From mapbox-gl-js README. Required for non-browserify bundlers (e.g. webpack):
          'mapbox-gl$': resolve('./node_modules/mapbox-gl/dist/mapbox-gl.js')
          }
    },
    
    plugins: [
            new HtmlWebpackPlugin({inject: true,
            template: resolve( __dirname, './public/index.html' ),
        })
    ]
};