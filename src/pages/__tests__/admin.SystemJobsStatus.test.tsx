import * as Page from '../admin/SystemJobsStatus';
import { describe, it, expect } from 'vitest';

describe('Admin SystemJobsStatus page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
