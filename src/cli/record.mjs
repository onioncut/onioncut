import { execFileSync, spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import { createViteConfig } from './createViteConfig.mjs';

const constants = {
  FPS: 30,
  // Every render is 4K at master quality, with no option to go lower. The page is laid out at 1080p and
  // photographed at twice the pixel density, so type and cut edges are drawn at 4K rather than scaled up.
  SCALE: 2,
  // ProRes 4444, colour at full resolution. H.264 keeps colour at half the resolution in both directions,
  // which chews up every sharp coloured edge — a paper hill over footage, a dot on dark cloth.
  EXTENSION: 'mov',
  // The scene's music, when it has any, fades out over the last this many seconds of the full cut, so
  // the cut ends rather than stops.
  MUSIC_FADE_OUT: 1.5,
  // The browser already on the machine, rather than one downloaded for the occasion. macOS first,
  // then the usual Linux locations — a render can run on whichever machine is free, and CHROME_PATH
  // names one these do not cover.
  CHROME_CANDIDATES: [
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
  ].filter(Boolean),
};

// A step's name in a clip's file name: lowercase, letters and digits, dashes between.
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// The flags are parsed once, by the CLI, and handed in — a second parser here is how --out ended up
// being read as the string "true" while the CLI had the value all along.
const parseArgs = (parsed) => {
  return {
    scene: parsed.scene ?? 'cards-cards',
    // Overrides every state's own hold. Left off, each state is held for the length its scene
    // declares, which is how a video gets a half-second top and tail around longer beats.
    hold: parsed.hold === undefined ? null : Number(parsed.hold),
    // Every step is also rendered as a clip of its own: its transition, then the finished state held for
    // this many seconds. Counted from when the step's last transition lands, so a slow build and an
    // instant one get the same room to trim — enough for the edit, without seconds of dead frames.
    stepHold: Number(parsed['step-hold'] ?? 2),
    // --only=tweets renders that one step's clip and nothing else. The states before it are still
    // stepped through, silently, because each one starts from where the last one ended.
    only: parsed.only ?? null,
    // --marketing records the tool as it looks in use: the stage inset in the dark frame with the row
    // of steps under it, the active one filling as its hold runs down. For marketing, not for a cut.
    marketing: parsed.marketing === 'true',
    // --transparent keeps the alpha channel: what the scene leaves empty stays see-through, for laying the
    // clip over footage in the edit.
    transparent: parsed.transparent === 'true',
    // Write this run somewhere else, leaving the scene's own folder — and whatever edit is linked to it
    // — alone.
    out: parsed.out ?? null,
    // How many clips are recorded at once. Each one is a page photographing at 4K and an ffmpeg
    // encoding it, so what runs out first is memory, not cores — four is what a laptop takes without
    // swapping, and --workers raises or lowers it.
    workers: Number(parsed.workers ?? Math.max(1, Math.min(4, cpus().length - 1))),
    // Which ProRes encoder writes the file. 'software' is what every clip so far came from; 'hardware'
    // is the chip's own, which is faster and does not produce the same bytes.
    encoder: parsed.encoder ?? 'software',
  };
};

// Where the scene declares its clips go: `~` is the home folder, an absolute path is taken as it is,
// and anything else is relative to the root of the project the tool was run from — never the package,
// which is somewhere in node_modules and is nobody's idea of where a video should land.
const resolveOutputPath = ({ outputPath, projectRoot }) => {
  if (outputPath === '~' || outputPath.startsWith('~/')) {
    return resolve(homedir(), outputPath.slice(2));
  }

  return resolve(projectRoot, outputPath);
};

// Runs the jobs over a fixed number of workers, each taking the next one as it frees up. A job is one
// page and one ffmpeg, so the count is what the machine can hold at 4K rather than what the scene has.
const runPool = async ({ jobs, workers, run }) => {
  let next = 0;
  const take = () => (next < jobs.length ? { job: jobs[next], index: next++ } : null);

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(workers, jobs.length)) }, async () => {
      for (let taken = take(); taken !== null; taken = take()) {
        await run(taken.job);
      }
    }),
  );
};

