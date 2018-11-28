const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    app: './index.ts'
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].[hash].js'
  },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: [ 'ts-loader' ] },
      { test: /\.css$/, use: [ 'style-loader', 'css-loader' ]}
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'HAHA',
      filename: 'index.html',
      template: 'index.html',
      inject: true
    })
  ],
  mode: 'production',
  devtool: '#source-map',
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 30000,
      maxSize: 0,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: '~',
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          chunks: 'all'
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  devServer: {
    contentBase: path.join(__dirname, 'release'),
    compress: true,
    port: 9000
  }
};
