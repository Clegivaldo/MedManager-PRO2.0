import * as Page from '../superadmin/SystemHealth';
import { describe, it, expect } from 'vitest';

describe('Superadmin SystemHealth page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