// The parts of the full cut, joined without being decoded. ProRes is all-intra — every frame is a key
// frame — so a join at a frame boundary is exact, and the result is the same file a single pass would
// have written.
const concatSegments = ({ segments, outPath, listPath }) => {
  // The concat demuxer's own quoting, not the shell's and not JSON's: single quotes, with any single
  // quote in a path closed, escaped and reopened.
  writeFileSync(listPath, segments.map((segment) => `file '${segment.replaceAll("'", String.raw`'\''`)}'`).join('\n'));

  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
};

// Compared by what decodes rather than by file bytes: identical frames — and the same music under them,
// when the cut has any — always decode to the same hash, whatever the container wrote around them.
const decodedHash = (file) => {
  return execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0', '-f', 'md5', '-'], { encoding: 'utf8' }).trim();
};

// Lays the scene's music under a finished cut: the picture copied as it is, the track cut to the length
// of the video and faded out over its last MUSIC_FADE_OUT seconds. Uncompressed 24-bit PCM, the audio a
// ProRes master carries — the picture is not compressed for the edit's sake, and neither is the sound.
const addMusic = async ({ videoPath, musicUrl, seconds }) => {
  const response = await fetch(musicUrl);

  if (!response.ok) {
    throw new Error(`Music not found: ${musicUrl}`);
  }

  const musicPath = `${videoPath}.music${extname(new URL(musicUrl).pathname)}`;
  const mixedPath = `${videoPath}.mixed.${constants.EXTENSION}`;

  writeFileSync(musicPath, Buffer.from(await response.arrayBuffer()));
  execFileSync('ffmpeg', [
    '-v', 'error',
    '-y',
    '-i', videoPath,
    '-i', musicPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'pcm_s24le',
    '-ar', '48000',
    '-af', `afade=t=out:st=${Math.max(0, seconds - constants.MUSIC_FADE_OUT)}:d=${constants.MUSIC_FADE_OUT}`,
    '-t', String(seconds),
    mixedPath,
  ]);
  renameSync(mixedPath, videoPath);
  unlinkSync(musicPath);
};

// Matched by extension too, so a render never removes the .mp4 clips made before every render became a
// .mov — an edit may still be built on them.
const ownsFile = ({ fileName, name, extension }) => {
  return new RegExp(`^${fileName}(-step-\\d+-[a-z0-9-]+)?\\.${extension}$`).test(name);
};

// Brings the output folder in line with a fresh render while disturbing as little as possible, because
// the clips may already be sitting in an edit. Unchanged clips are not written at all. Changed ones are
// written over the existing file — same path, same inode — so the edit picks up the new version instead
// of losing its link. Clips the scene no longer has are removed.
// Copied by the operating system rather than read into memory and written back: a four-minute cut at
// 4K ProRes is over 2 GiB, which is exactly where readFileSync gives up (ERR_FS_FILE_TOO_LARGE) — and
// it gives up at the very end, after the whole scene has been recorded. copyFileSync truncates the
// existing file and writes into it, so a clip already in an edit keeps its inode and its link.
const syncRenders = ({ fileName, renderedDir, outputDir, removeStale, extension }) => {
  mkdirSync(outputDir, { recursive: true });

  const rendered = readdirSync(renderedDir);

  const written = rendered.map((name) => {
    const source = join(renderedDir, name);
    const target = join(outputDir, name);

    if (!existsSync(target)) {
      copyFileSync(source, target);
      return { name, status: 'new' };
    }

    // Hashing a clip decodes every frame of it, which on a four-minute 4K cut is minutes of work — and
    // two files of different length cannot hold the same frames anyway, so the cheap check goes first.
    // It can only ever say "changed", never "unchanged", so nothing is decided by it that the hash
    // would decide differently.
    if (statSync(target).size === statSync(source).size && decodedHash(target) === decodedHash(source)) {
      return { name, status: 'unchanged' };
    }

    copyFileSync(source, target);
    return { name, status: 'updated' };
  });

  const stale = removeStale ? readdirSync(outputDir).filter((name) => ownsFile({ fileName, name, extension }) && !rendered.includes(name)) : [];

  stale.forEach((name) => unlinkSync(join(outputDir, name)));

  return [...written, ...stale.map((name) => ({ name, status: 'removed' }))];
};

