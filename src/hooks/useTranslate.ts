import { useState, useCallback } from 'react';

interface UseTranslateResult {
  translate: (text: string) => Promise<void>;
  translatedText: string | null;
  detectedLanguage: string | null;
  isTranslating: boolean;
  showOriginal: boolean;
  toggleOriginal: () => void;
  error: string | null;
}

export function useTranslate(): UseTranslateResult {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string) => {
      // If already translated, just toggle to show translation
      if (translatedText) {
        setShowOriginal(false);
        return;
      }

      setIsTranslating(true);
      setError(null);

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || 'Translation failed');
        }

        setTranslatedText(data.data.translatedText);
        setDetectedLanguage(data.data.detectedLanguage);
        setShowOriginal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Translation failed');
      } finally {
        setIsTranslating(false);
      }
    },
    [translatedText]
  );

  const toggleOriginal = useCallback(() => {
    setShowOriginal((prev) => !prev);
  }, []);

  return {
    translate,
    translatedText,
    detectedLanguage,
    isTranslating,
    showOriginal,
    toggleOriginal,
    error,
  };
}
