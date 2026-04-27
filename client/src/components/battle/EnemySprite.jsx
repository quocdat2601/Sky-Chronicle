import { useEffect, useMemo, useRef, useCallback } from 'react';
import { animationBus } from '../../systems/animation/animationBus.js';
import { getGbfEnemyId } from '../../systems/animation/enemyIdMap.js';

export default function EnemySprite({ bossId, size = 68, style }) {
  const iframeRef = useRef(null);
  const gbfId = useMemo(() => getGbfEnemyId(bossId), [bossId]);
  const busKey = useMemo(() => (bossId ? `boss:${bossId}` : null), [bossId]);

  const play = useCallback((anim, durationMs, backTo) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage({ type: 'gbfap:anim', anim, durationMs, backTo }, window.location.origin);
    } catch {}
  }, []);

  useEffect(() => {
    if (!busKey) return;
    animationBus.register(busKey, play);
    return () => animationBus.unregister(busKey);
  }, [busKey, play]);

  if (!gbfId) return null;

  return (
    <iframe
      ref={iframeRef}
      title={`enemy-${bossId}`}
      src={`/gbfap-embed.html?id=${encodeURIComponent(gbfId)}&mode=enemy&initial=wait`}
      style={{
        width: size,
        height: size,
        border: 'none',
        display: 'block',
        pointerEvents: 'none',
        background: 'transparent',
        ...style,
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