const findChrome = () => {
  const found = constants.CHROME_CANDIDATES.find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error(`No Chrome found. Looked in:\n${constants.CHROME_CANDIDATES.join('\n')}`);
  }

  return found;
};

const writeFrame = ({ ffmpegProcess, buffer }) => {
  return new Promise((resolvePromise) => {
    if (ffmpegProcess.stdin.write(buffer)) {
      resolvePromise();
      return;
    }

    ffmpegProcess.stdin.once('drain', resolvePromise);
  });
};

// Switching a state starts a fresh set of CSS transitions. They are caught the moment they exist and
// paused, so the recorder owns their clock: every frame is a seek, not a wait.
//
// Chrome's virtual-time policy would be the obvious tool here and it is the wrong one — with the
// clock stopped the compositor stops producing frames and screenshots time out mid-render.
const startState = ({ page, stateId }) => {
  return page.evaluate(async (targetStateId) => {
    const before = new Set(document.getAnimations());

    window.__onioncut.setState(targetStateId);

    // getAnimations() forces the style recalc that creates the transitions, so they are all here.
    const animations = document.getAnimations();

    // Whatever was already running belongs to the state being left; park it at its end value rather
    // than rewinding it, which would play the previous state backwards under the new one.
    animations.filter((animation) => before.has(animation)).forEach((animation) => animation.finish());

    const hold = (animation) => {
      animation.pause();
      animation.currentTime = 0;
    };

    // Caught and held straight away, because a transition shorter than a frame would be over and gone
    // from getAnimations() by the time anything else ran.
    const immediate = animations.filter((animation) => !before.has(animation));

    immediate.forEach(hold);

    // Then two frames, for whatever the scene starts a moment after the state changes — an animation
    // begun in an effect, which runs after the commit rather than during it. Caught in the same tick
    // as the state change, those are missed, and they are missed only sometimes: the clip is then a
    // different length, or settles early and freezes a picture that is still moving.
    await Promise.race([
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]);

    const late = document.getAnimations().filter((animation) => !before.has(animation) && !immediate.includes(animation));

    late.forEach(hold);

    window.__recordedAnimations = [...immediate, ...late];
  }, stateId);
};

// Clamped per animation, because they do not all end together — delays and durations differ per card.
const seekState = ({ page, timeInState }) => {
  return page.evaluate((targetTime) => {
    window.__recordedAnimations.forEach((animation) => {
      const timing = animation.effect.getComputedTiming();

      animation.currentTime = Math.min(targetTime, (timing.delay ?? 0) + (timing.activeDuration ?? 0));
    });
  }, timeInState);
};

// When the last transition of the state just started lands, in milliseconds. startState has caught
// and paused every one of them, so this is known before a single frame is taken.
// Two different questions, and mixing them up freezes the picture: how long a step should last is
// decided by the stage alone — with --marketing the row of steps has a progress bar that runs for the
// whole hold by design, and counting it would stretch every clip — while "from here on every frame is
// the same" has to account for everything on screen, that progress bar included.
const transitionEnd = ({ page, stageOnly }) => {
  return page.evaluate((onlyStage) => {
    const stage = document.querySelector('[data-stage]');
    const animations = onlyStage && stage ? window.__recordedAnimations.filter((animation) => stage.contains(animation.effect.target)) : window.__recordedAnimations;

    return Math.max(
      0,
      ...animations.map((animation) => {
        const timing = animation.effect.getComputedTiming();

        return (timing.delay ?? 0) + (timing.activeDuration ?? 0);
      }),
    );
  }, stageOnly);
};

