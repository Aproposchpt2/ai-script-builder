export type LocalizationItem = {
  id: string;
  text: string;
  type: 'flow-message' | 'kb-article' | 'prompt' | 'transcript';
};

export type LocalizationRequest = {
  sourceLanguage: string;
  targetLanguage: string;
  items: LocalizationItem[];
};

export type LocalizationResult = {
  sourceLanguage: string;
  targetLanguage: string;
  translations: Array<{
    id: string;
    original: string;
    translated: string;
    warnings: string[];
  }>;
  validation: {
    warnings: string[];
    errors: string[];
  };
};

function fakeTranslate(text: string, targetLanguage: string): string {
  return `[${targetLanguage}] ${text}`;
}

export function translateContent(input: LocalizationRequest): LocalizationResult {
  const translations = input.items.map((item) => {
    const translated = fakeTranslate(item.text, input.targetLanguage);
    const warnings: string[] = [];
    if (item.text.includes('{') && !translated.includes('{')) warnings.push('Placeholder mismatch risk.');
    return { id: item.id, original: item.text, translated, warnings };
  });

  const validation = validateLocalization({ ...input, items: input.items, translations: translations.map((t) => t.translated) });
  return {
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    translations,
    validation,
  };
}

export function validateLocalization(input: LocalizationRequest & { translations?: string[] }) {
  const warnings: string[] = [];
  const errors: string[] = [];
  input.items.forEach((item, idx) => {
    const translated = input.translations?.[idx];
    if (!item.text.trim()) errors.push(`Item ${item.id} is empty.`);
    if (translated && item.text.includes('{') && !translated.includes('{')) errors.push(`Item ${item.id} dropped variable placeholders.`);
    if (translated && translated.length < Math.round(item.text.length * 0.4)) warnings.push(`Item ${item.id} translation may be truncated.`);
  });
  return { warnings, errors };
}

export function exportLocalization(input: LocalizationRequest) {
  const result = translateContent(input);
  return {
    localizedFlow: result.translations,
    metadata: {
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      generatedAt: new Date().toISOString(),
    },
    validation: result.validation,
  };
}

