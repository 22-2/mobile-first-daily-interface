export function ensureExtension(path: string, dotext = ".md"): string {
  return path.endsWith(dotext) ? path : `${path}${dotext}`;
}

// export function ensureUniqueName(name: string, getExisting: (name: string) => boolean): string {
//   if (!getExisting(name)) return name;

//   const extIndex = name.lastIndexOf(".");
//   const base = extIndex >= 0 ? name.slice(0, extIndex) : name;
//   const ext = extIndex >= 0 ? name.slice(extIndex) : "";

//   for (let i = 1; ; i++) {
//     const candidate = `${base} ${i}${ext}`;
//     if (!getExisting(candidate)) return candidate;
//   }
// }
