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
  pageMode: 'scroll',
  contentWidth: 100, // 内容宽度百分比
};

export default storage;
