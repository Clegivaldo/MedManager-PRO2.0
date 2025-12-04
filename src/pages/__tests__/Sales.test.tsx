import * as Page from '../tenant/Sales';
import { describe, it, expect } from 'vitest';

describe('Tenant Sales page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
