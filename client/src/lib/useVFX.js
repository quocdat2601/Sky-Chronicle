// ─────────────────────────────────────────────────────────────────────────────
// useVFX — centralised rAF render loop
// ONE loop, clearRect every frame, draw all active effects, prune dead ones.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useCallback } from 'react';
import { PARTICLE_PRESETS, SLASH_PRESETS, DMG_NUMBER_STYLE, FLASH, getSkillVFX } from './vfxPresets.js';

export function useVFX(canvasRef) {
  const effects = useRef([]);
  const raf_id  = useRef(null);
  const running = useRef(false);

  // ── Master loop ───────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    if (running.current) return;
    running.current = true;
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) { running.current = false; return; }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();
      effects.current = effects.current.filter(fx => fx.update(ctx, now));
      if (effects.current.length > 0) raf_id.current = requestAnimationFrame(tick);
      else running.current = false;
    };
    raf_id.current = requestAnimationFrame(tick);
  }, [canvasRef]);

  const addEffect = useCallback(fx => { effects.current.push(fx); startLoop(); }, [startLoop]);

  useEffect(() => () => {
    if (raf_id.current) cancelAnimationFrame(raf_id.current);
    running.current = false; effects.current = [];
  }, []);

  // ── LOCALISED FLASH ────────────────────────────────────────────────────────
  const flash = useCallback((preset_key, target_rect) => {
    if (!canvasRef.current || !target_rect) return;
    const preset = FLASH[preset_key]; if (!preset) return;
    const cx = (target_rect.left+target_rect.right)/2;
    const cy = (target_rect.top+target_rect.bottom)/2;
    const rx = (target_rect.right-target_rect.left)*0.8;
    const ry = (target_rect.bottom-target_rect.top)*0.9;
    const spawn = performance.now();
    addEffect({ update(ctx,now) {
      const t = (now-spawn)/preset.duration; if(t>=1) return false;
      ctx.save(); ctx.globalAlpha = Math.max(0,(t<0.35?t/0.35:1-(t-0.35)/0.65)*0.55);
      ctx.fillStyle=preset.color; ctx.beginPath();
      ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fill(); ctx.restore(); return true;
    }});
  }, [canvasRef, addEffect]);

  // ── SHAKE ─────────────────────────────────────────────────────────────────
  const shake = useCallback((intensity=4, duration=250) => {
    const el = canvasRef.current?.parentElement; if(!el) return;
    const start = performance.now();
    const tick = now => {
      const t = (now-start)/duration; if(t>=1){el.style.transform='';return;}
      const d = intensity*(1-t);
      el.style.transform=`translate(${(Math.random()-.5)*2*d}px,${(Math.random()-.5)*d}px)`;
      requestAnimationFrame(tick);
    }; requestAnimationFrame(tick);
  }, [canvasRef]);

  // ── SHAKE A SPECIFIC ELEMENT (for character cards) ─────────────────────────
  const shakeEl = useCallback((el, intensity=5, duration=280) => {
    if(!el) return;
    const start = performance.now();
    const orig = el.style.transform || '';
    const tick = now => {
      const t = (now-start)/duration; if(t>=1){el.style.transform=orig;return;}
      const d = intensity*(1-t)*Math.sin(t*Math.PI*5);
      el.style.transform=`${orig} translateX(${d}px)`;
      requestAnimationFrame(tick);
    }; requestAnimationFrame(tick);
  }, []);

  // ── PARTICLES ─────────────────────────────────────────────────────────────
  const spawnParticles = useCallback((preset_key, origin_rect) => {
    if(!canvasRef.current||!origin_rect) return;
    const preset = PARTICLE_PRESETS[preset_key]; if(!preset) return;
    const ox=(origin_rect.left+origin_rect.right)/2;
    const oy=(origin_rect.top+origin_rect.bottom)/2;
    const parts = Array.from({length:preset.count},()=>{
      const angle=preset.angle_base+(Math.random()-.5)*preset.spread;
      const speed=preset.speed[0]+Math.random()*(preset.speed[1]-preset.speed[0]);
      const maxLife=preset.life[0]+Math.random()*(preset.life[1]-preset.life[0]);
      return {
        x:ox+(Math.random()-.5)*16, y:oy+(Math.random()-.5)*16,
        vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
        size:preset.size[0]+Math.random()*(preset.size[1]-preset.size[0]),
        life:maxLife, maxLife,
        decay:preset.decay[0]+Math.random()*(preset.decay[1]-preset.decay[0]),
        color:preset.colors[Math.floor(Math.random()*preset.colors.length)],
        shape:preset.shape, wp:Math.random()*Math.PI*2,
      };
    });
    addEffect({ update(ctx,now) {
      let any=false;
      for(const p of parts){
        if(p.life<=0) continue; any=true;
        p.x+=p.vx; p.y+=p.vy; p.vy+=preset.gravity;
        if(preset.wind_drift) p.vx+=Math.sin(p.wp+p.life)*0.06;
        p.life-=p.decay;
        ctx.save(); ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
        ctx.fillStyle=p.color; drawShape(ctx,p); ctx.restore();
      } return any;
    }});
  }, [canvasRef, addEffect]);

  // ── SLASH — sharp tapered cut using Bezier + gradient stroke ──────────────
  // Draws each slash as a needle: pointed at both ends, thick at centre
  // Uses curvature (Bezier ctrl point offset) to add a slight curve → more dynamic
  const slash = useCallback((type, origin_rect) => {
    if(!canvasRef.current||!origin_rect) return;
    const canvas   = canvasRef.current;
    const presets  = SLASH_PRESETS[type]||SLASH_PRESETS.normal;
    const cx = (origin_rect.left+origin_rect.right)/2;
    const cy = (origin_rect.top+origin_rect.bottom)/2;
    // Absolute length based on canvas diagonal — always large enough
    const diag     = Math.hypot(canvas.width, canvas.height);
    const base_len = Math.min(diag*0.24, 280);

    presets.forEach(s => {
      // OWN private state per slash instance (no shared mutation)
      const state    = { began:false, spawn:0, start_time:performance.now()+(s.delay||0) };
      const APPEAR   = 50, HOLD = 80, FADE = 140, total = APPEAR+HOLD+FADE;
      const len      = base_len * s.length;
      const dx       = Math.cos(s.angle)*len;
      const dy       = Math.sin(s.angle)*len;
      // Start and end of the slash
      const sx       = cx+s.offset.x - dx*0.5;
      const sy       = cy+s.offset.y - dy*0.5;
      const ex       = cx+s.offset.x + dx*0.5;
      const ey       = cy+s.offset.y + dy*0.5;
      // Bezier control point — perpendicular offset for curve
      const perp_len = Math.hypot(dx,dy)||1;
      const px_n     = -dy/perp_len;  // perpendicular unit vector
      const py_n     =  dx/perp_len;
      const cpx      = (sx+ex)/2 + px_n*(s.curvature||0);
      const cpy      = (sy+ey)/2 + py_n*(s.curvature||0);
      // Perpendicular for trail lines
      const nx       = px_n;
      const ny       = py_n;

      addEffect({ update(ctx,now) {
        if(now < state.start_time) return true;
        if(!state.began){ state.began=true; state.spawn=now; }
        const elapsed = now-state.spawn; if(elapsed>=total) return false;
        const t_appear = Math.min(1,elapsed/APPEAR);
        const fade_t   = elapsed>APPEAR+HOLD ? (elapsed-APPEAR-HOLD)/FADE : 0;
        const alpha    = t_appear*(1-fade_t);
        const taper    = s.taper||0.8;

        ctx.save();

        // ── Draw tapered slash using segmented Bezier ──────────────────────
        // We sample N points along the curve and draw short thick lines
        // with varying width — thin at tips, thick at centre.
        const N     = 32;
        const thick = s.thickness * t_appear;

        // Layer 1: broad outer glow
        ctx.globalAlpha = alpha*0.15;
        ctx.strokeStyle = s.color;
        ctx.lineWidth   = thick*6;
        ctx.lineCap     = 'round';
        ctx.shadowColor = s.color;
        ctx.shadowBlur  = 18;
        ctx.beginPath(); ctx.moveTo(sx,sy);
        ctx.quadraticCurveTo(cpx,cpy,ex,ey); ctx.stroke();

        ctx.shadowBlur = 0;

        // Layer 2: colour body drawn as tapered segments
        for(let i=0;i<N;i++){
          const ta = i/N, tb = (i+1)/N;
          const tmid = (ta+tb)/2;
          // width profile: 0 at tips, 1 at centre — shaped by taper exponent
          const w_profile = 1 - Math.pow(Math.abs(tmid*2-1), taper*0.8+0.2);
          const lw = thick * 2.6 * w_profile;
          if(lw < 0.3) continue;
          // Bezier points
          const [ax,ay] = bezier(sx,sy,cpx,cpy,ex,ey,ta);
          const [bx,by] = bezier(sx,sy,cpx,cpy,ex,ey,tb);
          ctx.globalAlpha = alpha*0.72*w_profile;
          ctx.strokeStyle = s.color;
          ctx.lineWidth   = lw;
          ctx.lineCap     = i===0||i===N-1?'round':'butt';
          ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        }

        // Layer 3: sharp bright white core (very thin, at peak opacity)
        for(let i=0;i<N;i++){
          const ta = i/N, tb = (i+1)/N;
          const tmid = (ta+tb)/2;
          const w_profile = 1 - Math.pow(Math.abs(tmid*2-1), taper+0.3);
          const lw = Math.max(0.4, thick*0.55*w_profile*(1-fade_t*0.7));
          if(lw<0.3) continue;
          const [ax,ay] = bezier(sx,sy,cpx,cpy,ex,ey,ta);
          const [bx,by] = bezier(sx,sy,cpx,cpy,ex,ey,tb);
          ctx.globalAlpha = alpha*w_profile;
          ctx.strokeStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur  = 3;
          ctx.lineWidth   = lw;
          ctx.lineCap     = 'round';
          ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Layer 4: two thin parallel trail lines — speed streaks
        [[0.35, 1.4], [0.15, 2.5]].forEach(([a_mul, off_mul])=>{
          const off = s.thickness * off_mul;
          ctx.globalAlpha = alpha * a_mul * (1-fade_t);
          ctx.strokeStyle = s.color;
          ctx.lineWidth   = Math.max(0.4, s.thickness*0.28);
          ctx.lineCap     = 'round';
          // trail +
          ctx.beginPath(); ctx.moveTo(sx+nx*off,sy+ny*off);
          ctx.quadraticCurveTo(cpx+nx*off,cpy+ny*off,ex+nx*off,ey+ny*off); ctx.stroke();
          // trail −
          ctx.beginPath(); ctx.moveTo(sx-nx*off,sy-ny*off);
          ctx.quadraticCurveTo(cpx-nx*off,cpy-ny*off,ex-nx*off,ey-ny*off); ctx.stroke();
        });

        ctx.restore(); return true;
      }});
    });
  }, [canvasRef, addEffect]);

  // ── IMPACT RING ───────────────────────────────────────────────────────────
  const impactRing = useCallback((origin_rect, color='#ffffff') => {
    if(!canvasRef.current||!origin_rect) return;
    const cx=(origin_rect.left+origin_rect.right)/2;
    const cy=(origin_rect.top+origin_rect.bottom)/2;
    const spawn=performance.now();
    addEffect({ update(ctx,now) {
      const t=(now-spawn)/350; if(t>=1) return false;
      ctx.save(); ctx.globalAlpha=(1-t)*0.7;
      ctx.strokeStyle=color; ctx.lineWidth=3*(1-t)+0.5;
      ctx.shadowColor=color; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(cx,cy,10+t*50,0,Math.PI*2); ctx.stroke();
      ctx.restore(); return true;
    }});
  }, [canvasRef, addEffect]);

  // ── DAMAGE NUMBER ─────────────────────────────────────────────────────────
  const damageNumber = useCallback((amount, style_key, origin_rect) => {
    if(!canvasRef.current||!origin_rect) return;
    const style=DMG_NUMBER_STYLE[style_key]||DMG_NUMBER_STYLE.normal;
    const text=fmtDmg(amount);
    const ox=(origin_rect.left+origin_rect.right)/2+(Math.random()-.5)*32;
    const oy_top=origin_rect.top;
    const spawn=performance.now();
    addEffect({ update(ctx,now) {
      const t=(now-spawn)/980; if(t>=1) return false;
      const rise=Math.min(1,t*2.2);
      const alpha=t<0.55?1:1-(t-0.55)/0.45;
      const scale=t<0.1?0.5+(t/0.1)*0.6:1;
      const y=oy_top-rise*52;
      ctx.save(); ctx.globalAlpha=Math.max(0,alpha);
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`900 ${Math.round(style.size*scale)}px Cinzel,serif`;
      ctx.fillStyle=style.shadow;  ctx.fillText(text,ox+2,y+2);
      ctx.strokeStyle=style.outline; ctx.lineWidth=3.5; ctx.strokeText(text,ox,y);
      ctx.fillStyle=style.color;   ctx.fillText(text,ox,y);
      ctx.restore(); return true;
    }});
  }, [canvasRef, addEffect]);

  // ── BUFF AURA ─────────────────────────────────────────────────────────────
  const buffAura = useCallback((target_rect, color='#4090ff') => {
    if(!canvasRef.current||!target_rect) return;
    const {left,top,right,bottom}=target_rect;
    const spawn=performance.now();
    addEffect({ update(ctx,now) {
      const t=(now-spawn)/650; if(t>=1) return false;
      const pulse=Math.sin(t*Math.PI*2);
      const exp=pulse*5;
      ctx.save(); ctx.globalAlpha=Math.max(0,pulse*0.4);
      ctx.strokeStyle=color; ctx.lineWidth=2.5;
      ctx.shadowColor=color; ctx.shadowBlur=10;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(left-exp,top-exp,(right-left)+exp*2,(bottom-top)+exp*2,8);
      else              ctx.rect(left-exp,top-exp,(right-left)+exp*2,(bottom-top)+exp*2);
      ctx.stroke(); ctx.restore(); return true;
    }});
  }, [canvasRef, addEffect]);

  // ── COMPOSITES ────────────────────────────────────────────────────────────
  const attackEffect = useCallback((atk_type, enemy_rect, char_element) => {
    const type=(atk_type||'normal').toLowerCase();
    slash(type==='ca'?'ca':type, enemy_rect);
    if(type==='ca'){
      shake(7,350);
      spawnParticles((char_element||'FIRE').toLowerCase(), enemy_rect);
      impactRing(enemy_rect,'#f0c030');
    } else if(type==='ta'){
      shake(4,200);
      spawnParticles('attack',enemy_rect);
      setTimeout(()=>impactRing(enemy_rect,'rgba(255,255,255,0.7)'),130);
      setTimeout(()=>impactRing(enemy_rect,'rgba(255,255,255,0.5)'),260);
    } else if(type==='da'){
      shake(3,180);
      spawnParticles('attack',enemy_rect);
      setTimeout(()=>impactRing(enemy_rect,'rgba(255,255,255,0.6)'),310);
    } else {
      shake(2,150);
      spawnParticles('attack',enemy_rect);
    }
  }, [slash,shake,spawnParticles,impactRing]);

  const skillEffect = useCallback((effect_type, element, target_rect, damage_amount=null) => {
    const vfx=getSkillVFX(effect_type,element);
    flash(
      effect_type==='DAMAGE'?'skill_damage':
      effect_type==='BUFF'  ?'skill_buff':
      effect_type==='HEAL'  ?'skill_heal':'skill_debuff',
      target_rect
    );
    const pk=effect_type==='DAMAGE'?(element||'FIRE').toLowerCase():
             effect_type==='BUFF'  ?'buff':
             effect_type==='HEAL'  ?'heal':'debuff';
    spawnParticles(pk,target_rect);
    if(vfx.impact_ring)        impactRing(target_rect,vfx.impact_color);
    if(effect_type==='BUFF')   buffAura(target_rect,'#4090ff');
    if(effect_type==='HEAL')   buffAura(target_rect,'#38e060');
    if(damage_amount&&damage_amount>0)
      setTimeout(()=>damageNumber(damage_amount,'skill',target_rect),100);
  }, [flash,spawnParticles,impactRing,buffAura,damageNumber]);

  const bossHitEffect = useCallback((ally_rect, damage_amount) => {
    flash('boss_hit',ally_rect); shake(5,240);
    spawnParticles('attack',ally_rect);
    if(damage_amount) setTimeout(()=>damageNumber(damage_amount,'boss_dmg',ally_rect),80);
  }, [flash,shake,spawnParticles,damageNumber]);

  const chargeAttack = useCallback((enemy_rect, char_element, damage_amount) => {
    slash('ca',enemy_rect); shake(9,450);
    spawnParticles((char_element||'FIRE').toLowerCase(),enemy_rect);
    spawnParticles('charge_attack',enemy_rect);
    impactRing(enemy_rect,'#f0c030');
    setTimeout(()=>impactRing(enemy_rect,'rgba(255,255,255,0.6)'),110);
    if(damage_amount) setTimeout(()=>damageNumber(damage_amount,'ca',enemy_rect),200);
  }, [slash,shake,spawnParticles,impactRing,damageNumber]);

  const chainBurst = useCallback((count, enemy_rect) => {
    flash('charge_attack',enemy_rect); shake(9,450);
    spawnParticles('charge_attack',enemy_rect);
    impactRing(enemy_rect,'#f0c030');
    setTimeout(()=>impactRing(enemy_rect,'#ffe860'),120);
    setTimeout(()=>impactRing(enemy_rect,'#ffffff'),240);
  }, [flash,shake,spawnParticles,impactRing]);

  return {
    flash, shake, shakeEl,
    particles:spawnParticles, slash, impactRing, damageNumber, buffAura,
    attackEffect, skillEffect, bossHitEffect, chargeAttack, chainBurst,
  };
}

