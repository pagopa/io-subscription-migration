module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["dist", "/node_modules", "__integrations__"],
  testRegex: "(/__tests?__/.*\\.(test|spec))\\.(jsx?|tsx?)$",
};
