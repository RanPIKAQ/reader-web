import localforage from 'localforage';

const storage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'books',
});

const settingsStorage = localforage.createInstance({
  name: 'reader-web',
  storeName: 'settings',
});

export const saveReadingProgress = async (bookId, progress) => {
  await storage.setItem(`progress_${bookId}`, {
    cfi: progress.cfi,
    percentage: progress.percentage,
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
};

export default storage;
