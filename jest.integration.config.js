module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/integration.test.ts"],
  testTimeout: 30000,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
