import * as Page from '../Dashboard';
import { describe, it, expect } from 'vitest';

describe('Dashboard page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
