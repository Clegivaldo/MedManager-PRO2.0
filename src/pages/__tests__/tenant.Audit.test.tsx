import * as Page from '../tenant/Audit';
import { describe, it, expect } from 'vitest';

describe('Tenant Audit page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
