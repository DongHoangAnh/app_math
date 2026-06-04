import { validateDisplayName, validateAvatarFile } from '../validation';

describe('validateDisplayName', () => {
  it('accepts a normal Vietnamese name', () => {
    expect(validateDisplayName('Nguyễn Văn A')).toEqual({ valid: true });
    expect(validateDisplayName('Lan').valid).toBe(true);
  });

  it('rejects leading/trailing whitespace', () => {
    expect(validateDisplayName(' Lan').valid).toBe(false);
    expect(validateDisplayName('Lan ').valid).toBe(false);
  });

  it('enforces length bounds (2–30)', () => {
    expect(validateDisplayName('A').valid).toBe(false);
    expect(validateDisplayName('a'.repeat(31)).valid).toBe(false);
    expect(validateDisplayName('a'.repeat(30)).valid).toBe(true);
  });

  it('rejects forbidden / injection characters', () => {
    expect(validateDisplayName('Bob<script>').valid).toBe(false);
    expect(validateDisplayName("O'Brien").valid).toBe(false);
    expect(validateDisplayName('a&b').valid).toBe(false);
  });

  it('rejects double spaces', () => {
    expect(validateDisplayName('Le  Van').valid).toBe(false);
  });

  it('requires at least one letter', () => {
    expect(validateDisplayName('12345').valid).toBe(false);
    expect(validateDisplayName('1 2 3').valid).toBe(false);
  });

  it('rejects names containing @ or URLs', () => {
    expect(validateDisplayName('me@site').valid).toBe(false);
    expect(validateDisplayName('visit http://x.com').valid).toBe(false);
  });

  it('rejects names starting with a digit, dot, or dash', () => {
    expect(validateDisplayName('1abc').valid).toBe(false);
    expect(validateDisplayName('.abc').valid).toBe(false);
    expect(validateDisplayName('-abc').valid).toBe(false);
  });

  it('rejects non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(validateDisplayName(null).valid).toBe(false);
  });
});

describe('validateAvatarFile', () => {
  it('accepts allowed image types (case-insensitive)', () => {
    expect(validateAvatarFile('image/png').valid).toBe(true);
    expect(validateAvatarFile('image/JPEG').valid).toBe(true);
    expect(validateAvatarFile('image/webp').valid).toBe(true);
  });

  it('rejects disallowed mime types', () => {
    expect(validateAvatarFile('application/pdf').valid).toBe(false);
    expect(validateAvatarFile(null).valid).toBe(false);
    expect(validateAvatarFile(undefined).valid).toBe(false);
  });

  it('rejects files larger than 5MB', () => {
    expect(validateAvatarFile('image/png', 6 * 1024 * 1024).valid).toBe(false);
    expect(validateAvatarFile('image/png', 5 * 1024 * 1024).valid).toBe(true);
  });
});
