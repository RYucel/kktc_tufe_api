/**
 * Türkçe karakter duyarlı URL dostu slug üretir
 */
export function slugify(text) {
  if (!text) return "";

  const trMap = {
    ç: "c", Ç: "c",
    ğ: "g", Ğ: "g",
    ı: "i", İ: "i",
    ö: "o", Ö: "o",
    ş: "s", Ş: "s",
    ü: "u", Ü: "u",
  };

  let clean = String(text);
  for (const [key, val] of Object.entries(trMap)) {
    clean = clean.replaceAll(key, val);
  }

  return clean
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
