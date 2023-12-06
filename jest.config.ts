import type { Config } from 'jest';

const config: Config = {
  extensionsToTreatAsEsm: ['.ts'],
  preset: "ts-jest",
  testEnvironment: "jsdom",
};

export default config;
