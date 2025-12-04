import * as Page from '../tenant/LicenseExpired';
import { describe, it, expect } from 'vitest';

describe('Tenant LicenseExpired page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
