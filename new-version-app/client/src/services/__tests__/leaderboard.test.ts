// formatRank is pure, but its module imports the Supabase client, which throws
// without env vars at import time — stub it so the unit under test can load.
jest.mock('../supabase', () => ({ supabase: {} }));

import { formatRank, TOP_LIMIT } from '../leaderboard';

describe('formatRank', () => {
  it('shows the exact rank inside the top 100', () => {
    expect(formatRank(1)).toBe('#1');
    expect(formatRank(42)).toBe('#42');
    expect(formatRank(TOP_LIMIT)).toBe('#100');
  });

  it('buckets ranks past 100 by the lower threshold passed', () => {
    expect(formatRank(101)).toBe('100+');
    expect(formatRank(500)).toBe('100+');
    expect(formatRank(501)).toBe('500+');
    expect(formatRank(1000)).toBe('500+');
    expect(formatRank(1001)).toBe('1000+');
    expect(formatRank(5000)).toBe('1000+');
    expect(formatRank(5001)).toBe('5000+');
    expect(formatRank(123456)).toBe('5000+');
  });

  it('renders an em dash when the rank is unknown', () => {
    expect(formatRank(0)).toBe('—');
    expect(formatRank(-1)).toBe('—');
  });
});
