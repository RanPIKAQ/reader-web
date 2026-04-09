import { useEffect, useRef, useState } from 'react';
import {
  COPY_FAILURE_MESSAGE,
  COPY_SUCCESS_MESSAGE,
  FEEDBACK_DURATION,
  HEX_ERROR_MESSAGE,
  IDLE_STATUS,
  THEME_COLOR_MAP,
} from './constants';
import {
  clearTimer,
  copyTextToClipboard,
  formatHexColor,
  getVisibleCustomColors,
  normalizeColor,
  parseHexInput,
} from './colorUtils';

export function useStylePanelColors({ settings, onUpdate }) {
  const themeColors = THEME_COLOR_MAP[settings.theme] || THEME_COLOR_MAP.day;
  const defaultTextColor = formatHexColor(themeColors.text, '#333333');
  const defaultBgColor = formatHexColor(themeColors.bg, '#FFFFFF');
  const effectiveTextColor = formatHexColor(settings.customTextColor || defaultTextColor, defaultTextColor);
  const effectiveBgColor = formatHexColor(settings.customBgColor || defaultBgColor, defaultBgColor);
  const visibleTextColors = getVisibleCustomColors(settings.customTextColors, defaultTextColor);
  const visibleBgColors = getVisibleCustomColors(settings.customBgColors, defaultBgColor);

  const [textHexInput, setTextHexInput] = useState(effectiveTextColor);
  const [bgHexInput, setBgHexInput] = useState(effectiveBgColor);
  const [textHexDirty, setTextHexDirty] = useState(false);
  const [bgHexDirty, setBgHexDirty] = useState(false);
  const [textStatus, setTextStatus] = useState(IDLE_STATUS);
  const [bgStatus, setBgStatus] = useState(IDLE_STATUS);

  const textFeedbackTimerRef = useRef(null);
  const bgFeedbackTimerRef = useRef(null);

  const displayedTextHexInput = textHexDirty ? textHexInput : effectiveTextColor;
  const displayedBgHexInput = bgHexDirty ? bgHexInput : effectiveBgColor;

  useEffect(() => () => {
    clearTimer(textFeedbackTimerRef);
    clearTimer(bgFeedbackTimerRef);
  }, []);

  const setStatus = (type, nextStatus) => {
    if (type === 'text') {
      setTextStatus(nextStatus);
      return;
    }

    setBgStatus(nextStatus);
  };

  const resetStatus = (type) => {
    const timerRef = type === 'text' ? textFeedbackTimerRef : bgFeedbackTimerRef;
    clearTimer(timerRef);
    setStatus(type, IDLE_STATUS);
  };

  const setTransientStatus = (type, tone, message) => {
    const timerRef = type === 'text' ? textFeedbackTimerRef : bgFeedbackTimerRef;
    clearTimer(timerRef);
    setStatus(type, { tone, message });
    timerRef.current = window.setTimeout(() => {
      setStatus(type, IDLE_STATUS);
      timerRef.current = null;
    }, FEEDBACK_DURATION);
  };

  const syncLocalColorState = (type, color) => {
    const formattedColor = formatHexColor(color, type === 'text' ? defaultTextColor : defaultBgColor);

    if (type === 'text') {
      setTextHexInput(formattedColor);
      setTextHexDirty(false);
    } else {
      setBgHexInput(formattedColor);
      setBgHexDirty(false);
    }

    resetStatus(type);
  };

  const handleThemeChange = (theme) => {
    const nextThemeColors = THEME_COLOR_MAP[theme] || THEME_COLOR_MAP.day;
    onUpdate({ theme });

    if (!settings.customTextColor) {
      syncLocalColorState('text', nextThemeColors.text);
    }

    if (!settings.customBgColor) {
      syncLocalColorState('bg', nextThemeColors.bg);
    }
  };

  const handleColorPickerChange = (type, value) => {
    const formattedColor = formatHexColor(value, type === 'text' ? defaultTextColor : defaultBgColor);

    if (type === 'text') {
      onUpdate({ customTextColor: formattedColor });
    } else {
      onUpdate({ customBgColor: formattedColor });
    }

    syncLocalColorState(type, formattedColor);
  };

  const handleDefaultColorSelect = (type) => {
    if (type === 'text') {
      onUpdate({ customTextColor: null });
      syncLocalColorState('text', defaultTextColor);
      return;
    }

    onUpdate({ customBgColor: null });
    syncLocalColorState('bg', defaultBgColor);
  };

  const handleCustomColorSelect = (type, color) => {
    const formattedColor = formatHexColor(color, type === 'text' ? defaultTextColor : defaultBgColor);

    if (type === 'text') {
      onUpdate({ customTextColor: formattedColor });
    } else {
      onUpdate({ customBgColor: formattedColor });
    }

    syncLocalColorState(type, formattedColor);
  };

  const handleAddCustomColor = (type) => {
    const isText = type === 'text';
    const defaultColor = isText ? defaultTextColor : defaultBgColor;
    const selectedColor = isText ? effectiveTextColor : effectiveBgColor;
    const currentColors = isText ? settings.customTextColors : settings.customBgColors;

    if (normalizeColor(selectedColor) === normalizeColor(defaultColor)) {
      return;
    }

    if ((currentColors || []).some((color) => normalizeColor(color) === normalizeColor(selectedColor))) {
      return;
    }

    const nextColors = [...(currentColors || []), selectedColor];
    onUpdate(isText ? { customTextColors: nextColors } : { customBgColors: nextColors });
  };

  const handleRemoveCustomColor = (type, color) => {
    const isText = type === 'text';
    const currentColors = isText ? settings.customTextColors : settings.customBgColors;
    const selectedColor = isText ? settings.customTextColor : settings.customBgColor;
    const defaultColor = isText ? defaultTextColor : defaultBgColor;
    const formattedColor = formatHexColor(color, defaultColor);
    const nextColors = (currentColors || []).filter((item) => normalizeColor(item) !== normalizeColor(formattedColor));
    const isRemovingSelected = normalizeColor(selectedColor) === normalizeColor(formattedColor);

    if (isText) {
      onUpdate({
        customTextColors: nextColors,
        customTextColor: isRemovingSelected ? null : settings.customTextColor,
      });
    } else {
      onUpdate({
        customBgColors: nextColors,
        customBgColor: isRemovingSelected ? null : settings.customBgColor,
      });
    }

    if (isRemovingSelected) {
      syncLocalColorState(type, defaultColor);
    }
  };

  const handleHexInputChange = (type, value) => {
    const nextValue = value.replace(/\s+/g, '').toUpperCase();
    const parsed = parseHexInput(nextValue);

    if (type === 'text') {
      setTextHexInput(nextValue);
      setTextHexDirty(true);
    } else {
      setBgHexInput(nextValue);
      setBgHexDirty(true);
    }

    resetStatus(type);

    if (parsed.kind === 'valid') {
      if (type === 'text') {
        onUpdate({ customTextColor: parsed.value });
        setTextHexInput(parsed.value);
        setTextHexDirty(false);
      } else {
        onUpdate({ customBgColor: parsed.value });
        setBgHexInput(parsed.value);
        setBgHexDirty(false);
      }
      return;
    }

    if (parsed.kind === 'invalid') {
      setStatus(type, { tone: 'error', message: HEX_ERROR_MESSAGE });
    }
  };

  const handleHexInputBlur = (type, value) => {
    const currentValue = value.trim().toUpperCase();
    const parsed = parseHexInput(currentValue);

    if (parsed.kind === 'empty') {
      syncLocalColorState(type, type === 'text' ? effectiveTextColor : effectiveBgColor);
      return;
    }

    if (parsed.kind !== 'valid') {
      setStatus(type, { tone: 'error', message: HEX_ERROR_MESSAGE });
    }
  };

  const handleCopyColor = async (type) => {
    const colorToCopy = type === 'text' ? effectiveTextColor : effectiveBgColor;
    const success = await copyTextToClipboard(colorToCopy);

    setTransientStatus(
      type,
      success ? 'success' : 'failure',
      success ? COPY_SUCCESS_MESSAGE : COPY_FAILURE_MESSAGE,
    );
  };

  const handleResetColors = () => {
    onUpdate({
      customTextColor: null,
      customBgColor: null,
    });
    syncLocalColorState('text', defaultTextColor);
    syncLocalColorState('bg', defaultBgColor);
  };

  return {
    defaultTextColor,
    defaultBgColor,
    effectiveTextColor,
    effectiveBgColor,
    visibleTextColors,
    visibleBgColors,
    displayedTextHexInput,
    displayedBgHexInput,
    textStatus,
    bgStatus,
    handleThemeChange,
    handleColorPickerChange,
    handleDefaultColorSelect,
    handleCustomColorSelect,
    handleAddCustomColor,
    handleRemoveCustomColor,
    handleHexInputChange,
    handleHexInputBlur,
    handleCopyColor,
    handleResetColors,
  };
}
