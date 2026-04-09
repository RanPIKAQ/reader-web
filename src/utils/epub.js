function flattenTocItems(items, result = []) {
  if (!Array.isArray(items)) return result;

  items.forEach((item) => {
    if (!item) return;

    const href = typeof item.href === 'string' ? item.href : '';
    const label = typeof item.label === 'string' && item.label.trim()
      ? item.label.trim()
      : '';

    if (href && label) {
      result.push({ href, label });
    }

    if (Array.isArray(item.subitems) && item.subitems.length > 0) {
      flattenTocItems(item.subitems, result);
    }
  });

  return result;
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('封面读取失败'));
    reader.readAsDataURL(blob);
  });
}

async function readCoverDataUrl(book) {
  let coverUrl = null;

  try {
    coverUrl = await book.coverUrl();
    if (!coverUrl) return null;

    const response = await fetch(coverUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  } finally {
    if (coverUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(coverUrl);
    }
  }
}

export async function loadEpubJs() {
  const module = await import('epubjs');
  return module.default;
}

export function flattenEpubToc(items = []) {
  return flattenTocItems(items, []);
}

export async function parseEpubAsset(fileOrBlob, fallbackTitle = '未命名书籍') {
  const epubjs = await loadEpubJs();
  const blob = fileOrBlob instanceof Blob
    ? fileOrBlob
    : new Blob([fileOrBlob], { type: 'application/epub+zip' });
  const arrayBuffer = await blob.arrayBuffer();
  const book = epubjs(arrayBuffer);

  try {
    await book.ready;

    const [metadata, navigation, cover] = await Promise.all([
      book.loaded.metadata,
      book.loaded.navigation,
      readCoverDataUrl(book),
    ]);

    return {
      title: metadata?.title || fallbackTitle,
      author: metadata?.creator || '未知作者',
      toc: flattenEpubToc(navigation?.toc),
      cover,
    };
  } finally {
    book.destroy?.();
  }
}

export async function createEpubBookFromBlob(blob) {
  const epubjs = await loadEpubJs();
  const arrayBuffer = await blob.arrayBuffer();
  const book = epubjs(arrayBuffer);
  await book.ready;
  return book;
}
