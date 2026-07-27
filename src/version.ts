// Porcelain OS Version
// Increment by 0.1 for minor updates, 1.0 for major versions.
// Keep in step with `version` in src-tauri/tauri.conf.json and package.json —
// those name the bundle and the DMG.
export const VERSION = '2.1';
export const FULL_VERSION = `${VERSION}.0`;

/* Injected by Vite at build time (see vite.config.ts), so it cannot drift from
 * the binary the way a hand-edited literal did. Falls back to the current time
 * under `vite dev`, where every reload is its own build. */
declare const __BUILD_TIMESTAMP__: string;
const stamp = new Date(
  typeof __BUILD_TIMESTAMP__ === 'string' ? __BUILD_TIMESTAMP__ : Date.now()
);

const pad = (n: number) => String(n).padStart(2, '0');

export const BUILD_DATE = `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}`;
export const BUILD_TIME = `${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(stamp.getSeconds())}`;
export const BUILD_TIMESTAMP = `${BUILD_DATE} ${BUILD_TIME}`;

// Get formatted version info
export const getVersionInfo = () => ({
  version: FULL_VERSION,
  buildDate: BUILD_DATE,
  buildTime: BUILD_TIME,
  buildTimestamp: BUILD_TIMESTAMP,
});
