/**
 * Seed test users into Supabase Auth.
 *
 * Requirements:
 *   - "Email confirmations" must be DISABLED in Supabase:
 *     Dashboard → Authentication → Providers → Email → uncheck "Confirm email"
 *
 * Run: node scripts/seed-users.js
 */

const SUPABASE_URL  = 'https://odrvldgxctfoqzbzpdgu.supabase.co';
const SUPABASE_ANON = 'sb_publishable_zj-R_Eg-xJWfhjG0SmVqPg_TMmreMeg';

// Note: Supabase typically requires ≥ 6 chars for passwords.
// If 'admin' fails, you may need to increase it to 'admin123' or similar.
const ACCOUNTS = [
  { email: 'admin@mathup.dev',  password: 'admin123', fullName: 'Admin',   role: 'admin' },
  { email: 'admin1@mathup.dev', password: 'admin123', fullName: 'Admin 1', role: 'admin' },
];

async function signUp({ email, password, fullName, role }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
    },
    body: JSON.stringify({
      email,
      password,
      data: {
        full_name: fullName,
        role: role
      },
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? json.msg ?? JSON.stringify(json));
  }
  return json;
}

(async () => {
  console.log('Creating test accounts...\n');
  for (const acc of ACCOUNTS) {
    try {
      await signUp(acc);
      console.log(`✅  ${acc.email}  (password: ${acc.password})`);
    } catch (err) {
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        console.log(`⚠️   ${acc.email}  already exists — skipped`);
      } else {
        console.error(`❌  ${acc.email}  failed: ${err.message}`);
      }
    }
  }
  console.log('\nDone. Đăng nhập với:');
  console.log('  admin@mathup.dev   /  admin123');
  console.log('  admin1@mathup.dev  /  admin123');
})();
