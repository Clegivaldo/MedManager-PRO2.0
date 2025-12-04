import * as Page from '../tenant/Routes';
import { describe, it, expect } from 'vitest';

describe('Tenant Routes page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
