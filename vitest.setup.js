import { beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

beforeAll(() => {
  global.fetch = fetch;
});

afterAll(() => {
  delete global.fetch;
});