export const runRecord = async ({ config, flags }) => {
  const args = parseArgs(flags);

  console.log('Building…');

  const viteConfig = await createViteConfig({ config });

  const { build } = await import('vite');
  await build({ ...viteConfig, logLevel: 'warn' });

  // Not a fixed port: another preview left running in some other checkout should not be the reason a
  // render cannot happen at all. --record-port names one when it matters.
  const previewServer = await preview({ ...viteConfig, preview: { port: Number(flags['record-port'] ?? 5201), strictPort: false }, logLevel: 'warn' });
  const baseUrl = previewServer.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--hide-scrollbars', '--disable-lcd-text', `--force-device-scale-factor=${constants.SCALE}`, '--font-render-hinting=none'],
  });

  let renderedDir = null;

  try {
    // The stage and the marketing frame are the scene's own, read off the page: two copies of a size drift
    // apart, and the recorder would then photograph a different box than the one the scene is laid out in.
    const readFrames = async () => {
      const page = await browser.newPage();

      await page.goto(`${baseUrl}/?scene=${args.scene}&recording=1`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => window.__onioncut?.isReady() === true, { timeout: 30_000 });

      const measured = await page.evaluate(() => ({ stage: window.__onioncut.stage, marketingFrame: window.__onioncut.marketingFrame }));

      await page.close();

      return measured;
    };

    const measuredFrames = await readFrames();
    const frame = args.marketing ? measuredFrames.marketingFrame : measuredFrames.stage;
    // Every clip gets a page of its own. One page carried through a full cut and then the step clips
    // died around its six-hundredth screenshot with a detached frame — Chrome's renderer does not
    // survive that many in one tab. A fresh page also means no clip inherits anything from the last.
    // Opened straight at a state, rather than at the first one and stepped forward. A scene is a pure
    // function of its state — the same markup for the same id — so the pose reached by opening at a
    // state is the pose reached by walking to it, and the transition out of it is created the same way.
    // Walking there cost one style recalc per state passed, which over a scene of sixty-five beats is
    // most of the render.
    const openScenePage = async ({ stateId } = {}) => {
      const page = await browser.newPage();

      page.on('error', (error) => console.error(`  page crashed: ${error.message}`));
      page.on('pageerror', (error) => console.error(`  page error: ${error.message}`));

      await page.setViewport({ width: frame.width, height: frame.height, deviceScaleFactor: constants.SCALE });
      await page.goto(
        `${baseUrl}/?scene=${args.scene}&recording=1${stateId ? `&state=${encodeURIComponent(stateId)}` : ''}${args.marketing ? '&marketing=1' : ''}${args.transparent ? '&transparent=1' : ''}`,
        { waitUntil: 'networkidle0' },
      );
      await page.waitForFunction(() => window.__onioncut?.isReady() === true, { timeout: 30_000 });

      // Every image has to be decoded and every card measured before the clock is taken over, or the
      // wall re-packs itself in the middle of the recording.
      await page.evaluate(() => Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined))));
      await page.evaluate(() => document.fonts.ready);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));

      return page;
    };

    const firstPage = await openScenePage();

    // Frames come from where each state ends on the timeline, not from rounding its own length. A half
    // second holds either side of four 0.75s beats is 22.5 frames per beat — rounded per state that is
    // 4.07s, rounded against the timeline it is 4.00s, with the half-frames shared out along the way.
    const holds = (await firstPage.evaluate(() => window.__onioncut.states)).map((state) => ({ id: state.id, hold: args.hold ?? state.hold }));
    const states = holds.map((state, index) => {
      const secondsBefore = holds.slice(0, index).reduce((total, previous) => total + previous.hold, 0);

      return { id: state.id, frames: Math.round((secondsBefore + state.hold) * constants.FPS) - Math.round(secondsBefore * constants.FPS) };
    });
    const totalFrames = states.reduce((total, state) => total + state.frames, 0);

    // What the scene wants made of itself and where — declared in its definition, read off the page.
    const render = await firstPage.evaluate(() => window.__onioncut.render);
    // A marketing take is not part of any edit, so it has no business sitting next to the clips the cut
    // is built from — it goes straight to the desktop, where it is picked up and posted.
    // --out is for checking a render without touching the folder an edit is already linked to. It
    // never removes anything, for the same reason --only does not: what is in there is not this run's.
    const outputDir = args.out
      ? resolveOutputPath({ outputPath: args.out, projectRoot: config.projectRoot })
      : args.marketing
        ? resolve(homedir(), 'Desktop')
        : resolveOutputPath({ outputPath: render.outputPath, projectRoot: config.projectRoot });
    // A marketing take is one video of the tool in use, whatever the scene declares: step clips are for
    // cutting, and nobody cuts this one.
    const variants = args.marketing ? { fullCut: true, stepClips: false } : render.variants;

    if (!variants.fullCut && !variants.stepClips && !args.only) {
      throw new Error(`Scene "${args.scene}" declares no render variant — nothing to record`);
    }

    // Rendered somewhere private first and only then synced across, so a render that dies half-way never
    // leaves a half-written clip where the edit can see it.
    renderedDir = mkdtempSync(join(tmpdir(), 'onioncut-'));
    // The clips are named after the scene's fileName, animation-<folder>-<scene>. The framed cut is a
    // different video of the same scene, so it is named differently — a marketing take must never
    // overwrite the clean one the edit is built on.
    const fileName = await firstPage.evaluate(() => window.__onioncut.fileName);
    // Only the full cut gets the music: step clips are cut up in the edit, where one track runs under
    // them all. A marketing take stays silent — a post plays muted in the feed anyway, and a track that
    // may carry a copyright claim is not worth getting it muted or taken down.
    const music = args.marketing ? null : await firstPage.evaluate(() => window.__onioncut.music ?? null);
    const name = args.marketing ? `${fileName}-marketing` : fileName;
    const fullName = `${name}.${constants.EXTENSION}`;
    const stepName = ({ stateId, index }) => {
      return `${name}-step-${index + 1}-${slugify(stateId)}.${constants.EXTENSION}`;
    };

    console.log(
      `Recording ${args.scene}: ${states.map((state) => `${state.id} ${(state.frames / constants.FPS).toFixed(2)}s`).join(', ')} = ${(totalFrames / constants.FPS).toFixed(1)}s at ${frame.width * constants.SCALE}×${frame.height * constants.SCALE}`,
    );

    // prores_ks is the software encoder and the one the output has always come from. On Apple silicon
    // there is also a ProRes block in the chip, reached through prores_videotoolbox — same codec and
    // same 4444 profile, a different encoder, so the file is not byte for byte the same one.
    const encoderArguments = () => {
      if (args.encoder === 'hardware') {
        return [
          '-c:v', 'prores_videotoolbox',
          '-profile:v', '4444',
          // Its own 4:4:4 formats: sixteen bits with alpha, sixteen bits without. yuv444p is not one
          // of the formats it takes.
          '-pix_fmt', args.transparent ? 'ayuv64le' : 'p416le',
          '-allow_sw', '0',
        ];
      }

      return [
        '-c:v', 'prores_ks',
        '-profile:v', '4444',
        '-pix_fmt', args.transparent ? 'yuva444p10le' : 'yuv444p12le',
        '-qscale:v', '4',
        '-vendor', 'apl0',
      ];
    };

    const startEncoder = (outPath) => {
      return spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(constants.FPS), '-i', '-', ...encoderArguments(), outPath], {
        stdio: ['pipe', 'inherit', 'inherit'],
      });
    };

    const closeEncoder = (ffmpegProcess) => {
      ffmpegProcess.stdin.end();

      return new Promise((resolvePromise, rejectPromise) => {
        ffmpegProcess.on('close', (code) => (code === 0 ? resolvePromise() : rejectPromise(new Error(`ffmpeg exited with ${code}`))));
      });
    };

    let screenshotCount = 0;
    let frameCount = 0;

    // Once the state's last transition has landed, every remaining frame is the same picture — so it is
    // taken once and written as many times as the state still needs. A hold costs nothing to render,
    // and the output is byte for byte what shooting every frame would give.
    const recordFrames = async ({ page, frames, ffmpegProcess }) => {
      const settledAt = await transitionEnd({ page, stageOnly: false });
      let settledScreenshot = null;

      for (let frame = 0; frame < frames; frame += 1) {
        const time = (frame * 1000) / constants.FPS;

        frameCount += 1;

        if (settledScreenshot) {
          await writeFrame({ ffmpegProcess, buffer: settledScreenshot });
          continue;
        }

        await seekState({ page, timeInState: time });

        const screenshot = await page.screenshot({ type: 'png', optimizeForSpeed: true, captureBeyondViewport: false, omitBackground: args.transparent });

        screenshotCount += 1;

        if (time >= settledAt) {
          settledScreenshot = screenshot;
        }

        await writeFrame({ ffmpegProcess, buffer: screenshot });
      }
    };

    const recordState = async ({ page, state, ffmpegProcess }) => {
      await startState({ page, stateId: state.id });
      await recordFrames({ page, frames: state.frames, ffmpegProcess });
    };
    const startedAt = Date.now();
    const elapsed = () => {
      return `${Math.round((Date.now() - startedAt) / 1000)}s`;
    };

    // The page opens on the state before this step, which is where the clip starts, and the step's own
    // transition is then the first thing that happens on it.
    const recordStepClip = async ({ state, index }) => {
      const page = await openScenePage({ stateId: index === 0 ? undefined : states[index - 1].id });

      await startState({ page, stateId: state.id });

      const frames = Math.round(((await transitionEnd({ page, stageOnly: true })) / 1000 + args.stepHold) * constants.FPS);
      const ffmpegProcess = startEncoder(join(renderedDir, stepName({ stateId: state.id, index })));

      await recordFrames({ page, frames, ffmpegProcess });
      await closeEncoder(ffmpegProcess);
      await page.close();

      console.log(`  step ${index + 1}/${states.length} · ${state.id} · ${(frames / constants.FPS).toFixed(2)}s rendered · ${elapsed()}`);
    };

    const sync = ({ removeStale }) => {
      const results = syncRenders({ fileName: name, renderedDir, outputDir, removeStale, extension: constants.EXTENSION });

      console.log(`\nDone in ${elapsed()} — ${screenshotCount} screenshots for ${frameCount} frames → ${outputDir}`);
      results.forEach((result) => console.log(`  ${result.status.padEnd(9)}  ${result.name}`));
    };

    if (args.only) {
      const onlyIndex = states.findIndex((state) => state.id === args.only);

      if (onlyIndex === -1) {
        throw new Error(`Unknown state "${args.only}". Available: ${states.map((state) => state.id).join(', ')}`);
      }

      await firstPage.close();
      await recordStepClip({ state: states[onlyIndex], index: onlyIndex });

      // Only this step was rendered, so nothing else in the folder is stale — the other clips stay.
      sync({ removeStale: false });
      return;
    }

    await firstPage.close();

    // The full cut, one state at a time and several at once. A state starts from the pose the state
    // before it ended in, and a page opened straight at that state is already in that pose — which is
    // what makes the parts independent, and is also how a step clip finds its start. The parts are
    // then joined without being decoded.
    if (variants.fullCut) {
      const segmentsDir = mkdtempSync(join(tmpdir(), 'onioncut-parts-'));
      let doneFrames = 0;

      const recordSegment = async ({ state, index }) => {
        const page = await openScenePage({ stateId: index === 0 ? undefined : states[index - 1].id });

        const segmentPath = join(segmentsDir, `${String(index).padStart(4, '0')}.${constants.EXTENSION}`);
        const ffmpegProcess = startEncoder(segmentPath);

        await recordState({ page, state, ffmpegProcess });
        await closeEncoder(ffmpegProcess);
        await page.close();

        doneFrames += state.frames;

        console.log(`  full ${doneFrames}/${totalFrames} frames · ${(doneFrames / ((Date.now() - startedAt) / 1000)).toFixed(1)} fps · ${elapsed()}`);
      };

      try {
        await runPool({ jobs: states.map((state, index) => ({ state, index })), workers: args.workers, run: recordSegment });

        concatSegments({
          segments: states.map((_, index) => join(segmentsDir, `${String(index).padStart(4, '0')}.${constants.EXTENSION}`)),
          outPath: join(renderedDir, fullName),
          listPath: join(segmentsDir, 'parts.txt'),
        });

        if (music) {
          await addMusic({ videoPath: join(renderedDir, fullName), musicUrl: new URL(music, `${baseUrl}/`).href, seconds: totalFrames / constants.FPS });
          console.log('  music laid under the full cut');
        }
      } finally {
        rmSync(segmentsDir, { recursive: true, force: true });
      }
    }

    if (variants.stepClips) {
      await runPool({
        jobs: states.map((state, index) => ({ state, index })),
        workers: args.workers,
        run: recordStepClip,
      });
    }

    // A variant the scene turned off is one it no longer has, so its files are stale like a removed
    // step. Not with --out: that folder is somebody else's, and this run is only visiting.
    sync({ removeStale: !args.out });
  } finally {
    await browser.close();
    await previewServer.close();

    if (renderedDir) {
      rmSync(renderedDir, { recursive: true, force: true });
    }
  }
};
