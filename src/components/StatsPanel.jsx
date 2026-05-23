import { useReadingStats } from '../hooks/useReadingStats';

const HEAT_COLORS = [
  'var(--bg-secondary)',
  '#e8f0c8',
  '#d0e8a0',
  '#b8d878',
  '#8cc848',
  '#6ab830',
];

function getHeatColor(minutes) {
  if (minutes <= 0) return HEAT_COLORS[0];
  if (minutes <= 5) return HEAT_COLORS[1];
  if (minutes <= 15) return HEAT_COLORS[2];
  if (minutes <= 30) return HEAT_COLORS[3];
  if (minutes <= 60) return HEAT_COLORS[4];
  return HEAT_COLORS[5];
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) return `${hours} 小时`;
  return `${hours} 小时 ${remaining} 分钟`;
}

function Heatmap({ heatmapData }) {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const keys = Object.keys(heatmapData).sort().reverse();

  return (
    <div className="stats-heatmap">
      <div className="heatmap-header">
        {days.map((day) => (
          <span key={day} className="heatmap-day-label">{day}</span>
        ))}
      </div>
      <div className="heatmap-grid">
        {keys.map((dateKey) => {
          const minutes = heatmapData[dateKey];
          const date = new Date(dateKey);
          const dayOfWeek = (date.getDay() + 6) % 7;
          return (
            <div
              key={dateKey}
              className="heatmap-cell"
              style={{
                backgroundColor: getHeatColor(minutes),
                gridColumn: dayOfWeek + 1,
              }}
              title={`${dateKey}: ${formatMinutes(minutes)}`}
            />
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>少</span>
        {HEAT_COLORS.map((color, i) => (
          <span key={i} className="legend-cell" style={{ backgroundColor: color }} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}

function StatsPanel({ onClose }) {
  const stats = useReadingStats();

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="stats-header">
          <h2>阅读统计</h2>
          <button type="button" className="stats-close-btn" onClick={onClose}>×</button>
        </div>

        {stats.loading ? (
          <p className="stats-loading">加载中...</p>
        ) : (
          <div className="stats-body">
            <div className="stats-summary">
              <div className="stat-card">
                <span className="stat-value">{formatMinutes(stats.totalMinutes)}</span>
                <span className="stat-label">总阅读时长</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.streak}天</span>
                <span className="stat-label">连续阅读</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.completedBooks}</span>
                <span className="stat-label">已读完</span>
              </div>
            </div>

            <div className="stats-section">
              <h3>近 30 天阅读</h3>
              <Heatmap heatmapData={stats.heatmapData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsPanel;
