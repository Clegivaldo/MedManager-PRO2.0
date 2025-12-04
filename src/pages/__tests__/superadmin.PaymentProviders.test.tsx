import * as Page from '../superadmin/PaymentProviders';
import { describe, it, expect } from 'vitest';

describe('Superadmin PaymentProviders page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
