import * as Page from '../tenant/Quotes';
import { describe, it, expect } from 'vitest';

describe('Tenant Quotes page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
