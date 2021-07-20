module.exports = {
  publicPath: './',
  configureWebpack: config => {
    config.resolve.fallback = {
      util: false,
      crypto: false,
      stream: false,
      assert: false,
      http: false,
      https: false,
      os: false
    }

    // prepare icons content to unicode
    config.module.rules.filter(rule => {
      return rule.test.toString().indexOf('scss') !== -1
    })
      .forEach(rule => {
        rule.oneOf.forEach(oneOfRule => {
          oneOfRule.use.splice(oneOfRule.use.indexOf(require.resolve('sass-loader')), 0,
            { loader: require.resolve('css-unicode-loader') })
        })
      })

    if (process.env.NODE_ENV === 'production') {
      const buildDateTime = Date.now()
      config.output.filename = `js/[name].[contenthash:8].${buildDateTime}.js`
      config.output.chunkFilename = `js/[name].[contenthash:8].${buildDateTime}.js`
    }
  },
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
