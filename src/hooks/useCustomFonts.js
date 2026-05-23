import { useEffect } from 'react';

const STYLE_PREFIX = 'custom-font-';

export function useCustomFonts(customFonts) {
  useEffect(() => {
    const styleIds = [];

    (customFonts || []).forEach((font) => {
      const styleId = STYLE_PREFIX + font.family;
      styleIds.push(styleId);

      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `@font-face{font-family:'${font.family}';src:url('${font.dataUrl}');font-display:swap}`;
        document.head.appendChild(style);
      }
    });

    return () => {
      styleIds.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          element.remove();
        }
      });
    };
  }, [customFonts]);
}
