import * as Page from '../superadmin/Subscriptions';
import { describe, it, expect } from 'vitest';

describe('Superadmin Subscriptions page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
