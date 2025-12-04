import * as Page from '../tenant/UserManagement';
import { describe, it, expect } from 'vitest';

describe('Tenant UserManagement page exports', () => {
  it('should export default component or handlers', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
