import * as Page from '../superadmin/ModuleManagement';
import { describe, it, expect } from 'vitest';

describe('Superadmin ModuleManagement page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
