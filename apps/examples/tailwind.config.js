// The example scenes are drawn in the tool's own preset and add nothing of their own — a real project
// puts its brand here. `content` is left out on purpose: the CLI works it out from the scene folders.
import preset from 'onioncut/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
};
