const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const pkg = require('./package.json');

module.exports = {
  publicPath: './',
  configureWebpack: (config) => {
    config.plugins.push(new NodePolyfillPlugin());
    // bundle all dependencies from node_modules to vendors
    config.optimization.splitChunks.cacheGroups.defaultVendors.chunks = 'all';
    config.optimization.splitChunks.cacheGroups.common.chunks = 'all';
    // prepare icons content to unicode
    config.module.rules
      .filter((rule) => {
        return rule.test.toString().indexOf('scss') !== -1;
      })
      .forEach((rule) => {
        rule.oneOf.forEach((oneOfRule) => {
          oneOfRule.use.splice(oneOfRule.use.indexOf(require.resolve('sass-loader')), 0, {
            loader: require.resolve('css-unicode-loader'),
          });
        });
      });

    // TODO: remove
    if (process.env.NODE_ENV === 'production') {
      const buildDateTime = Date.now();
      config.output.filename = `js/[name].[contenthash:8].${buildDateTime}.js`;
      config.output.chunkFilename = `js/[name].[contenthash:8].${buildDateTime}.js`;
    }
  },
  css: {
    loaderOptions: {
      sass: {
        additionalData: `
          @import "@/styles/_breakpoints.scss";
          @import "@/styles/_layout.scss";
          @import "@/styles/_mixins.scss";
          @import "@/styles/_typography.scss";
        `,
      },
    },
  },
  productionSourceMap: false,
  runtimeCompiler: true,
  pwa: {
    name: 'Polkaswap',
    themeColor: '#FFFFFF',
    assetsVersion: `${pkg.version}-${Date.now()}`,
    manifestOptions: {
      icons: [36, 48, 72, 96, 144, 192].map((size) => ({
        src: `./img/icons/android-icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
      })),
    },
    iconPaths: {
      maskIcon: null,
    }, // TODO: need to add icons
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: './src/service-worker.js',
      maximumFileSizeToCacheInBytes: 0,
      exclude: [/^(whitelist|env)\.json$/],
    },
  },
};
