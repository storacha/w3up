module.exports = {
  targets: 'defaults, not ie 11, not ie_mob 11',
  presets: [
    [
      '@babel/preset-env',
      {
        loose: true,
        modules: false,
        exclude: [
          '@babel/plugin-transform-regenerator',
          '@babel/plugin-transform-parameters',
        ],
      },
    ],
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
  env: {
    test: {
      plugins: [
        // everything needs to be cjs for jest
        [
          '@babel/plugin-transform-modules-commonjs',
          { loose: true, importInterop: 'node' },
        ],
      ],
    },
  },
}
