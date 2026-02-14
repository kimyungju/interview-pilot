export type VoiceGender = "male" | "female";

const STORAGE_KEY = "interview-voice-gender";

const FEMALE_NAMES = [
  "jenny", "zira", "aria", "sara", "samantha", "karen", "moira", "tessa",
  "fiona", "victoria", "ava", "susan", "hazel", "catherine", "kate",
  "emily", "siri female", "google uk english female", "female",
];

const MALE_NAMES = [
  "guy", "david", "mark", "james", "daniel", "george", "alex", "fred",
  "tom", "ralph", "bruce", "lee", "ryan", "rishi", "aaron",
  "siri male", "google uk english male", "male",
];

export function getStoredVoiceGender(): VoiceGender {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "male" || stored === "female") return stored;
  } catch {}
  return "female";
}

export function setStoredVoiceGender(gender: VoiceGender): void {
  try {
    localStorage.setItem(STORAGE_KEY, gender);
  } catch {}
}

export function classifyVoiceGender(
  voice: SpeechSynthesisVoice
): VoiceGender | null {
  const name = voice.name.toLowerCase();
  if (FEMALE_NAMES.some((f) => name.includes(f))) return "female";
  if (MALE_NAMES.some((m) => name.includes(m))) return "male";
  return null;
}

export function scoreVoiceQuality(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes("online") || name.includes("neural")) score += 20;
  if (name.includes("premium")) score += 15;
  if (!voice.localService || name.includes("enhanced")) score += 10;
  if (name.includes("microsoft")) score += 5;
  if (name.includes("google")) score += 3;
  return score;
}

export function selectVoice(
  voices: SpeechSynthesisVoice[],
  preferredGender: VoiceGender
): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.startsWith("en"));
  if (english.length === 0) return null;

  const matched = english.filter(
    (v) => classifyVoiceGender(v) === preferredGender
  );
  if (matched.length > 0) {
    return matched.sort((a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a))[0];
  }

  const unclassified = english.filter((v) => classifyVoiceGender(v) === null);
  if (unclassified.length > 0) {
    return unclassified.sort(
      (a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a)
    )[0];
  }

  return english.sort(
    (a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a)
  )[0];
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        onVoicesChanged
      );
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

    setTimeout(() => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        onVoicesChanged
      );
      resolve(window.speechSynthesis.getVoices());
    }, 3000);
  });
}
