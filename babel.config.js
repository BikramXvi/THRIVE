module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // Remove dynamic import() calls that break Hermes
        function removeOtelImport() {
          return {
            visitor: {
              Import(path) {
                const parent = path.parentPath;
                if (parent && parent.node && parent.node.type === 'CallExpression') {
                  const arg = parent.node.arguments[0];
                  if (arg && arg.type === 'Identifier' && arg.name === 'OTEL_PKG') {
                    parent.replaceWithSourceString('Promise.resolve({})');
                  }
                }
              },
            },
          };
        },
      ],
    };
  };