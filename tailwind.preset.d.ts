import type { Config } from 'tailwindcss';

// Typed from the package's own Tailwind, so a project that builds on the preset does not have to carry
// tailwindcss as a dependency of its own just to name the type of its config.
declare const preset: Config;

export default preset;
