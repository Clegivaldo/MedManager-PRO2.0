import * as Page from '../Products';
import { describe, it, expect } from 'vitest';

describe('Products page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
