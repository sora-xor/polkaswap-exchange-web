module.exports = {
  configureWebpack: {
    devtool: 'source-map' // Mapping for vscode tasks
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
  }
}
