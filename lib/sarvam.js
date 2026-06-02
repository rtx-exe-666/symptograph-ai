const SARVAM_BASE = 'https://api.sarvam.ai';

export function isSarvamConfigured() {
  return !!(
    process.env.SARVAM_API_KEY &&
    process.env.SARVAM_API_KEY !== 'your_sarvam_key_here'
  );
}

function sarvamHeaders(extra = {}) {
  return {
    'api-subscription-key': process.env.SARVAM_API_KEY,
    ...extra,
  };
}

/**
 * Translate text to a target Indian language.
 */
export async function translateText(text, targetLang) {
  if (!isSarvamConfigured()) throw new Error('Sarvam not configured');
  if (targetLang === 'en-IN') return text; // no translation needed

  const res = await fetch(`${SARVAM_BASE}/translate`, {
    method: 'POST',
    headers: sarvamHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      input: text,
      source_language_code: 'en-IN',
      target_language_code: targetLang,
      speaker_gender: 'Female',
      mode: 'formal',
      enable_preprocessing: true,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam translate error: ${err}`);
  }
  const data = await res.json();
  return data.translated_text || text;
}

/**
 * Text-to-Speech using Sarvam Bulbul v2.
 */
export async function textToSpeech(text, targetLang = 'en-IN') {
  if (!isSarvamConfigured()) throw new Error('Sarvam not configured');

  // Trim text to 500 chars (API limit per call)
  const trimmed = text.slice(0, 500);
  const speaker = 'anushka';

  const res = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: sarvamHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      inputs: [trimmed],
      target_language_code: targetLang,
      speaker,
      model: 'bulbul:v2',
      enable_preprocessing: true,
      speech_sample_rate: 22050,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn('Sarvam TTS failed:', err);
    return null;
  }
  const data = await res.json();
  return data.audios?.[0] || null;
}

/**
 * Speech-to-Text using Sarvam Saaras v2.5.
 */
export async function speechToText(audioBuffer, mimeType, langCode = 'hi-IN') {
  if (!isSarvamConfigured()) throw new Error('Sarvam not configured');

  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  form.append('file', blob, 'audio.webm');
  form.append('language_code', langCode);
  form.append('model', 'saarika:v2.5');

  const res = await fetch(`${SARVAM_BASE}/speech-to-text`, {
    method: 'POST',
    headers: sarvamHeaders(), 
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sarvam STT error: ${err}`);
  }
  const data = await res.json();
  return data.transcript || '';
}
