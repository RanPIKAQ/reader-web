export const CHAPTER_BOUNDARY_THRESHOLD = 580;
export const BOUNDARY_RESET_DELAY = 700;
export const CHAPTER_TRANSITION_GUARD_DELAY = 250;
export const TXT_PROGRESS_SAMPLE_INTERVAL = 200;
export const TXT_ANCHOR_TEXT_LENGTH = 80;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function buildTxtLineMap(text) {
  const lines = text.split('\n');
  let cursor = 0;

  return lines.map((lineText, lineIndex) => {
    const startOffset = cursor;
    const endOffset = startOffset + lineText.length;

    cursor = endOffset + (lineIndex < lines.length - 1 ? 1 : 0);

    return {
      lineIndex,
      text: lineText,
      startOffset,
      endOffset,
    };
  });
}

export function createCollapsedVolumeState(volumes) {
  return volumes.reduce((state, volume) => {
    state[volume.id] = true;
    return state;
  }, {});
}

export function createLayoutFingerprint(settings) {
  return {
    fontSize: settings.fontSize,
    fontFamily: settings.fontFamily,
    fontWeight: settings.fontWeight,
    lineHeight: settings.lineHeight,
    contentWidth: settings.contentWidth,
  };
}

export function hasMatchingLayoutFingerprint(savedFingerprint, currentFingerprint) {
  if (!savedFingerprint) return false;

  return (
    savedFingerprint.fontSize === currentFingerprint.fontSize
    && savedFingerprint.fontFamily === currentFingerprint.fontFamily
    && savedFingerprint.fontWeight === currentFingerprint.fontWeight
    && savedFingerprint.lineHeight === currentFingerprint.lineHeight
    && savedFingerprint.contentWidth === currentFingerprint.contentWidth
  );
}

export function findLineElementByOffset(content, targetOffset) {
  const { children } = content;
  if (!children.length) return null;

  let low = 0;
  let high = children.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const element = children[mid];
    const top = element.offsetTop;
    const bottom = top + element.offsetHeight;

    if (targetOffset < top) {
      high = mid - 1;
    } else if (targetOffset > bottom) {
      low = mid + 1;
    } else {
      return element;
    }
  }

  const candidateIndex = clamp(low, 0, children.length - 1);
  return children[candidateIndex];
}

export function resolveMatchedLineIndex(lines, savedPosition) {
  if (!lines.length || !savedPosition) return -1;

  const { lineIndex, lineStartOffset, anchorText } = savedPosition;
  const anchor = anchorText || '';
  const indexedLine = Number.isInteger(lineIndex) ? lines[lineIndex] : null;

  if (indexedLine) {
    const matchesOffset = indexedLine.startOffset === lineStartOffset;
    const matchesAnchor = !anchor || indexedLine.text.startsWith(anchor);
    if (matchesOffset && matchesAnchor) {
      return indexedLine.lineIndex;
    }
  }

  if (Number.isInteger(lineStartOffset)) {
    const offsetMatch = lines.find((line) => line.startOffset === lineStartOffset);
    if (offsetMatch) {
      return offsetMatch.lineIndex;
    }
  }

  if (anchor) {
    const anchorMatch = lines.find((line) => line.text.startsWith(anchor));
    if (anchorMatch) {
      return anchorMatch.lineIndex;
    }
  }

  return -1;
}

export function resolveTxtRestoreScrollTop({
  content,
  pendingRestore,
  lines,
  settings,
}) {
  const currentFingerprint = createLayoutFingerprint(settings);
  const maxScrollTop = Math.max(content.scrollHeight - content.clientHeight, 0);

  if (pendingRestore.mode === 'end') {
    return maxScrollTop;
  }

  if (pendingRestore.mode !== 'saved' || !pendingRestore.savedPosition) {
    return 0;
  }

  const { savedPosition } = pendingRestore;

  if (hasMatchingLayoutFingerprint(savedPosition.layoutFingerprint, currentFingerprint)) {
    return clamp(savedPosition.scrollTop || 0, 0, maxScrollTop);
  }

  const matchedLineIndex = resolveMatchedLineIndex(lines, savedPosition);
  const matchedElement = matchedLineIndex >= 0 ? content.children[matchedLineIndex] : null;

  if (matchedElement) {
    const lineHeight = Math.max(matchedElement.offsetHeight, 1);
    const lineOffset = clamp(savedPosition.lineOffsetRatio || 0, 0, 1) * lineHeight;

    return clamp(
      matchedElement.offsetTop + lineOffset - (content.clientHeight / 2),
      0,
      maxScrollTop,
    );
  }

  if (Number.isFinite(savedPosition.scrollRatio)) {
    return clamp(savedPosition.scrollRatio * maxScrollTop, 0, maxScrollTop);
  }

  return 0;
}

export function normalizeTxtStructure(bookMeta, text) {
  let chapters = bookMeta?.flatChapters || bookMeta?.chapters || [];
  let volumes = bookMeta?.volumes || [];

  if (chapters.length === 0) {
    chapters = [{
      id: 'ch_0',
      title: '全文',
      start: 0,
      end: text.length,
    }];
    volumes = [{
      id: 'vol_0',
      title: '全文',
      start: 0,
      end: text.length,
      children: chapters,
    }];
  } else if (volumes.length === 0) {
    volumes = [{
      id: 'vol_0',
      title: '正文',
      start: 0,
      end: text.length,
      children: chapters,
    }];
  }

  return {
    chapters,
    volumes,
    toc: chapters.map((chapter) => ({ label: chapter.title, href: chapter.id })),
  };
}
