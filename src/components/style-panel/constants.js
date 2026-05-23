export const STYLE_PANEL_TABS = [
  { key: 'font', label: '字体' },
  { key: 'theme', label: '主题' },
  { key: 'color', label: '颜色' },
  { key: 'layout', label: '布局' },
];

export const FONTS = [
  { label: '宋体', value: 'Georgia, serif' },
  { label: '黑体', value: '"Helvetica Neue", Arial, sans-serif' },
  { label: '楷体', value: '"KaiTi", "STKaiti", serif' },
  { label: '等宽', value: '"Courier New", monospace' },
];

export const FONT_SIZES = [14, 16, 18, 20, 22, 24, 26, 28];

export const FONT_WEIGHTS = [
  { label: '细', value: 300 },
  { label: '正常', value: 400 },
  { label: '中等', value: 500 },
  { label: '粗', value: 700 },
];

export const LINE_HEIGHTS = [1.4, 1.6, 1.8, 2.0, 2.2];

export const CONTENT_WIDTHS = [
  { label: '100%', value: 100 },
  { label: '90%', value: 90 },
  { label: '80%', value: 80 },
  { label: '70%', value: 70 },
  { label: '60%', value: 60 },
];

export const PARAGRAPH_SPACINGS = [
  { label: '无', value: 0 },
  { label: '0.5em', value: 0.5 },
  { label: '1em', value: 1 },
  { label: '1.5em', value: 1.5 },
];

export const PARAGRAPH_INDENTS = [
  { label: '无', value: 0 },
  { label: '1em', value: 1 },
  { label: '2em', value: 2 },
  { label: '4em', value: 4 },
];

export const THEME_COLOR_MAP = {
  day: {
    text: '#333333',
    bg: '#FFFFFF',
  },
  night: {
    text: '#E0E0E0',
    bg: '#1A1A1A',
  },
  sepia: {
    text: '#5B4636',
    bg: '#F4ECD8',
  },
};

export const HEX_ERROR_MESSAGE = '请输入 6 位十六进制颜色码';
export const COPY_SUCCESS_MESSAGE = '已复制';
export const COPY_FAILURE_MESSAGE = '复制失败';
export const FEEDBACK_DURATION = 1500;
export const IDLE_STATUS = { tone: 'idle', message: '' };