// ── Bezier point at t ─────────────────────────────────────────────────────────
function bezier(x0,y0,cx,cy,x1,y1,t){
  const mt=1-t;
  return [mt*mt*x0+2*mt*t*cx+t*t*x1, mt*mt*y0+2*mt*t*cy+t*t*y1];
}

// ── Shape primitives ──────────────────────────────────────────────────────────
function drawShape(ctx,p){
  const r=p.size/2;
  switch(p.shape){
    case'circle': ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();break;
    case'spark':  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillRect(-r*2.2,-r*0.3,r*4.4,r*0.6);ctx.restore();break;
    case'diamond':ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();break;
    case'star':{ctx.save();ctx.translate(p.x,p.y);ctx.beginPath();for(let i=0;i<5;i++){const a=i*4*Math.PI/5-Math.PI/2,ia=a+Math.PI/5;if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.lineTo(Math.cos(ia)*r*.42,Math.sin(ia)*r*.42);}ctx.closePath();ctx.fill();ctx.restore();break;}
    case'plus':   ctx.fillRect(p.x-r*.28,p.y-r,r*.56,r*2);ctx.fillRect(p.x-r,p.y-r*.28,r*2,r*.56);break;
    case'polygon':{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*3);ctx.beginPath();for(let i=0;i<5;i++){const a=i*2*Math.PI/5;i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.restore();break;}
    case'drop':   ctx.beginPath();ctx.arc(p.x,p.y-r*.3,r*.6,0,Math.PI*2);ctx.moveTo(p.x-r*.45,p.y-r*.3);ctx.quadraticCurveTo(p.x,p.y+r*1.1,p.x+r*.45,p.y-r*.3);ctx.fill();break;
    default:      ctx.fillRect(p.x-r,p.y-r,p.size,p.size);
  }
}

function fmtDmg(n){
  if(n>=1_000_000) return (n/1_000_000).toFixed(2)+'M';
  if(n>=1_000) return (n/1_000).toFixed(1)+'K';
  return String(Math.round(n));
}
