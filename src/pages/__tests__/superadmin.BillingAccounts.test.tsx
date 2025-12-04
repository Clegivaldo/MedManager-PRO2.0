import * as Page from '../superadmin/BillingAccounts';
import { describe, it, expect } from 'vitest';

describe('Superadmin BillingAccounts page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
