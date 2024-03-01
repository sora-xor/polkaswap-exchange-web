const { defineConfig } = require('@vue/cli-service');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');

module.exports = defineConfig({
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

    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(new TerserWebpackPlugin());
      const buildDateTime = Date.now();
      config.output.filename = `js/[name].[contenthash:8].${buildDateTime}.js`;
      config.output.chunkFilename = `js/[name].[contenthash:8].${buildDateTime}.js`;
    }
  },
  /* eslint-disable */
  /* prettier-ignore-start */
  chainWebpack: (config) => {
    // [vue-cli-service 5.0.8 migration]
    // [Issue]: Deprecated in webpack 5 "cache-loader" appends to vue rule, if it's exists in node-modules
    // https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-service/lib/config/base.js#L59
    // [Solution]: Write default vue rule config
    const vueRule = config.module.rule('vue');
    vueRule.uses.clear();
    vueRule
      .use('vue-loader')
      .loader(require.resolve('@vue/vue-loader-v15'))
      .options({
        compilerOptions: {
          whitespace: 'condense',
        },
      });

    const svgRule = config.module.rule('svg');
    const svgGenerator = svgRule.get('generator');
    svgRule.uses.clear();
    svgRule.delete('type');
    svgRule.delete('generator');
    svgRule
      .oneOf('inline')
      .resourceQuery(/inline/)
      .type('asset/inline')
      .end()
      .oneOf('file')
      .type('asset/resource')
      .set('generator', svgGenerator)
      .end();

    const imagesRule = config.module.rule('images');
    const imagesGenerator = imagesRule.get('generator');
    imagesRule.uses.clear();
    imagesRule.delete('type');
    imagesRule.delete('generator');
    imagesRule
      .oneOf('inline')
      .resourceQuery(/inline/)
      .type('asset/inline')
      .end()
      .oneOf('asset')
      .type('asset')
      .set('generator', imagesGenerator)
      .end();
  },
  /* eslint-enable */
  /* prettier-ignore-end */
  css: {
    loaderOptions: {
      sass: {
        additionalData: `
          @import "@/styles/_breakpoints.scss";
          @import "@/styles/_layout.scss";
          @import "@/styles/_mixins.scss";
          @import "@/styles/_typography.scss";
          @import "@/styles/_theme.scss";
        `,
      },
    },
  },
  pluginOptions: {
    testAttrs: {
      attrs: ['test', 'testid', 'test-name'],
    },
  },
  productionSourceMap: false,
  runtimeCompiler: true,
});
