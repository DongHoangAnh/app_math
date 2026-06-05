// Global Jest setup. Mocks native modules that have no JS implementation in the
// node test environment so any module can transitively import them.
// Individual test files may still jest.mock() these to assert against them.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
