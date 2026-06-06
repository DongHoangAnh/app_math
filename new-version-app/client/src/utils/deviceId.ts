import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mathup.deviceId';

/** RFC4122 v4 UUID. Not security-critical — only labels this install. */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

/**
 * Returns a stable id for this install, generating + persisting one on first
 * use. Cached in memory so repeated calls don't hit storage.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = uuidv4();
  await AsyncStorage.setItem(STORAGE_KEY, fresh);
  cached = fresh;
  return fresh;
}
