import localforage from 'localforage';

const storage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'books',
});

const chapterStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'chapters',
});

const settingsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'settings',
});

export const saveReadingProgress = async (bookId, progress) => {
  await storage.setItem(`progress_${bookId}`, {
    cfi: progress.cfi,
    percentage: progress.percentage,
    chapterId: progress.chapterId,
    timestamp: Date.now(),
  });
};

export const getReadingProgress = async (bookId) => {
  return await storage.getItem(`progress_${bookId}`);
};

export const saveBookData = async (bookId, bookData) => {
  await storage.setItem(`book_${bookId}`, bookData);
};

export const getBookData = async (bookId) => {
  return await storage.getItem(`book_${bookId}`);
};

export const getAllBooks = async () => {
  const books = [];
  await storage.iterate((value, key) => {
    if (key.startsWith('book_')) {
      books.push(value);
    }
  });
  return books;
};

export const removeBook = async (bookId) => {
  await storage.removeItem(`book_${bookId}`);
  await storage.removeItem(`progress_${bookId}`);
  await chapterStorage.removeItem(`txt_content_${bookId}`);
};

// 保存 TXT 文件的完整内容（用于按需提取章节）
export const saveTxtContent = async (bookId, content) => {
  await chapterStorage.setItem(`txt_content_${bookId}`, content);
};

// 获取 TXT 文件的完整内容
export const getTxtContent = async (bookId) => {
  return await chapterStorage.getItem(`txt_content_${bookId}`);
};

export const saveSettings = async (settings) => {
  await settingsStorage.setItem('userSettings', settings);
};

export const getSettings = async () => {
  return await settingsStorage.getItem('userSettings');
};

export const DEFAULT_SETTINGS = {
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  fontWeight: 400,
  lineHeight: 1.6,
  theme: 'day',
  customTextColor: null,
  customBgColor: null,
  pageMode: 'scroll',
  contentWidth: 100,
};

// 清除所有数据
export const clearAllData = async () => {
  await storage.clear();
  await chapterStorage.clear();
  await settingsStorage.clear();
};

// 导出所有数据为 JSON
export const exportAllData = async () => {
  const books = await getAllBooks();
  const settings = await getSettings();
  const booksWithProgress = await Promise.all(
    books.map(async (book) => ({
      ...book,
      progress: await getReadingProgress(book.id),
      txtContent: book.type === 'txt' ? await getTxtContent(book.id) : null
    }))
  );
  return {
    version: 1,
    exportedAt: Date.now(),
    books: booksWithProgress,
    settings
  };
};

// 导入数据
export const importAllData = async (data) => {
  // 恢复设置
  if (data.settings) {
    await settingsStorage.setItem('userSettings', data.settings);
  }
  // 恢复书籍
  if (data.books) {
    for (const book of data.books) {
      const { progress, txtContent, ...bookData } = book;
      await storage.setItem(`book_${book.id}`, bookData);
      if (progress) {
        await storage.setItem(`progress_${book.id}`, progress);
      }
      if (txtContent) {
        await chapterStorage.setItem(`txt_content_${book.id}`, txtContent);
      }
    }
  }
};

export default storage;
