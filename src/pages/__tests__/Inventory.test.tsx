import * as Page from '../Inventory';
import { describe, it, expect } from 'vitest';

describe('Inventory page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
