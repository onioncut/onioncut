// Which faces the page will actually need, worked out from the Google Fonts URLs rather than listed by
// hand in a scene. A list in a scene falls out of date the moment someone sets a heading in a weight
// that is not in it, and the render is the place that finds out.
//
// A browser fetches a web font only when something is laid out in it, so waiting for
// document.fonts.ready proves nothing: text that first appears in the twelfth beat is still
// unrequested when the first frame is taken, and gets photographed in the fallback face.

// Inside a range, the weights anything is realistically set in. The edges are always loaded, so a
// 300..900 range comes out as 300, 400, 500, 600, 700, 900 rather than one face per step.
const COMMON_WEIGHTS = [400, 500, 600, 700];

const expandWeights = (value) => {
  const [from, to] = value.split('..').map(Number);

  if (to === undefined) {
    return Number.isNaN(from) ? [400] : [from];
  }

  return [...new Set([from, ...COMMON_WEIGHTS.filter((weight) => weight > from && weight < to), to])];
};

// family=Fraunces:opsz,wght@9..144,400;9..144,600 — the axes are named once, then one tuple per face,
// so the weight is read out of the tuple at the position the axis list gives it.
const facesOfFamily = (parameter) => {
  const [rawName, spec] = parameter.split(':');
  const name = decodeURIComponent(rawName).replace(/\+/g, ' ');

  if (!spec || !spec.includes('@')) {
    return [{ name, weight: 400, italic: false }];
  }

  const [axisPart, tuplePart] = spec.split('@');
  const axes = axisPart.split(',');
  const weightAxis = axes.indexOf('wght');
  const italicAxis = axes.indexOf('ital');

  return tuplePart.split(';').flatMap((tuple) => {
    const values = tuple.split(',');
    const italic = italicAxis >= 0 && values[italicAxis] === '1';
    const weights = weightAxis >= 0 ? expandWeights(values[weightAxis]) : [400];

    return weights.map((weight) => ({ name, weight, italic }));
  });
};

// The shorthand document.fonts.load() takes. The size is arbitrary and only has to be there.
const toFontSpec = ({ name, weight, italic }) => `${italic ? 'italic ' : ''}${weight} 1em "${name}"`;

export const parseGoogleFonts = (urls) => {
  const faces = urls.flatMap((url) => {
    const query = url.split('?')[1];

    if (!query) {
      return [];
    }

    return new URLSearchParams(query).getAll('family').flatMap(facesOfFamily);
  });

  return [...new Set(faces.map(toFontSpec))];
};
