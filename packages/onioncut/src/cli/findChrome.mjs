import { existsSync } from 'node:fs';

// The browser already on the machine, rather than one downloaded for the occasion. macOS first, then the
// usual Linux locations — a render can run on whichever machine is free, and CHROME_PATH names one these
// do not cover. The recorder and the preview's filmstrip both photograph the scene with it.
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

export const findChrome = () => {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error(`No Chrome found. Looked in:\n${CHROME_CANDIDATES.join('\n')}`);
  }

  return found;
};
