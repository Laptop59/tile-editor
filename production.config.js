const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const ZipWebpackPlugin = require("zip-webpack-plugin");
const version = require("./package.json").version;

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico|mp3|wav|ogg|otf|ttf)$/i,
        type: 'asset/resource',
        generator: {
          filename: "assets/[hash][ext][query]"
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
        title: "Tile Editor",
        favicon: "./src/icons/favicon.ico"
    }),
    new CopyPlugin({
      patterns: [
        { from: "./src/mods", to: "mods" },
        { from: "./src/server", to: "server"},
        { from: "./src/levels/LEVELS.md", to: "LEVELS.md"}
      ],
    }),
    new ZipWebpackPlugin({
      path: "zip",
      filename: `tile-editor-v${version}.zip`
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    clean: true
  },
  mode: "production"
};