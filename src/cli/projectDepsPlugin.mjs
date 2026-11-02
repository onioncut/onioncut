import { join } from 'node:path';

// A bare import names a package: not a relative or absolute path, not a virtual module, not a URL.
const isBareImport = (id) => /^[@\w]/.test(id) && !id.includes(':');

// A scene imports libraries the way any file does, and Node looks for them in the node_modules of
// every folder above the scene. But the libraries are installed where the tool is run from, and a
// scene need not sit under that: a monorepo keeps its scenes in the repository root and runs the tool
// from tools/onioncut, whose node_modules no folder above a scene ever passes through. So a
// bare import that found nothing is looked up a second time as if it were written in that package.
// Only the misses come here, so a scene that sits under its package resolves exactly as before.
export const projectDepsPlugin = ({ projectPackageDir }) => {
  // Any file in the package does as the importer; resolution only reads the folder it is in.
  const packageImporter = join(projectPackageDir, 'package.json');

  return {
    name: 'onioncut:project-deps',
    async resolveId(id, importer, options) {
      if (!importer || importer === packageImporter || !isBareImport(id)) {
        return null;
      }

      return this.resolve(id, packageImporter, { ...options, skipSelf: true });
    },
  };
};
