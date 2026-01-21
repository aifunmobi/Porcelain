// Porcelain OS Version
// Increment by 0.1 for minor updates, 1.0 for major versions
export const VERSION = '1.3';
export const FULL_VERSION = `${VERSION}.0`;

// Build information
export const BUILD_DATE = '2026-01-21';
export const BUILD_TIME = '15:46:00';
export const BUILD_TIMESTAMP = `${BUILD_DATE} ${BUILD_TIME}`;

// Get formatted version info
export const getVersionInfo = () => ({
  version: FULL_VERSION,
  buildDate: BUILD_DATE,
  buildTime: BUILD_TIME,
  buildTimestamp: BUILD_TIMESTAMP,
});
