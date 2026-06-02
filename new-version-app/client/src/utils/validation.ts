export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Ký tự bị cấm: HTML injection, XSS, SQL injection, path traversal
const FORBIDDEN_CHARS = /[<>"'`&;/\\!@#$%^*()+={}[\]|~?]/;

// Ký tự điều khiển (control characters) và null byte
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

// URL pattern
const URL_PATTERN = /https?:\/\/|www\.\S/i;

// Chữ cái (Latin, Latin mở rộng cho tiếng Việt, Cyrillic, CJK cơ bản)
const HAS_LETTER = /[a-zA-ZÀ-ɏḀ-ỿЀ-ӿ一-鿿぀-ヿ]/;

// Chỉ gồm số và khoảng trắng (không có chữ)
const ONLY_DIGITS_SPACES = /^[\d\s_\-\.]+$/;

export function validateDisplayName(name: string): ValidationResult {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Tên không hợp lệ' };
  }

  // Không được có khoảng trắng đầu/cuối
  if (name !== name.trim()) {
    return { valid: false, error: 'Tên không được có khoảng trắng ở đầu hoặc cuối' };
  }

  // Độ dài
  if (name.length < 2) {
    return { valid: false, error: 'Tên phải có ít nhất 2 ký tự' };
  }
  if (name.length > 30) {
    return { valid: false, error: 'Tên không được quá 30 ký tự' };
  }

  // Ký tự điều khiển
  if (CONTROL_CHARS.test(name)) {
    return { valid: false, error: 'Tên chứa ký tự không hợp lệ' };
  }

  // Ký tự bị cấm
  if (FORBIDDEN_CHARS.test(name)) {
    return { valid: false, error: 'Tên chứa ký tự không được phép (<>"\'&;/\\!@#$%...)' };
  }

  // Khoảng trắng liên tiếp
  if (/\s{2,}/.test(name)) {
    return { valid: false, error: 'Tên không được có nhiều khoảng trắng liên tiếp' };
  }

  // Phải có ít nhất một chữ cái
  if (!HAS_LETTER.test(name) || ONLY_DIGITS_SPACES.test(name)) {
    return { valid: false, error: 'Tên phải chứa ít nhất một chữ cái' };
  }

  // Không được chứa URL
  if (URL_PATTERN.test(name)) {
    return { valid: false, error: 'Tên không được chứa đường dẫn web' };
  }

  // Không được chứa @
  if (name.includes('@')) {
    return { valid: false, error: 'Tên không được chứa ký tự @' };
  }

  // Không được bắt đầu bằng số hoặc dấu chấm/gạch ngang
  if (/^[\d.\-_]/.test(name)) {
    return { valid: false, error: 'Tên phải bắt đầu bằng một chữ cái' };
  }

  return { valid: true };
}

export function validateAvatarFile(mimeType: string | null | undefined, fileSizeBytes?: number): ValidationResult {
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  if (!mimeType || !ALLOWED_TYPES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: 'Ảnh phải ở định dạng JPG, PNG, WEBP hoặc GIF' };
  }

  if (fileSizeBytes !== undefined && fileSizeBytes > MAX_SIZE) {
    return { valid: false, error: 'Ảnh không được lớn hơn 5MB' };
  }

  return { valid: true };
}
