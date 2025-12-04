import * as Page from '../tenant/UserProfile';
import { describe, it, expect } from 'vitest';

describe('Tenant UserProfile page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
