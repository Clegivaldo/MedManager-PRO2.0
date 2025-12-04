import * as Page from '../tenant/Financial/MyInvoices';
import { describe, it, expect } from 'vitest';

describe('Tenant Financial MyInvoices page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
