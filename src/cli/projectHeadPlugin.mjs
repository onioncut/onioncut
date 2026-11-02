import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGoogleFonts } from './parseGoogleFonts.mjs';

export const VIRTUAL_FONTS = 'virtual:onioncut-fonts';
const RESOLVED_VIRTUAL_FONTS = `\0${VIRTUAL_FONTS}`;

// display=block, never swap, for the same reason the tool's own font uses it: a render must not
// photograph a fallback face while the real one is still loading.
const withDisplayBlock = (href) => {
  if (!href.includes('fonts.googleapis.com') || href.includes('display=')) {
    return href;
  }

  return `${href}${href.includes('?') ? '&' : '?'}display=block`;
};

// The tool's own font is in its index.html, the project's come from its config, and both have to be
// waited for before the first frame — so they are read from the one place each is written.
const toolFontUrls = (packageRoot) => {
  const html = readFileSync(join(packageRoot, 'index.html'), 'utf8');

  return [...html.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"/g)].map((match) => match[1]);
};

// What a project adds to the page itself: the web fonts its scenes are set in, and a stylesheet of its
// own. The tool's index.html can only know about its own font, and a scene photographed in a fallback
// face is a scene that has to be recorded again.
export const projectHeadPlugin = ({ packageRoot, fonts, stylesheet }) => {
  return {
    name: 'onioncut:project-head',
    transformIndexHtml: () => [
      ...fonts.map((href) => ({ tag: 'link', attrs: { rel: 'stylesheet', href: withDisplayBlock(href) }, injectTo: 'head' })),
      ...(stylesheet ? [{ tag: 'link', attrs: { rel: 'stylesheet', href: `/@fs${stylesheet}` }, injectTo: 'head' }] : []),
    ],
    resolveId: (id) => (id === VIRTUAL_FONTS ? RESOLVED_VIRTUAL_FONTS : undefined),
    load: (id) => {
      if (id !== RESOLVED_VIRTUAL_FONTS) {
        return undefined;
      }

      const specs = parseGoogleFonts([...toolFontUrls(packageRoot), ...fonts]);

      return `export const fontSpecs = ${JSON.stringify(specs, null, 2)};\n`;
    },
  };
};
