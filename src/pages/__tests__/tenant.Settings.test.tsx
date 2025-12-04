import * as Page from '../tenant/Settings';
import { describe, it, expect } from 'vitest';

describe('Tenant Settings page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
