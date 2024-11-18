const cssnano = require('cssnano');

module.exports = {
  plugins: [
    cssnano({
      preset: [
        'default',
        {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          mergeLonghand: true,
          mergeRules: true, // Merge duplicated CSS rules
          discardDuplicates: true, // Discard duplicate rules (mostly element-ui)
        },
      ],
    }),
  ],
};
