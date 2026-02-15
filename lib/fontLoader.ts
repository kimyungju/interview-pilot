let cachedFont: string | null = null;

export async function loadNotoSansKR(): Promise<string> {
  if (cachedFont) return cachedFont;

  const res = await fetch("/fonts/NotoSansKR-Regular.ttf");
  const buf = await res.arrayBuffer();

  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFont = btoa(binary);
  return cachedFont;
}
