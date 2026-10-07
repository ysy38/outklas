/** Source metadata keys that may hold free text (titles, provider names, URLs, file names). */
const metadataKeys = new Set(["title", "name", "url", "termsUrl", "file", "authors"]);

const code = /^[A-Za-z0-9_:.+\-]{0,64}$/;

function allowedProse(path: string, key: string, value: string) {
  if (/^\$\.(sources|sourceDocuments)\[\d+\]\./.test(path)) return metadataKeys.has(key) || /\.authors\[\d+\]$/.test(path);
  return /^\$\.proposals\[\d+\]\.name$/.test(path) && /^[a-z0-9]+( [a-z0-9]+)*$/.test(value) && value.length <= 64;
}

/** Throws if anything outside source metadata looks like prose rather than a code, reference, number or hash. */
export function assertTextFree(value: unknown, path = "$", key = ""): void {
  if (typeof value === "string") {
    if (!code.test(value) && !allowedProse(path, key, value)) throw new Error(`${path} is not text-free: ${JSON.stringify(value.slice(0, 40))}`);
    return;
  }
  if (Array.isArray(value)) value.forEach((item, index) => assertTextFree(item, `${path}[${index}]`, key));
  else if (value && typeof value === "object") for (const [name, inner] of Object.entries(value)) assertTextFree(inner, `${path}.${name}`, name);
}
