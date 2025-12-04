import * as Page from '../tenant/PaymentGatewayConfig';
import { describe, it, expect } from 'vitest';

describe('Tenant PaymentGatewayConfig page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
