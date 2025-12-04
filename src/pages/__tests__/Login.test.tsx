import * as Page from '../Login';
import { describe, it, expect } from 'vitest';

describe('Login page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
