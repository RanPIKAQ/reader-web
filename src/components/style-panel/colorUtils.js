export function normalizeColor(color) {
  return (color || '').trim().toLowerCase();
}

export function formatHexColor(color, fallback = '#000000') {
  const normalized = normalizeColor(color);

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized.toUpperCase()}`;
  }

  return fallback.toUpperCase();
}

export function parseHexInput(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { kind: 'empty' };
  }

  if (/^#[0-9A-F]{6}$/.test(trimmed) || /^[0-9A-F]{6}$/.test(trimmed)) {
    return {
      kind: 'valid',
      value: formatHexColor(trimmed),
    };
  }

  if (/^#?[0-9A-F]{1,5}$/.test(trimmed)) {
    return { kind: 'partial' };
  }

  return { kind: 'invalid' };
}

export async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy path.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function isDefaultThemeColor(selectedColor, defaultColor) {
  return !selectedColor || normalizeColor(selectedColor) === normalizeColor(defaultColor);
}

export function getVisibleCustomColors(colors, defaultColor) {
  const seen = new Set();
  const normalizedDefault = normalizeColor(defaultColor);

  return (colors || []).reduce((result, color) => {
    const formattedColor = formatHexColor(color, defaultColor);
    const normalized = normalizeColor(formattedColor);

    if (!normalized || normalized === normalizedDefault || seen.has(normalized)) {
      return result;
    }

    seen.add(normalized);
    result.push(formattedColor);
    return result;
  }, []);
}

export function clearTimer(timerRef) {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}
