const {resolve} = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: './src/app.js',

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
    
    plugins: [
            new HtmlWebpackPlugin({inject: true,
            template: resolve( __dirname, './public/index.html' ),
        })
    ]
};