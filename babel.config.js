module.exports = function (api) {
  const isDev = api.env() !== "production";
  api.cache.using(() => process.env.NODE_ENV || "development");

  const plugins = [
    [
      "module-resolver",
      {
        root: ["./"],
        alias: {
          "@": "./src",
        },
      },
    ],
  ];

  if (isDev) {
    plugins.push("react-refresh/babel");
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
