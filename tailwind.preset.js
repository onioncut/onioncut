// The palette and type the tool's own chrome is drawn in, handed to every project that uses it. A
// project adds its own brand on top — `presets: [videoAnimationsPreset]` in its tailwind.config.js —
// and overrides whatever it wants; nothing in the tool refers to a colour by name except `stage`, the
// paper the stage is made of.
//
// Plain JavaScript rather than TypeScript, because this file is loaded by PostCSS in Node, outside
// anything that could transpile it.

/** @type {import('tailwindcss').Config} */
const preset = {
  // A preset declares no content of its own: which files are scanned is worked out by the CLI from the
  // project's scene folders, so a project never has to know where the tool keeps its own components.
  content: [],
  theme: {
    extend: {
      colors: {
        stage: '#F3EEE6',
        ink: {
          100: '#E8E3DA',
          400: '#8C857A',
          700: '#3D3931',
          900: '#1C1A16',
        },
        accent: {
          coral: '#E4674B',
          amber: '#E8A33D',
          sage: '#6E9B6B',
          sky: '#4E86B5',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default preset;
