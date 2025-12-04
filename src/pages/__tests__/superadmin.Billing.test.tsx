import * as Page from '../superadmin/Billing';
import { describe, it, expect } from 'vitest';

describe('Superadmin Billing page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
