import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { ElementBadge, BossHpBar, StatusEffectList, formatNumber } from '../../lib/ui.jsx';
import { useVFX } from '../../lib/useVFX.js';

const ELEM_CLR = { FIRE:'#ff5020',WATER:'#30b4ff',EARTH:'#88cc44',WIND:'#a0ffb0',LIGHT:'#ffe860',DARK:'#c060ff' };
const ELEM_RGB = {
  FIRE:'255,80,32', WATER:'48,180,255', EARTH:'136,204,68',
  WIND:'160,255,176', LIGHT:'255,232,96', DARK:'192,96,255',
};

// Stagger delay between each character attacking (ms)
const CHAR_ATK_DELAY = 420;

// ── VFX CANVAS ──────────────────────────────────────────────────────────────
function VFXCanvas({ canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [canvasRef]);
  return (
    <canvas ref={canvasRef} style={{
      position:'absolute', inset:0, pointerEvents:'none', zIndex:50, width:'100%', height:'100%',
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export function BattleScreen() {
  const {
    player_id, raid_state, my_state, turn_log,
    setReady, useAbility, doAttack, is_attacking,
    chain_burst_anim, phase_anim, raid_result,
    setScreen, current_room_id, refreshRaidState, catalog_characters,
    catalog_mc_classes, mc_class_id, mc_selected_skills,
  } = useGameStore();

  const [selected_char_id, setSelectedCharId]   = useState(null);
  const [ability_flash_msg, setAbilityFlashMsg] = useState(null);

  // VFX
  const canvasRef  = useRef(null);
  const bossRef    = useRef(null);
  const partyRef   = useRef(null);
  const vfx        = useVFX(canvasRef);

  // Refs to each character card DOM element for shake
  // charCardRefs[char_id] = { current: <div> }
  const charCardRefs  = useRef({});
  const bossCardRef   = useRef(null);

  useEffect(() => { if (current_room_id) refreshRaidState(); }, [current_room_id]);

  useEffect(() => {
    if (my_state?.characters?.length && !selected_char_id) {
      const first = my_state.characters.find(c => c.hp > 0);
      if (first) setSelectedCharId(first.id);
    }
  }, [my_state]);

  // ── VFX: process new log entries ──────────────────────────────────────────
  const last_log_len = useRef(0);
  useEffect(() => {
    if (!turn_log.length || !bossRef.current) return;
    const new_entries = turn_log.slice(0, turn_log.length - last_log_len.current);
    last_log_len.current = turn_log.length;
    const boss_rect = bossRef.current.getBoundingClientRect();

    // Group NORMAL_ATTACK events so we can stagger them
    let atk_events = new_entries.filter(ev => ev.type === 'NORMAL_ATTACK');
    let atk_delay  = 0;

    for (const ev of new_entries) {
      switch (ev.type) {

        case 'NORMAL_ATTACK': {
          const hit_type = (ev.hit_type || 'NORMAL').toLowerCase();
          const this_delay = atk_delay;
          atk_delay += CHAR_ATK_DELAY;

          // Staggered: shake the attacker card, then VFX on boss
          setTimeout(() => {
            // Shake the char card
            const card_el = charCardRefs.current[ev.char_id];
            if (card_el) vfx.shakeEl(card_el, 6, 260);
            // VFX on boss
            vfx.attackEffect(hit_type, boss_rect, ev.element || 'FIRE');
            // Damage numbers — stagger per hit for DA/TA
            if (ev.hit_results?.length > 1) {
              ev.hit_results.forEach((hr, idx) => {
                setTimeout(() => vfx.damageNumber(hr.damage, hr.is_crit?'crit':'normal', boss_rect), 120+idx*220);
              });
            } else if (ev.damage) {
              setTimeout(() => vfx.damageNumber(ev.damage, ev.is_crit?'crit':'normal', boss_rect), 120);
            }
          }, this_delay);
          break;
        }

        case 'CHARGE_ATTACK':
          setTimeout(() => {
            const card_el = charCardRefs.current[ev.char_id];
            if (card_el) vfx.shakeEl(card_el, 9, 400);
            vfx.chargeAttack(boss_rect, ev.element||'FIRE', ev.damage);
          }, atk_delay);
          atk_delay += 500;
          break;

        case 'CHAIN_BURST':
          vfx.chainBurst(ev.chain_count, boss_rect);
          if (ev.cb_bonus) setTimeout(()=>vfx.damageNumber(ev.cb_bonus,'ca',boss_rect), 250);
          break;

        case 'ABILITY': {
          const char_cat   = catalog_characters?.find(cc => cc.abilities?.some(a => a.name===ev.ability_name));
          const ab         = char_cat?.abilities?.find(a => a.name===ev.ability_name);
          const effect_type= ab?.effect_type || (ev.damage?'DAMAGE':'BUFF');
          const element    = char_cat?.element || 'FIRE';
          const target_rect= (effect_type==='BUFF'||effect_type==='HEAL') && partyRef.current
                             ? partyRef.current.getBoundingClientRect()
                             : boss_rect;
          vfx.skillEffect(effect_type, element, target_rect, ev.damage||null);
          // Shake caster card
          const card_el = charCardRefs.current[ev.char_id];
          if (card_el) vfx.shakeEl(card_el, 4, 200);
          break;
        }

        case 'HEAL':
          if (partyRef.current) {
            const pr = partyRef.current.getBoundingClientRect();
            vfx.skillEffect('HEAL','LIGHT',pr,ev.heal);
          }
          break;

        case 'BOSS_ATTACK':
        case 'BOSS_CA_HIT': {
          if (partyRef.current) {
            const pr = partyRef.current.getBoundingClientRect();
            vfx.bossHitEffect(pr, ev.damage);
          }
          // Shake boss card too
          if (bossCardRef.current) vfx.shakeEl(bossCardRef.current, 5, 300);
          // Shake target char card
          const target_card = charCardRefs.current[ev.target];
          if (target_card) vfx.shakeEl(target_card, 7, 300);
          break;
        }

        default: break;
      }
    }
  }, [turn_log, vfx, catalog_characters]);

  useEffect(() => {
    if (chain_burst_anim && bossRef.current)
      vfx.chainBurst(chain_burst_anim.count, bossRef.current.getBoundingClientRect());
  }, [chain_burst_anim]);

  const handleAbility = useCallback((char_id, ability_id, ab_name) => {
    useAbility(char_id, ability_id);
    setAbilityFlashMsg(ab_name);
    setTimeout(()=>setAbilityFlashMsg(null),1600);
  }, [useAbility]);

  if (!raid_state) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div className="pulse" style={{fontSize:'3rem',marginBottom:16}}>⚔</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',color:'var(--text-gold)'}}>Connecting...</div>
        </div>
      </div>
    );
  }

  const boss          = raid_state.boss;
  const is_waiting    = raid_state.status==='WAITING';
  const is_active     = raid_state.status==='IN_PROGRESS';
  const my_local_boss = my_state?.local_boss;
  const my_chars      = my_state?.characters||[];
  const i_am_defeated = my_chars.length>0 && my_chars.every(c=>c.hp<=0);
  const selected_char     = my_chars.find(c=>c.id===selected_char_id)||null;
  const cat_selected_char = catalog_characters?.find(cc=>cc.id===selected_char_id);

  return (
    <div style={{height:'100dvh',display:'flex',flexDirection:'column',background:'var(--bg-void)',overflow:'hidden',position:'relative'}}>

      {/* VFX canvas */}
      <VFXCanvas canvasRef={canvasRef} />

      {/* Overlays */}
      {chain_burst_anim && (
        <div className="chain-burst-overlay">
          <div className="chain-burst-text">{chain_burst_anim.count}-CHAIN BURST!</div>
          <div style={{textAlign:'center',color:'var(--text-gold)',fontFamily:'var(--font-body)',fontSize:'1.2rem'}}>
            +{(chain_burst_anim.bonus_pct*100).toFixed(0)}% Bonus Damage
          </div>
        </div>
      )}
      {phase_anim && (
        <div className="phase-banner">
          <div style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',color:'var(--hp-red)',fontWeight:900}}>⚠ PHASE {phase_anim.phase}</div>
          <div style={{color:'var(--text-mid)',marginTop:4}}>{phase_anim.description}</div>
        </div>
      )}
      {ability_flash_msg && (
        <div style={{
          position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',
          background:'linear-gradient(135deg,#0a2010,#102818)',border:'1px solid rgba(80,200,80,0.5)',
          borderRadius:10,padding:'8px 22px',zIndex:600,pointerEvents:'none',
          fontFamily:'var(--font-display)',fontSize:'0.82rem',color:'#80ff98',
          boxShadow:'0 4px 20px rgba(50,180,80,0.3)',
        }}>◆ {ability_flash_msg}</div>
      )}
      {raid_result && (
        <div style={{position:'fixed',inset:0,zIndex:800,background:'rgba(4,8,18,0.9)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="panel" style={{padding:'40px 48px',textAlign:'center',maxWidth:400,
            border:`2px solid ${raid_result.result==='VICTORY'?'var(--gold-bright)':'var(--hp-red)'}`}}>
            <div style={{fontSize:'4rem',marginBottom:8}}>{raid_result.result==='VICTORY'?'🏆':'💀'}</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'2.2rem',fontWeight:900,marginBottom:20,
              color:raid_result.result==='VICTORY'?'var(--gold-bright)':'var(--hp-red)'}}>{raid_result.result}</div>
            {raid_result.rewards?.honor_ranking?.map(r=>(
              <div key={r.rank} style={{fontFamily:'var(--font-mono)',fontSize:'0.82rem',padding:'2px 0',
                color:r.rank===1?'var(--gold-bright)':'var(--text-mid)'}}>
                {r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':`#${r.rank}`} {r.name} — {r.honors.toLocaleString()} honors
              </div>
            ))}
            <button className="btn btn-primary btn-lg" style={{marginTop:20}} onClick={()=>setScreen('lobby')}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{background:'var(--bg-panel)',borderBottom:'1px solid var(--border-dim)',
        padding:'6px 16px',display:'flex',alignItems:'center',gap:14,flexShrink:0,zIndex:10}}>
        <span style={{fontFamily:'var(--font-display)',color:'var(--text-gold)',fontWeight:700,fontSize:'0.85rem',letterSpacing:'0.06em'}}>
          SKY CHRONICLE
        </span>
        <div style={{width:1,height:14,background:'var(--border-dim)'}}/>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text-dim)'}}>{current_room_id}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--text-dim)'}}>T{my_state?.turn_number??0}</span>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',fontWeight:700,
          color:is_waiting?'#60cc60':is_active?'var(--gold-bright)':'var(--hp-red)'}}>
          {raid_state.status}
        </span>
        <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
          {my_state?.honors!=null&&(
            <span style={{fontSize:'0.65rem',color:'var(--gold-dim)',fontFamily:'var(--font-mono)'}}>
              ★ {my_state.honors.toLocaleString()} honors
            </span>
          )}
          <button className="btn btn-ghost btn-sm" style={{padding:'3px 10px'}} onClick={()=>setScreen('lobby')}>✕ Leave</button>
        </div>
      </div>

      {/* BOSS SECTION */}
      <BossSection boss={boss} my_local_boss={my_local_boss} bossRef={bossRef} bossCardRef={bossCardRef} />

      {/* BOTTOM SPLIT */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 2fr',overflow:'hidden',minHeight:0}}>

        {/* LEFT: party overview + log */}
        <div style={{display:'flex',flexDirection:'column',borderRight:'1px solid var(--border-dim)',overflow:'hidden'}}>

          {/* Party overview — MC + 3 mains */}
          <div ref={partyRef} style={{flex:'0 0 auto',padding:'8px 10px',borderBottom:'1px solid var(--border-dim)',background:'var(--bg-panel)'}}>
            <div style={{fontSize:'0.58rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',letterSpacing:'0.06em',marginBottom:6}}>
              PARTY · tap to inspect
            </div>
            {is_waiting && (
              <WaitingPanel
                players={raid_state.players} player_id={player_id}
                my_ready={raid_state.players?.find(p=>p.player_id===player_id)?.is_ready}
                onReady={setReady}
              />
            )}
            {is_active && (
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {/* MC slot */}
                <MCCard
                  cardRef={el => { charCardRefs.current['MC'] = el; }}
                  is_selected={selected_char_id==='MC'}
                  onSelect={()=>setSelectedCharId('MC')}
                  mc_char={my_chars.find(c=>c.id==='MC')||null}
                  mc_class={catalog_mc_classes?.find(cl=>cl.id===mc_class_id)||null}
                />
                {/* Main party chars */}
                {my_chars.map((char,idx)=>(
                  <CharOverviewCard
                    key={char.id}
                    char={char}
                    slot_num={idx+1}
                    cat_char={catalog_characters?.find(cc=>cc.id===char.id)}
                    is_selected={selected_char_id===char.id}
                    onSelect={()=>setSelectedCharId(char.id)}
                    cardRef={el=>{ charCardRefs.current[char.id]=el; }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Battle log */}
          <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',minHeight:0}}>
            <div style={{padding:'6px 10px',borderBottom:'1px solid var(--border-dim)',flexShrink:0}}>
              <span style={{fontSize:'0.58rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',letterSpacing:'0.06em'}}>BATTLE LOG</span>
            </div>
            <CombatLog turn_log={turn_log} />
          </div>
        </div>

        {/* RIGHT: char detail */}
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {is_active && !i_am_defeated && selected_char_id==='MC' ? (
            <MCDetailPanel
              is_attacking={is_attacking}
              onAttack={doAttack}
              onUseAbility={(ab_id, ab_name) => handleAbility('MC', ab_id, ab_name)}
              mc_char={my_chars.find(c=>c.id==='MC')||null}
              mc_class={catalog_mc_classes?.find(cl=>cl.id===mc_class_id)||null}
              mc_selected_skills={mc_selected_skills||[]}
            />
          ) : is_active && !i_am_defeated && selected_char ? (
            <CharDetailPanel
              char={selected_char}
              cat_char={cat_selected_char}
              is_attacking={is_attacking}
              onUseAbility={(ab_id,ab_name)=>handleAbility(selected_char.id,ab_id,ab_name)}
              onAttack={doAttack}
            />
          ) : is_active && i_am_defeated ? (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
              <div style={{fontSize:'2rem'}}>💀</div>
              <div style={{fontFamily:'var(--font-display)',color:'var(--hp-red)',fontSize:'1rem'}}>Party Defeated</div>
            </div>
          ) : is_active && !selected_char ? (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:'0.8rem'}}>
              Select a character
            </div>
          ) : is_waiting ? (
            <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-dim)',fontSize:'0.8rem',fontFamily:'var(--font-mono)'}}>
              Waiting for raid to begin...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BOSS SECTION
// ═══════════════════════════════════════════════════════════════════════
function BossSection({ boss, my_local_boss, bossRef, bossCardRef }) {
  if (!boss) return null;
  const rage  = my_local_boss?.charge_bar??0;
  const phase = my_local_boss?.current_phase??1;
  return (
    <div ref={bossRef} style={{flexShrink:0,padding:'10px 16px',
      background:'linear-gradient(135deg,rgba(80,0,0,0.25) 0%,rgba(4,8,18,0) 60%)',
      borderBottom:'1px solid var(--border-dim)',position:'relative'}}>
      <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
        <div ref={bossCardRef} style={{
          width:68,height:68,flexShrink:0,borderRadius:10,
          background:'linear-gradient(135deg,rgba(140,10,10,0.5),rgba(40,0,0,0.4))',
          border:'1px solid rgba(200,32,32,0.35)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem',
        }}>🐉</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:900,color:'var(--hp-red)'}}>{boss.name}</span>
            <ElementBadge element={boss.element}/>
            <span style={{fontSize:'0.62rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}>Phase {phase}</span>
            <span style={{fontSize:'0.62rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',marginLeft:'auto'}}>SHARED HP</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.88rem',fontWeight:700,color:'var(--hp-red)'}}>
              {formatNumber(boss.hp)}<span style={{color:'var(--text-dim)',fontSize:'0.65rem'}}> / {formatNumber(boss.hp_max)}</span>
            </span>
            <span style={{fontSize:'0.62rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}>{(boss.hp/boss.hp_max*100).toFixed(1)}%</span>
          </div>
          <div style={{marginBottom:6}}><BossHpBar current={boss.hp} max={boss.hp_max}/></div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'0.58rem',color:'var(--hp-red)',fontFamily:'var(--font-mono)',flexShrink:0}}>RAGE</span>
            {[0,1,2].map(i=>(
              <div key={i} style={{width:10,height:10,flexShrink:0,
                background:rage>=(i+1)*34?'var(--hp-red)':'transparent',
                border:`1.5px solid ${rage>=(i+1)*34?'var(--hp-red)':'rgba(200,32,32,0.35)'}`,
                borderRadius:2,transform:'rotate(45deg)',
                boxShadow:rage>=(i+1)*34?'0 0 5px rgba(255,48,48,0.6)':'none',transition:'all 0.3s'}}/>
            ))}
            <div style={{flex:1,maxWidth:120}}>
              <div className="bar-track" style={{height:4}}>
                <div style={{height:'100%',borderRadius:2,width:`${rage}%`,
                  background:rage>75?'linear-gradient(90deg,#8a0010,#ff2030)':'linear-gradient(90deg,#5a0010,#cc1020)',
                  transition:'width 0.4s'}}/>
              </div>
            </div>
            <span style={{fontSize:'0.58rem',color:'var(--hp-red)',fontFamily:'var(--font-mono)'}}>{rage}%</span>
            {my_local_boss?.status_effects?.length>0&&<StatusEffectList effects={my_local_boss.status_effects}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MC CARD (overview) — slot 0 — shows HP/CA bars + skill CD squares
// ═══════════════════════════════════════════════════════════════════════
function MCCard({ cardRef, is_selected, onSelect, mc_char, mc_class }) {
  const dead    = mc_char ? mc_char.hp <= 0 : false;
  const hp_pct  = mc_char ? mc_char.hp / mc_char.hp_max : 1;
  const hp_cls  = hp_pct > 0.6 ? '' : hp_pct > 0.3 ? ' yellow' : ' red';
  // Build full abilities list: preset + selected subskills
  const all_abs = mc_char ? mc_char.abilities || [] : [];

  return (
    <div ref={cardRef} onClick={() => !dead && onSelect()} style={{
      display:'flex',gap:8,alignItems:'center',padding:'7px 8px',borderRadius:8,
      background:is_selected?'rgba(240,192,48,0.18)':'rgba(255,255,255,0.03)',
      border:`1px solid ${is_selected?'var(--text-gold)':'var(--border-dim)'}`,
      cursor:dead?'default':'pointer',opacity:dead?0.35:1,transition:'all 0.15s',
    }}>
      {/* Portrait */}
      <div style={{
        width:38,height:38,flexShrink:0,borderRadius:7,
        background:'linear-gradient(135deg,rgba(240,192,48,0.3),rgba(120,80,0,0.4))',
        border:'1px solid rgba(240,192,48,0.5)',
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',position:'relative',
      }}>
        {dead?'💀':'🧑‍✈️'}
        <div style={{position:'absolute',bottom:2,right:2,width:5,height:5,borderRadius:'50%',background:'var(--text-gold)'}}/>
      </div>

      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
          <span style={{fontSize:'0.68rem',fontFamily:'var(--font-display)',fontWeight:700,color:'var(--text-gold)'}}>Sky-Wanderer</span>
          <span style={{fontSize:'0.5rem',fontFamily:'var(--font-mono)',color:'var(--text-dim)'}}>
            {mc_class?.name||'Fighter'}
          </span>
        </div>

        {mc_char ? (
          <>
            {/* HP bar */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 34px',gap:3,alignItems:'center',marginBottom:2}}>
              <div className="bar-track" style={{height:4}}>
                <div className={`bar-fill bar-hp${hp_cls}`} style={{width:`${Math.max(0,Math.min(100,hp_pct*100))}%`}}/>
              </div>
              <span style={{fontSize:'0.5rem',color:'#60cc60',fontFamily:'var(--font-mono)',textAlign:'right'}}>{formatNumber(mc_char.hp)}</span>
            </div>
            {/* CA bar */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 26px',gap:3,alignItems:'center',marginBottom:4}}>
              <div className="bar-track" style={{height:3,background:'rgba(0,0,0,0.5)'}}>
                <div style={{height:'100%',borderRadius:2,width:`${mc_char.charge_bar||0}%`,background:'linear-gradient(90deg,#7a6000,#f0c030)',transition:'width 0.4s'}}/>
              </div>
              <span style={{fontSize:'0.48rem',color:'#f0c030',fontFamily:'var(--font-mono)',textAlign:'right'}}>{mc_char.charge_bar||0}%</span>
            </div>
            {/* Skill CD squares */}
            <div style={{display:'flex',gap:3}}>
              {all_abs.map(ab=>{
                const cd = mc_char.ability_cooldowns?.[ab.id]||0;
                const ready = cd===0;
                const clr = ab.id==='MC_PRESET'?'var(--text-gold)':
                  ab.effect_type==='DAMAGE'?'#ff6040':ab.effect_type==='BUFF'?'#4090ff':
                  ab.effect_type==='HEAL'?'#38e060':'#c060ff';
                return (
                  <div key={ab.id} title={`${ab.name} (${ready?'READY':cd+'t'})`} style={{
                    width:20,height:20,borderRadius:3,flexShrink:0,
                    background:ready?`rgba(${ab.id==='MC_PRESET'?'240,192,48':ab.effect_type==='DAMAGE'?'255,80,32':ab.effect_type==='BUFF'?'64,144,255':ab.effect_type==='HEAL'?'56,224,96':'192,96,255'},0.25)`:'rgba(80,20,20,0.5)',
                    border:`1px solid ${ready?clr:'rgba(160,40,40,0.5)'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'0.4rem',fontFamily:'var(--font-mono)',fontWeight:700,
                    color:ready?clr:'var(--hp-red)',
                  }}>
                    {ready?(ab.id==='MC_PRESET'?'★':'◆'):cd}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{fontSize:'0.6rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}>
            {mc_class?.name||'Fighter'} · Slot 0
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CHAR OVERVIEW CARD — slots 1-3
// ═══════════════════════════════════════════════════════════════════════
function CharOverviewCard({ char, slot_num, cat_char, is_selected, onSelect, cardRef }) {
  const dead    = char.hp<=0;
  const hp_pct  = char.hp/char.hp_max;
  const hp_cls  = hp_pct>0.6?'':hp_pct>0.3?' yellow':' red';
  const abilities = cat_char?.abilities||[];
  const rgb     = ELEM_RGB[char.element]||'200,200,200';

  return (
    <div ref={cardRef} onClick={()=>!dead&&onSelect()} style={{
      display:'flex',gap:8,alignItems:'center',padding:'7px 8px',borderRadius:8,
      background:is_selected?'rgba(32,96,200,0.18)':'rgba(255,255,255,0.03)',
      border:`1px solid ${is_selected?'var(--charge-blue)':'var(--border-dim)'}`,
      cursor:dead?'default':'pointer',opacity:dead?0.35:1,transition:'all 0.15s',
    }}>
      {/* Slot number badge */}
      <div style={{
        width:16,flexShrink:0,fontSize:'0.5rem',fontFamily:'var(--font-mono)',
        color:'var(--text-dim)',textAlign:'center',
      }}>{slot_num}</div>
      {/* Portrait */}
      <div style={{
        width:36,height:36,flexShrink:0,borderRadius:7,
        background:`linear-gradient(135deg,rgba(${rgb},0.25),rgba(0,0,0,0.3))`,
        border:`1px solid ${ELEM_CLR[char.element]||'var(--border-dim)'}`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',position:'relative',
      }}>
        {dead?'💀':'👤'}
        <div style={{position:'absolute',bottom:2,right:2,width:5,height:5,borderRadius:'50%',background:ELEM_CLR[char.element]||'#888'}}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
          <span style={{fontSize:'0.68rem',fontFamily:'var(--font-display)',fontWeight:700}}>{char.name}</span>
          {char.status_effects?.length>0&&<StatusEffectList effects={char.status_effects.slice(0,2)}/>}
        </div>
        {/* HP */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 34px',gap:3,alignItems:'center',marginBottom:2}}>
          <div className="bar-track" style={{height:4}}>
            <div className={`bar-fill bar-hp${hp_cls}`} style={{width:`${Math.max(0,Math.min(100,hp_pct*100))}%`}}/>
          </div>
          <span style={{fontSize:'0.5rem',color:'#60cc60',fontFamily:'var(--font-mono)',textAlign:'right'}}>{formatNumber(char.hp)}</span>
        </div>
        {/* CA */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 26px',gap:3,alignItems:'center',marginBottom:4}}>
          <div className="bar-track" style={{height:3,background:'rgba(0,0,0,0.5)'}}>
            <div style={{height:'100%',borderRadius:2,width:`${char.charge_bar}%`,background:'linear-gradient(90deg,#7a6000,#f0c030)',transition:'width 0.4s'}}/>
          </div>
          <span style={{fontSize:'0.48rem',color:'#f0c030',fontFamily:'var(--font-mono)',textAlign:'right'}}>{char.charge_bar}%</span>
        </div>
        {/* Skill squares */}
        <div style={{display:'flex',gap:3}}>
          {abilities.map(ab=>{
            const cd=char.ability_cooldowns?.[ab.id]||0;
            const ready=cd===0;
            return (
              <div key={ab.id} title={ab.name} style={{
                width:20,height:20,borderRadius:3,flexShrink:0,
                background:ready?'rgba(40,80,40,0.4)':'rgba(80,20,20,0.5)',
                border:`1px solid ${ready?'rgba(80,180,80,0.5)':'rgba(160,40,40,0.5)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'0.4rem',fontFamily:'var(--font-mono)',fontWeight:700,
                color:ready?'#80ff98':'var(--hp-red)',transition:'all 0.2s',
              }}>{ready?'◆':cd}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// SHARED SKILL CARD
// Collapsible: shows icon + name + CD + USE button always.
// Click the card body (not the button) → toggle description.
// ═══════════════════════════════════════════════════════════════════════
function SkillCard({ ab, runtime_char, dead, is_preset, onUseAbility }) {
  const [open, setOpen] = useState(false);
  const cd         = runtime_char?.ability_cooldowns?.[ab.id] || 0;
  const ready      = cd === 0 && !dead;
  const is_free    = ab.cooldown_max === 0;
  const badge_clr  = is_preset ? 'var(--text-gold)'
    : ab.effect_type==='DAMAGE' ? '#ff6040'
    : ab.effect_type==='BUFF'   ? '#4090ff'
    : ab.effect_type==='HEAL'   ? '#38e060'
    : '#c060ff';
  const icon = is_preset ? '★'
    : ab.effect_type==='DAMAGE' ? '⚔'
    : ab.effect_type==='BUFF'   ? '↑'
    : ab.effect_type==='HEAL'   ? '♥'
    : '↓';
  const rgb = ab.effect_type==='DAMAGE'?'255,80,32':ab.effect_type==='BUFF'?'64,144,255':ab.effect_type==='HEAL'?'56,224,96':'192,96,255';

  return (
    <div style={{
      borderRadius:10, overflow:'hidden',
      border:`1.5px solid ${ready
        ? is_preset ? 'rgba(240,192,48,0.5)' : 'rgba(80,160,80,0.4)'
        : 'var(--border-dim)'}`,
      background: ready
        ? is_preset ? 'rgba(240,192,48,0.07)' : 'rgba(20,50,20,0.38)'
        : 'rgba(255,255,255,0.02)',
      opacity: ready ? 1 : 0.52,
      transition:'all 0.15s',
    }}>
      {/* Icon strip */}
      <div style={{
        height:48, display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
        background: ready
          ? is_preset ? 'rgba(240,192,48,0.13)' : `rgba(${rgb},0.18)`
          : `rgba(${rgb},0.06)`,
        borderBottom:`1px solid ${ready ? is_preset?'rgba(240,192,48,0.25)':`rgba(${rgb},0.25)` : 'var(--border-dim)'}`,
      }}>
        <div style={{
          width:32, height:32, borderRadius:7,
          background: ready ? `rgba(${rgb},0.25)` : 'rgba(100,30,30,0.4)',
          border:`2px solid ${ready ? badge_clr : 'rgba(160,40,40,0.4)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1rem', color: ready ? badge_clr : 'var(--hp-red)',
          boxShadow: ready ? `0 0 9px ${badge_clr}44` : 'none',
          transition:'all 0.2s',
        }}>
          {ready ? icon : <span style={{fontSize:'0.78rem',fontWeight:700}}>{cd}t</span>}
        </div>
        {/* Cooldown overlay */}
        {!ready && (
          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',
            justifyContent:'center',background:'rgba(0,0,0,0.42)',borderRadius:9}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'1rem',fontWeight:700,color:'var(--hp-red)'}}>{cd}</span>
          </div>
        )}
        {/* Badges */}
        <div style={{position:'absolute',top:3,right:4,fontSize:'0.4rem',fontFamily:'var(--font-mono)',fontWeight:700,
          color:badge_clr,background:'rgba(0,0,0,0.72)',padding:'1px 4px',borderRadius:3}}>
          {is_preset ? 'PRESET' : ab.effect_type}
        </div>
        {(is_free || is_preset && ab.cooldown_max===0) && (
          <div style={{position:'absolute',top:3,left:4,fontSize:'0.4rem',fontFamily:'var(--font-mono)',
            color:'#60cc60',background:'rgba(0,0,0,0.72)',padding:'1px 4px',borderRadius:3}}>FREE</div>
        )}
      </div>

      {/* Body — click to expand description */}
      <div onClick={() => setOpen(p => !p)}
        style={{padding:'7px 8px', cursor:'pointer', flex:1, display:'flex', flexDirection:'column', gap:2}}>
        {/* Name row */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'0.68rem',fontWeight:700,
            color: ready ? is_preset ? 'var(--text-gold)' : 'var(--text-bright)' : 'var(--text-dim)'}}>
            {ab.name}
          </span>
          <span style={{fontSize:'0.52rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)'}}>
            {open ? '▲' : '▼'}
          </span>
        </div>
        {/* CD row */}
        <div style={{display:'flex',gap:6,fontSize:'0.54rem',fontFamily:'var(--font-mono)',color:'var(--text-dim)'}}>
          <span>CD {is_free
            ? <span style={{color:'#60cc60'}}>FREE</span>
            : <span style={{color:'var(--charge-blue)'}}>{ab.cooldown_max}t</span>}
          </span>
          <span style={{color: ready ? 'rgba(80,200,80,0.8)' : 'var(--hp-red)'}}>
            {ready ? 'READY' : `${cd}t left`}
          </span>
        </div>
        {/* Expandable description */}
        {open && (
          <div style={{fontSize:'0.6rem',color:'var(--text-dim)',lineHeight:1.45,marginTop:3,
            borderTop:'1px solid var(--border-dim)',paddingTop:4}}>
            {ab.description}
          </div>
        )}
      </div>

      {/* Use button — always visible, not part of toggle */}
      <div style={{padding:'0 8px 8px'}}>
        <button
          className={ready ? 'btn btn-primary' : 'btn btn-ghost'}
          style={{
            width:'100%', padding:'5px', fontSize:'0.65rem',
            borderColor: ready && is_preset ? 'rgba(240,192,48,0.5)' : undefined,
            background:  ready && is_preset ? 'rgba(240,192,48,0.12)' : undefined,
          }}
          disabled={!ready}
          onClick={e => { e.stopPropagation(); ready && onUseAbility(ab.id, ab.name); }}
        >
          {ready ? '▶ Use' : '⏳ Cooldown'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MC DETAIL PANEL — identical structure to CharDetailPanel
// ═══════════════════════════════════════════════════════════════════════
function MCDetailPanel({ mc_char, mc_class, is_attacking, onAttack, onUseAbility }) {
  const dead     = mc_char ? mc_char.hp <= 0 : false;
  const hp_pct   = mc_char ? mc_char.hp / mc_char.hp_max : 1;
  const hp_cls   = hp_pct > 0.6 ? '' : hp_pct > 0.3 ? ' yellow' : ' red';
  const ca_pct   = mc_char?.charge_bar || 0;
  const abilities = mc_char?.abilities || [];

  // Waiting state when mc_char not yet loaded
  if (!mc_char || !mc_class) {
    return (
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-deep)'}}>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
          <div className="pulse" style={{fontSize:'2rem'}}>🧑‍✈️</div>
          <div style={{color:'var(--text-dim)',fontSize:'0.78rem',fontFamily:'var(--font-mono)'}}>
            {mc_char ? 'Select a class in Party Setup' : 'Waiting for MC...'}
          </div>
        </div>
        <div style={{padding:'10px 14px',borderTop:'1px solid var(--border-dim)',flexShrink:0,
          background:'var(--bg-panel)',display:'flex',gap:10,alignItems:'center'}}>
          <div style={{fontSize:'0.6rem',color:is_attacking?'var(--charge-blue)':'var(--gold-bright)',fontFamily:'var(--font-mono)',flex:1}}>
            {is_attacking ? '⚔ Resolving turn...' : 'Press Attack to end your turn'}
          </div>
          <button className="btn btn-primary"
            style={{padding:'12px 32px',fontSize:'0.9rem',flexShrink:0,opacity:is_attacking?0.5:1}}
            disabled={is_attacking} onClick={onAttack}>
            {is_attacking ? '⚔ Attacking...' : '⚔ ATTACK'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-deep)'}}>
      {/* Header — portrait + name + HP + CA */}
      <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border-dim)',flexShrink:0,
        background:'linear-gradient(135deg,rgba(240,192,48,0.12) 0%,transparent 60%)'}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{width:64,height:64,flexShrink:0,borderRadius:10,
            background:'linear-gradient(160deg,rgba(240,192,48,0.3),rgba(0,0,0,0.4))',
            border:'1px solid rgba(240,192,48,0.5)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>
            {dead ? '💀' : '🧑‍✈️'}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:700,color:'var(--text-gold)'}}>
                Sky-Wanderer
              </span>
              <span style={{fontSize:'0.58rem',fontFamily:'var(--font-mono)',fontWeight:700,
                color:'var(--text-gold)',background:'rgba(0,0,0,0.5)',padding:'1px 6px',borderRadius:3}}>
                {mc_class.name}
              </span>
              <span style={{fontSize:'0.52rem',fontFamily:'var(--font-mono)',color:'var(--text-dim)'}}>MC · Slot 0</span>
            </div>
            {/* HP */}
            <div style={{marginBottom:4}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontSize:'0.58rem',color:'#60cc60',fontFamily:'var(--font-mono)'}}>HP</span>
                <span style={{fontSize:'0.62rem',color:'#60cc60',fontFamily:'var(--font-mono)',fontWeight:700}}>
                  {formatNumber(mc_char.hp)} / {formatNumber(mc_char.hp_max)}
                </span>
              </div>
              <div className="bar-track" style={{height:8}}>
                <div className={`bar-fill bar-hp${hp_cls}`} style={{width:`${Math.max(0,Math.min(100,hp_pct*100))}%`}}/>
              </div>
            </div>
            {/* CA */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontSize:'0.58rem',color:'#f0c030',fontFamily:'var(--font-mono)'}}>CHARGE ATTACK</span>
                <span style={{fontSize:'0.62rem',color:'#f0c030',fontFamily:'var(--font-mono)',fontWeight:700}}>{ca_pct}%</span>
              </div>
              <div className="bar-track" style={{height:6,background:'rgba(0,0,0,0.5)'}}>
                <div style={{height:'100%',borderRadius:3,width:`${ca_pct}%`,
                  background:'linear-gradient(90deg,#7a6000,#f0c030)',transition:'width 0.4s',
                  boxShadow:ca_pct>=100?'0 0 8px rgba(240,192,48,0.6)':'none'}}/>
              </div>
              {ca_pct>=100 && (
                <div style={{fontSize:'0.55rem',color:'#f0c030',fontFamily:'var(--font-mono)',fontWeight:700,marginTop:2}}>
                  ★ READY — fires on Attack
                </div>
              )}
            </div>
          </div>
        </div>
        {mc_char.status_effects?.length > 0 && (
          <div style={{marginTop:8,display:'flex',gap:4,flexWrap:'wrap'}}>
            <StatusEffectList effects={mc_char.status_effects}/>
          </div>
        )}
      </div>

      {/* Skills */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{fontSize:'0.58rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',letterSpacing:'0.06em'}}>
          SKILLS · tap card body for description · instant · no turn cost
        </div>

        {abilities.length === 0 ? (
          <div style={{color:'var(--text-dim)',fontSize:'0.75rem',textAlign:'center',padding:'20px 0',fontFamily:'var(--font-mono)',lineHeight:1.7}}>
            No skills equipped.<br/>
            <span style={{fontSize:'0.65rem'}}>Go to Party Setup → tap MC skills to equip subskills.</span>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {abilities.map(ab => (
              <SkillCard
                key={ab.id}
                ab={ab}
                runtime_char={mc_char}
                dead={dead}
                is_preset={ab.id === 'MC_PRESET'}
                onUseAbility={onUseAbility}
              />
            ))}
          </div>
        )}

        {/* CA placeholder */}
        {mc_class.charge_attack && (
          <div style={{padding:'10px 12px',borderRadius:10,
            background:'rgba(240,192,48,0.06)',border:'1px solid rgba(240,192,48,0.2)'}}>
            <div style={{fontSize:'0.55rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',
              letterSpacing:'0.06em',marginBottom:3}}>CHARGE ATTACK · fires at 100%</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'0.85rem',fontWeight:700,
              color:'var(--text-gold)',marginBottom:3}}>{mc_class.charge_attack.name}</div>
            <div style={{fontSize:'0.65rem',color:'var(--text-dim)',lineHeight:1.45}}>
              {mc_class.charge_attack.description}
            </div>
          </div>
        )}
      </div>

      {/* Attack button */}
      <div style={{padding:'10px 14px',borderTop:'1px solid var(--border-dim)',flexShrink:0,
        background:'var(--bg-panel)',display:'flex',gap:10,alignItems:'center'}}>
        <div style={{fontSize:'0.6rem',color:is_attacking?'var(--charge-blue)':'var(--gold-bright)',
          fontFamily:'var(--font-mono)',flex:1}}>
          {is_attacking ? '⚔ Resolving turn...' : 'Use skills freely, then press Attack to end your turn'}
        </div>
        <button className="btn btn-primary"
          style={{padding:'12px 32px',fontSize:'0.9rem',flexShrink:0,
            opacity:is_attacking?0.5:1,boxShadow:is_attacking?'none':'0 0 22px rgba(32,96,184,0.5)'}}
          disabled={is_attacking} onClick={onAttack}>
          {is_attacking ? '⚔ Attacking...' : '⚔ ATTACK'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CHAR DETAIL PANEL — same SkillCard with collapsible description
// ═══════════════════════════════════════════════════════════════════════
function CharDetailPanel({ char, cat_char, is_attacking, onUseAbility, onAttack }) {
  const dead      = char.hp <= 0;
  const hp_pct    = char.hp / char.hp_max;
  const hp_cls    = hp_pct > 0.6 ? '' : hp_pct > 0.3 ? ' yellow' : ' red';
  const abilities = cat_char?.abilities || [];
  const rgb       = ELEM_RGB[char.element] || '200,200,200';

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg-deep)'}}>
      {/* Header */}
      <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border-dim)',flexShrink:0,
        background:`linear-gradient(135deg,rgba(${rgb},0.12) 0%,transparent 60%)`}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{width:64,height:64,flexShrink:0,borderRadius:10,
            background:`linear-gradient(160deg,rgba(${rgb},0.3),rgba(0,0,0,0.4))`,
            border:`1px solid ${ELEM_CLR[char.element]||'var(--border-dim)'}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>
            {dead ? '💀' : '👤'}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:700}}>{char.name}</span>
              <ElementBadge element={char.element}/>
              <span style={{fontSize:'0.55rem',fontFamily:'var(--font-mono)',fontWeight:700,color:'#ffcc00',
                background:'rgba(0,0,0,0.5)',padding:'1px 5px',borderRadius:3}}>SSR</span>
            </div>
            {/* HP */}
            <div style={{marginBottom:4}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontSize:'0.58rem',color:'#60cc60',fontFamily:'var(--font-mono)'}}>HP</span>
                <span style={{fontSize:'0.62rem',color:'#60cc60',fontFamily:'var(--font-mono)',fontWeight:700}}>
                  {formatNumber(char.hp)} / {formatNumber(char.hp_max)}
                </span>
              </div>
              <div className="bar-track" style={{height:8}}>
                <div className={`bar-fill bar-hp${hp_cls}`} style={{width:`${Math.max(0,Math.min(100,hp_pct*100))}%`}}/>
              </div>
            </div>
            {/* CA */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                <span style={{fontSize:'0.58rem',color:'#f0c030',fontFamily:'var(--font-mono)'}}>CHARGE ATTACK</span>
                <span style={{fontSize:'0.62rem',color:'#f0c030',fontFamily:'var(--font-mono)',fontWeight:700}}>{char.charge_bar}%</span>
              </div>
              <div className="bar-track" style={{height:6,background:'rgba(0,0,0,0.5)'}}>
                <div style={{height:'100%',borderRadius:3,width:`${char.charge_bar}%`,
                  background:'linear-gradient(90deg,#7a6000,#f0c030)',transition:'width 0.4s',
                  boxShadow:char.charge_bar>=100?'0 0 8px rgba(240,192,48,0.6)':'none'}}/>
              </div>
              {char.charge_bar>=100 && (
                <div style={{fontSize:'0.55rem',color:'#f0c030',fontFamily:'var(--font-mono)',fontWeight:700,marginTop:2}}>
                  ★ READY — fires on Attack
                </div>
              )}
            </div>
          </div>
        </div>
        {char.status_effects?.length > 0 && (
          <div style={{marginTop:8,display:'flex',gap:4,flexWrap:'wrap'}}>
            <StatusEffectList effects={char.status_effects}/>
          </div>
        )}
      </div>

      {/* Skills */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{fontSize:'0.58rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',letterSpacing:'0.06em'}}>
          SKILLS · tap card body for description · instant · no turn cost
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {abilities.map(ab => (
            <SkillCard
              key={ab.id}
              ab={ab}
              runtime_char={char}
              dead={dead}
              is_preset={false}
              onUseAbility={onUseAbility}
            />
          ))}
        </div>

        {cat_char?.charge_attack && (
          <div style={{padding:'10px 12px',borderRadius:10,
            background:'rgba(240,192,48,0.06)',border:'1px solid rgba(240,192,48,0.2)'}}>
            <div style={{fontSize:'0.55rem',color:'var(--text-dim)',fontFamily:'var(--font-mono)',
              letterSpacing:'0.06em',marginBottom:3}}>CHARGE ATTACK · fires at 100%</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'0.85rem',fontWeight:700,
              color:'var(--text-gold)',marginBottom:3}}>{cat_char.charge_attack.name}</div>
            <div style={{fontSize:'0.68rem',color:'var(--text-dim)',lineHeight:1.45}}>
              {cat_char.charge_attack.description}
            </div>
          </div>
        )}
      </div>

      {/* Attack button */}
      <div style={{padding:'10px 14px',borderTop:'1px solid var(--border-dim)',flexShrink:0,
        background:'var(--bg-panel)',display:'flex',gap:10,alignItems:'center'}}>
        <div style={{fontSize:'0.6rem',color:is_attacking?'var(--charge-blue)':'var(--gold-bright)',
          fontFamily:'var(--font-mono)',flex:1}}>
          {is_attacking ? '⚔ Resolving turn...' : 'Use skills freely, then press Attack to end your turn'}
        </div>
        <button className="btn btn-primary"
          style={{padding:'12px 32px',fontSize:'0.9rem',letterSpacing:'0.06em',flexShrink:0,
            opacity:is_attacking?0.5:1,boxShadow:is_attacking?'none':'0 0 22px rgba(32,96,184,0.5)'}}
          disabled={is_attacking} onClick={onAttack}>
          {is_attacking ? '⚔ Attacking...' : '⚔ ATTACK'}
        </button>
      </div>
    </div>
  );
}

function WaitingPanel({ players, player_id, my_ready, onReady }) {
  return (
    <div style={{textAlign:'center',padding:'8px 0'}}>
      <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:10,flexWrap:'wrap'}}>
        {players?.map(p=>(
          <div key={p.player_id} style={{padding:'3px 10px',borderRadius:20,fontSize:'0.68rem',fontFamily:'var(--font-mono)',
            background:p.is_ready?'rgba(50,180,50,0.15)':'rgba(100,100,100,0.1)',
            border:`1px solid ${p.is_ready?'rgba(50,180,50,0.4)':'var(--border-dim)'}`,
            color:p.is_ready?'#60cc60':'var(--text-dim)'}}>
            {p.is_ready?'✓':'○'} {p.name}
          </div>
        ))}
      </div>
      {!my_ready
        ?<button className="btn btn-gold btn-sm" onClick={onReady}>✓ Ready!</button>
        :<div className="pulse" style={{color:'#60cc60',fontFamily:'var(--font-display)',fontSize:'0.78rem'}}>✓ Waiting for others...</div>
      }
    </div>
  );
}

function CombatLog({ turn_log }) {
  return (
    <div style={{flex:1,overflowY:'auto',padding:'8px 10px',minHeight:0}}>
      <div className="combat-log" style={{display:'flex',flexDirection:'column',gap:1}}>
        {turn_log.map((e,i)=><LogEntry key={i} entry={e}/>)}
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  const {type,char_name,ability_name,damage,heal,target,cb_bonus,chain_count,description,msg,player_prefix}=entry;
  const stamp=entry.ts?<span style={{color:'rgba(60,80,120,0.5)',marginRight:4,fontFamily:'var(--font-mono)',fontSize:'0.55rem',flexShrink:0}}>{entry.ts}</span>:null;
  const prefix=player_prefix?<span style={{color:'var(--text-dim)',marginRight:3,fontSize:'0.58rem'}}>[{player_prefix}]</span>:null;
  if(type==='TURN_DIVIDER') return (
    <div style={{display:'flex',alignItems:'center',gap:4,margin:'4px 0',opacity:0.35}}>
      <div style={{flex:1,height:1,background:'var(--border-dim)'}}/><span style={{fontFamily:'var(--font-mono)',fontSize:'0.55rem',color:'var(--text-dim)'}}>T{entry.turn}</span><div style={{flex:1,height:1,background:'var(--border-dim)'}}/>
    </div>
  );
  const map={
    NORMAL_ATTACK: {cls:'log-attack', t:()=>`${char_name} → ${formatNumber(damage)} dmg`},
    CHARGE_ATTACK: {cls:'log-ca',     t:()=>`★ ${char_name} CA! ${formatNumber(damage)} dmg`},
    CHAIN_BURST:   {cls:'log-cb',     t:()=>`⚡ ${chain_count}-CHAIN! +${formatNumber(cb_bonus)}`},
    ABILITY:       {cls:'log-ability',t:()=>`◆ ${char_name} [${ability_name}]${damage?' '+formatNumber(damage)+' dmg':''}`},
    HEAL:          {cls:'log-heal',   t:()=>`+ ${char_name} [${ability_name}] +${formatNumber(heal)} HP`},
    BUFF_APPLIED:  {cls:'log-ability',t:()=>`↑ ${char_name} [${ability_name}]`},
    DEBUFF_APPLIED:{cls:'log-debuff', t:()=>`↓ [${ability_name||'Debuff'}] → ${target||'boss'}`},
    STATUS_APPLIED:{cls:'log-debuff', t:()=>`↓ ${entry.effect?.type||'Status'} → ${entry.target||'?'}`},
    BOSS_ATTACK:   {cls:'log-boss',   t:()=>`🔴 Boss → ${target||'?'} ${formatNumber(damage)} dmg`},
    BOSS_CA_HIT:   {cls:'log-boss',   t:()=>`💥 Boss CA → ${entry.target} ${formatNumber(damage)} dmg`},
    BOSS_CHARGE_ATTACK:{cls:'log-boss',t:()=>`💥 BOSS CA: ${entry.ca_name||ability_name}!`},
    TRIGGER:       {cls:'log-trigger',t:()=>`⚠ ${entry.name}: ${description}`},
    PHASE_CHANGE:  {cls:'log-phase',  t:()=>`🔴 PHASE ${entry.phase}: ${description}`},
    SYSTEM:        {cls:'log-system', t:()=>msg||description||'...'},
    DOT:           {cls:'log-boss',   t:()=>`🔥 ${entry.source} ${formatNumber(entry.damage)} → ${entry.target_id}`},
    REGEN:         {cls:'log-heal',   t:()=>`💚 Regen +${formatNumber(entry.heal)} → ${entry.target_id}`},
    ERROR:         {cls:'log-system', t:()=>`ERR: ${entry.msg}`},
  };
  const def=map[type]; if(!def) return null;
  return (
    <div className={def.cls} style={{lineHeight:1.5,display:'flex',alignItems:'baseline',fontSize:'0.65rem'}}>
      {stamp}{prefix}<span>{def.t()}</span>
    </div>
  );
}
