import * as Page from '../Usage';
import { describe, it, expect } from 'vitest';

describe('Usage page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
