const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  publicPath: './',
  configureWebpack: {
    plugins: [new BundleAnalyzerPlugin()]
  },
  // configureWebpack: config => {
  //   // prepare icons content to unicode
  //   config.module.rules.filter(rule => {
  //     return rule.test.toString().indexOf('scss') !== -1
  //   }).forEach(rule => {
  //     rule.oneOf.forEach(oneOfRule => {
  //       oneOfRule.use.splice(oneOfRule.use.indexOf(require.resolve('sass-loader')), 0,
  //         { loader: require.resolve('css-unicode-loader') })
  //     })
  //   })
  // },
  css: {
    loaderOptions: {
      sass: {
        prependData: `
          @import "@/styles/_breakpoints.scss";
          @import "@/styles/_layout.scss";
          @import "@/styles/_mixins.scss";
          @import "@/styles/_typography.scss";
        `
      }
    }
  },
  runtimeCompiler: true
}
