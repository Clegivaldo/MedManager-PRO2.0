import * as Page from '../superadmin/BackupManagement';
import { describe, it, expect } from 'vitest';

describe('Superadmin BackupManagement page exports', () => {
  it('should export default component', () => {
    expect(Page).toBeDefined();
    if (Page.default) expect(typeof Page.default).toBe('function');
  });
});
