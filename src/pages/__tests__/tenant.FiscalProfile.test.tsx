import * as Page from '../tenant/FiscalProfile';
import { describe, it, expect } from 'vitest';

describe('Tenant FiscalProfile page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
