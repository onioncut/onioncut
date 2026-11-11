#!/usr/bin/env node
import { readProjectConfig } from '../src/cli/readProjectConfig.mjs';

const USAGE = `onioncut <command>

  init           Set a project up: the config, a Tailwind config, a folder for shared components
  new <path>     Scaffold a scene folder — anywhere the project's "scenes" globs reach
                 (--group names the heading it sits under, --out where its clips go)
  dev            Open the scenes in a browser and tune them
  build          Build the preview once, to check it compiles
  record         Render a scene into 4K ProRes clips

  --config=<path>       The project's onioncut.config.json
  --port=<number>       Dev server port (default 5200)
  --host                Listen on every interface, not just localhost

Recording:

  --scene=<key>         Which scene, as <folder>-<scene>
  --only=<state>        Re-cut one step
  --transparent         Keep the alpha channel
  --marketing           The framed view, as .mp4 into <outDir>/marketing
  --out=<dir>           Write this run somewhere else, leaving the scene's own folder alone
  --record-port=<n>     The recorder's own preview server (default 5201, next free if taken)
  --workers=<n>         How many clips to record at once (default 4, or fewer cores)
  --encoder=<which>     software (default) or hardware, the chip's own ProRes encoder

Everything else is passed to the command: see --scene, --only, --transparent, --marketing.`;

// Both --port=5300 and --port 5300 are written by everyone, and a flag that is quietly ignored is
// worse than one that is rejected: the server comes up on the wrong port and nothing says why.
const parseFlags = (argv) => {
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = argument.slice(2).split('=');

    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];

    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      index += 1;
      continue;
    }

    flags[key] = 'true';
  }

  return flags;
};

const KNOWN_FLAGS = {
  init: ['help'],
  new: ['out', 'group', 'help'],
  dev: ['config', 'port', 'host', 'help'],
  build: ['config', 'help'],
  record: ['config', 'scene', 'only', 'hold', 'step-hold', 'marketing', 'transparent', 'out', 'record-port', 'workers', 'encoder', 'help'],
};

const rejectUnknownFlags = ({ command, flags }) => {
  const known = KNOWN_FLAGS[command];
  const unknown = Object.keys(flags).filter((flag) => !known.includes(flag));

  if (unknown.length > 0) {
    throw new Error(`Unknown ${unknown.length === 1 ? 'flag' : 'flags'} for "${command}": ${unknown.map((flag) => `--${flag}`).join(', ')}\n\n${USAGE}`);
  }
};

const run = async () => {
  const argv = process.argv.slice(2);
  const flags = parseFlags(argv);
  // Only a leading word is the command: everything after it that is not a flag is a flag's value.
  const [command = 'dev'] = argv[0] && !argv[0].startsWith('--') ? [argv[0]] : [];

  if (command === 'help' || flags.help) {
    console.log(USAGE);
    return;
  }

  if (!KNOWN_FLAGS[command]) {
    throw new Error(`Unknown command "${command}".\n\n${USAGE}`);
  }

  rejectUnknownFlags({ command, flags });

  if (command === 'init') {
    const { initProject } = await import('../src/cli/initProject.mjs');

    initProject({ cwd: process.cwd() });
    return;
  }

  if (command === 'new') {
    const [, scenePath] = argv.filter((argument) => !argument.startsWith('--'));

    if (!scenePath) {
      throw new Error(`new needs a path for the scene folder, e.g.\n  onioncut new videos/my-video/animations/intro`);
    }

    const { newScene } = await import('../src/cli/newScene.mjs');

    newScene({ cwd: process.cwd(), scenePath, outputPath: flags.out ?? null, group: flags.group ?? null });
    return;
  }

  // Read before anything is started, so a project that names no scenes is told so in a line rather than
  // after a browser and a build have come up around an empty page.
  const config = readProjectConfig({ cwd: process.cwd(), configPath: flags.config ?? null });

  if (command === 'record') {
    const { runRecord } = await import('../src/cli/record.mjs');
    await runRecord({ config, flags });
    return;
  }

  const { createViteConfig } = await import('../src/cli/createViteConfig.mjs');

  const viteConfig = await createViteConfig({
    config,
    port: flags.port ? Number(flags.port) : 5200,
    host: flags.host === 'true' ? true : flags.host,
  });

  if (command === 'build') {
    const { build } = await import('vite');
    await build(viteConfig);
    return;
  }

  const { createServer } = await import('vite');
  const server = await createServer(viteConfig);

  await server.listen();
  server.printUrls();
};

run().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
