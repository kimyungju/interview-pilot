const IN_APP_PATTERNS: [RegExp, string][] = [
  [/KAKAOTALK/i, "KakaoTalk"],
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV/i, "Facebook"],
  [/Line\//i, "LINE"],
  [/NAVER/i, "NAVER"],
  [/Twitter/i, "Twitter"],
  [/Snapchat/i, "Snapchat"],
  [/; wv\)/i, "WebView"],
];

export function getInAppBrowserName(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  for (const [pattern, name] of IN_APP_PATTERNS) {
    if (pattern.test(ua)) return name;
  }
  return null;
}

export function isInAppBrowser(): boolean {
  return getInAppBrowserName() !== null;
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getExternalBrowserUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = window.location.href;

  if (isAndroid()) {
    const parsed = new URL(url);
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  return null;
}
