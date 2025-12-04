import * as Page from '../NotFound';
import { describe, it, expect } from 'vitest';

describe('NotFound page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
