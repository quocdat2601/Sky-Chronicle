// ─────────────────────────────────────────────────────────────────────────────
// UI Helpers & Shared Components
// ─────────────────────────────────────────────────────────────────────────────

// Element icons & colors
export const ELEMENT_ICON = {
  FIRE:  '🔥', WATER: '💧', EARTH: '🌍',
  WIND:  '🌀', LIGHT: '☀', DARK:  '🌑',
};

export const RARITY_STARS = { SSR: '★★★', SR: '★★', R: '★' };

export function ElementBadge({ element, size = 'sm' }) {
  return (
    <span className={`elem elem-${element}`} style={size === 'lg' ? { fontSize: '0.9rem', padding: '4px 12px' } : {}}>
      {ELEMENT_ICON[element]} {element}
    </span>
  );
}

export function HpBar({ current, max, height = 8 }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const cls = pct > 60 ? '' : pct > 30 ? ' yellow' : ' red';
  return (
    <div className="bar-track" style={{ height }}>
      <div className={`bar-fill bar-hp${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ChargeBar({ value, height = 6 }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="bar-track" style={{ height }}>
      <div className="bar-fill bar-charge" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BossHpBar({ current, max }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const phase_line = (threshold) => (
    <div key={threshold} style={{
      position: 'absolute', left: `${threshold * 100}%`,
      top: 0, bottom: 0, width: '2px',
      background: 'rgba(255,255,255,0.4)',
    }} />
  );
  return (
    <div className="bar-track" style={{ height: 20, position: 'relative' }}>
      <div className="bar-fill bar-boss-hp" style={{ width: `${pct}%` }} />
      {[0.5].map(phase_line)}
    </div>
  );
}

export function StatusEffectList({ effects = [] }) {
  if (effects.length === 0) return null;
  return (
    <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
      {effects.map((e, i) => {
        const isBuff = e.amount > 0 || e.type?.includes('UP') || e.type === 'REGEN';
        const cls = e.type === 'BURN' || e.type === 'POISON' ? 'status-dot' : isBuff ? 'status-buff' : 'status-debuff';
        const abbr = {
          ATK_UP: 'ATK↑', ATK_DOWN: 'ATK↓', DEF_UP: 'DEF↑', DEF_DOWN: 'DEF↓',
          BURN: 'BRN', POISON: 'PSN', REGEN: 'REG', BLIND: 'BLD', SLOW: 'SLW',
          CHARGE_SPEED_UP: 'SPD↑',
        }[e.type] || e.type?.slice(0, 3);
        return (
          <div key={i} className={`tooltip-wrap`}>
            <span className={`status-icon ${cls}`}>{abbr}</span>
            <span className="tooltip">{e.type} {e.duration ? `(${e.duration}t)` : ''} {e.amount ? `×${(1 + Math.abs(e.amount) * 100).toFixed(0)}%` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
