import { fileURLToPath } from 'node:url';

// PowerShell cannot read files inside Electron's app.asar archive. Packaged
// builds unpack scripts/*.ps1 (package.json build.asarUnpack), so point the
// child process at the unpacked copy; source runs keep the original path.
export function unpackedPath(path) {
  return path.replace(/([\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2');
}

export function helperScriptPath(name, base = import.meta.url) {
  return unpackedPath(fileURLToPath(new URL('./' + name, base)));
}
