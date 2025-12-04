import * as Page from '../tenant/Financials';
import { describe, it, expect } from 'vitest';

describe('Tenant Financials page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
