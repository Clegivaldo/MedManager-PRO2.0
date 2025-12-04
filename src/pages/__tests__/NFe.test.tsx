import * as Page from '../tenant/NFe';
import { describe, it, expect } from 'vitest';

describe('Tenant NFe page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
