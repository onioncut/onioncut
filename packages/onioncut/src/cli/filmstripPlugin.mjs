import { execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer-core';
import { findChrome } from './findChrome.mjs';

const constants = {
  // Where the preview asks for a frame — ?scene=<key>&t=<ms into the cut>&v=<version> — and the custom HMR
  // event it listens to, to ask for its frames again. The same values as FILMSTRIP_ROUTE and
  // FILMSTRIP_STALE_EVENT in src/constants.ts, which the CLI cannot import.
  ROUTE: '/__onioncut/filmstrip',
  // The size a frame is photographed at, as wide as the stage is scaled down to — sharp in a timeline
  // dragged tall, small enough that a long cut is photographed in a few seconds. A copied frame is taken
  // COPY_SCALE times larger, at the stage's own size.
  WIDTH: 640,
  COPY_SCALE: 3,
  // Where the preview asks for the moment on its stage to be put on the clipboard: POST
  // { scene, stateId, time, text }, the time in ms into that step.
  COPY_ROUTE: '/__onioncut/copy',
  // How long after the last change to a file the frames are thrown away, so a save that touches several
  // files, or an editor writing twice, costs one round of photographs rather than several.
  STALE_DELAY: 300,
  STALE_EVENT: 'onioncut:filmstrip-stale',
};

// Which step a moment of the cut falls in, and how far into it.
const positionAt = ({ states, time }) => {
  let start = 0;

  for (const state of states) {
    const end = start + state.hold * 1000;

    if (time < end) {
      return { stateId: state.id, time: time - start };
    }

    start = end;
  }

  const last = states[states.length - 1];

  return { stateId: last.id, time: last.hold * 1000 };
};

// The filmstrip over the preview's timeline: a frame of the scene every few seconds, so a whole cut can be
// looked over at a glance. The browser cannot photograph its own page, so the frames are taken by Chrome on
// the side, the same way the recorder takes them — a page per scene in recording mode, seeked to the moment
// and photographed small. Frames are kept until a file changes; then the pages are opened again and the
// preview is told to ask again.
export const filmstripPlugin = () => {
  let browser = null;
  const pages = new Map();
  const frames = new Map();
  // One photograph at a time: every frame of a scene comes off the same page, which can only stand in one
  // place at once.
  let queue = Promise.resolve();
  let version = 0;
  let staleTimer = null;

  const pageFor = async ({ baseUrl, sceneKey }) => {
    const known = pages.get(sceneKey);

    if (known && known.version === version) {
      return known.page;
    }

    browser ??= await puppeteer.launch({ executablePath: findChrome(), headless: true });

    // A page from before a change is closed rather than navigated again: it is in the middle of Vite's own
    // reload by then, and a second navigation on top of that never finishes.
    await known?.page.close().catch(() => undefined);

    const page = await browser.newPage();

    await page.setViewport({ width: constants.WIDTH, height: constants.WIDTH });
    // Not networkidle0, as the recorder waits: right after a change Vite is still serving the new module
    // graph and the network never goes quiet for long enough. The page says itself when it is ready.
    await page.goto(`${baseUrl}/?scene=${encodeURIComponent(sceneKey)}&recording=1`, { waitUntil: 'load', timeout: 60_000 });
    await page.waitForFunction(() => window.__onioncut?.isReady() === true, { timeout: 60_000 });

    const stage = await page.evaluate(() => window.__onioncut.stage);

    await page.setViewport({ width: constants.WIDTH, height: Math.round((constants.WIDTH * stage.height) / stage.width) });
    pages.set(sceneKey, { page, version });

    return page;
  };

  // A frame at a moment of the cut (time, in ms from its start), or at a moment inside a step (position) —
  // the copy asks for the latter, since the end of a step is the start of the next one in the cut's time.
  const photograph = ({ baseUrl, sceneKey, time, position, scale = 1 }) => {
    const key = `${sceneKey}|${position ? `${position.stateId}@${position.time}` : time}|${scale}|${version}`;

    if (!frames.has(key)) {
      const frame = queue.then(async () => {
        const page = await pageFor({ baseUrl, sceneKey });
        const states = await page.evaluate(() => window.__onioncut.states);

        await page.evaluate((target) => window.__onioncut.seek(target), position ?? positionAt({ states, time }));

        if (scale === 1) {
          return page.screenshot({ type: 'jpeg', quality: 80 });
        }

        const viewport = page.viewport();

        await page.setViewport({ ...viewport, deviceScaleFactor: scale });

        try {
          return await page.screenshot({ type: 'png' });
        } finally {
          await page.setViewport(viewport);
        }
      });

      // The queue only waits for the frame, whatever came of it — chained onto a failure it would fail every
      // frame after it. A failed frame is not kept, and neither is its page, so the next request starts clean.
      queue = frame.catch(() => undefined);
      frame.catch(() => {
        frames.delete(key);
        // A browser that let one frame hang lets the next one hang too, so it goes with the frame.
        browser?.close().catch(() => undefined);
        browser = null;
        pages.clear();
      });
      frames.set(key, frame);
    }

    return frames.get(key);
  };

  return {
    name: 'onioncut-filmstrip',
    apply: 'serve',
    configureServer(server) {
      server.watcher.on('change', () => {
        clearTimeout(staleTimer);
        staleTimer = setTimeout(() => {
          version += 1;
          frames.clear();
          server.ws.send({ type: 'custom', event: constants.STALE_EVENT, data: { version } });
        }, constants.STALE_DELAY);
      });

      server.httpServer?.once('close', () => browser?.close());

      // The preview is opened over the network as often as on localhost, and a page on plain http over the
      // network is not allowed the clipboard at all. The dev server runs on the machine the person sits at,
      // so it puts the moment there itself: the text and the frame together, as one clipboard entry, the way
      // macOS keeps both. Anywhere else it says so rather than pretending.
      server.middlewares.use(constants.COPY_ROUTE, async (request, response) => {
        const address = server.httpServer?.address();

        if (request.method !== 'POST' || !address || typeof address === 'string') {
          response.statusCode = 405;
          response.end('copy takes a POST');

          return;
        }

        if (process.platform !== 'darwin') {
          response.statusCode = 501;
          response.end('Copying a frame needs macOS: the dev server puts it on the clipboard with osascript.');

          return;
        }

        try {
          const chunks = [];

          for await (const chunk of request) {
            chunks.push(chunk);
          }

          const { scene: sceneKey, stateId, time, text } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const image = await photograph({ baseUrl: `http://127.0.0.1:${address.port}`, sceneKey, position: { stateId, time }, scale: constants.COPY_SCALE });
          const file = join(mkdtempSync(join(tmpdir(), 'onioncut-copy-')), 'frame.png');

          writeFileSync(file, image);
          await promisify(execFile)('osascript', [
            '-e',
            'on run argv',
            '-e',
            'set the clipboard to {«class PNGf»:(read (POSIX file (item 1 of argv)) as «class PNGf»), string:(item 2 of argv)}',
            '-e',
            'end run',
            file,
            text,
          ]);
          response.end('copied');
        } catch (error) {
          console.error(`Copying the frame failed: ${error.message ?? error}`);
          response.statusCode = 500;
          response.end(String(error.message ?? error));
        }
      });

      server.middlewares.use(constants.ROUTE, async (request, response) => {
        const params = new URL(request.url ?? '', 'http://localhost').searchParams;
        const sceneKey = params.get('scene');
        const time = Number(params.get('t'));
        const address = server.httpServer?.address();

        if (!sceneKey || !Number.isFinite(time) || !address || typeof address === 'string') {
          response.statusCode = 400;
          response.end('filmstrip needs ?scene=<key>&t=<ms>');

          return;
        }

        try {
          const image = await photograph({ baseUrl: `http://127.0.0.1:${address.port}`, sceneKey, time });

          response.setHeader('Content-Type', 'image/jpeg');
          response.setHeader('Cache-Control', 'no-store');
          response.end(image);
        } catch (error) {
          console.error(`Filmstrip frame ${sceneKey} at ${time} ms failed: ${error.message ?? error}`);
          response.statusCode = 500;
          response.end(String(error.message ?? error));
        }
      });
    },
  };
};
