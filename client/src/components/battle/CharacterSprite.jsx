import { useEffect, useMemo, useRef, useCallback } from 'react';
import { animationBus } from '../../systems/animation/animationBus.js';
import { getGbfNpcId } from '../../systems/animation/characterIdMap.js';

export default function CharacterSprite({ charId, size = 48, style }) {
  const iframeRef = useRef(null);
  const gbfId = useMemo(() => getGbfNpcId(charId), [charId]);
  const busKey = useMemo(() => (charId ? `char:${charId}` : null), [charId]);

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
      title={`sprite-${charId}`}
      src={`/gbfap-embed.html?id=${encodeURIComponent(gbfId)}&mode=npc&initial=wait`}
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

