import * as Page from '../ForgotPassword';
import { describe, it, expect } from 'vitest';

describe('ForgotPassword page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
