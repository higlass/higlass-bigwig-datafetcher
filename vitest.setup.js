import { afterAll, vi } from 'vitest';
global.jest = vi;

afterAll(() => {
  delete global.jest;
  delete global.window.jest;
});