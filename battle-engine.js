"use strict";

const TYPES = {
  "노말": { "바위": .5, "고스트": 0, "강철": .5 }, "불꽃": { "불꽃": .5, "물": .5, "풀": 2, "얼음": 2, "벌레": 2, "바위": .5, "드래곤": .5, "강철": 2 },
  "물": { "불꽃": 2, "물": .5, "풀": .5, "땅": 2, "바위": 2, "드래곤": .5 }, "전기": { "물": 2, "전기": .5, "풀": .5, "땅": 0, "비행": 2, "드래곤": .5 },
  "풀": { "불꽃": .5, "물": 2, "풀": .5, "독": .5, "땅": 2, "비행": .5, "벌레": .5, "바위": 2, "드래곤": .5, "강철": .5 }, "얼음": { "불꽃": .5, "물": .5, "풀": 2, "얼음": .5, "땅": 2, "비행": 2, "드래곤": 2, "강철": .5 },
  "격투": { "노말": 2, "얼음": 2, "독": .5, "비행": .5, "에스퍼": .5, "벌레": .5, "바위": 2, "고스트": 0, "악": 2, "강철": 2, "페어리": .5 }, "독": { "풀": 2, "독": .5, "땅": .5, "바위": .5, "고스트": .5, "강철": 0, "페어리": 2 },
  "땅": { "불꽃": 2, "전기": 2, "풀": .5, "독": 2, "비행": 0, "벌레": .5, "바위": 2, "강철": 2 }, "비행": { "전기": .5, "풀": 2, "격투": 2, "벌레": 2, "바위": .5, "강철": .5 },
  "에스퍼": { "격투": 2, "독": 2, "에스퍼": .5, "악": 0, "강철": .5 }, "벌레": { "불꽃": .5, "풀": 2, "격투": .5, "독": .5, "비행": .5, "에스퍼": 2, "고스트": .5, "악": 2, "강철": .5, "페어리": .5 },
  "바위": { "불꽃": 2, "얼음": 2, "격투": .5, "땅": .5, "비행": 2, "벌레": 2, "강철": .5 }, "고스트": { "노말": 0, "에스퍼": 2, "고스트": 2, "악": .5 },
  "드래곤": { "드래곤": 2, "강철": .5, "페어리": 0 }, "악": { "격투": .5, "에스퍼": 2, "고스트": 2, "악": .5, "페어리": .5 },
  "강철": { "불꽃": .5, "물": .5, "전기": .5, "얼음": 2, "바위": 2, "강철": .5, "페어리": 2 }, "페어리": { "불꽃": .5, "격투": 2, "독": .5, "드래곤": 2, "악": 2, "강철": .5 }
};

const STATUS = { burn:"화상", paralysis:"마비", poison:"독", toxic:"맹독", sleep:"잠듦", freeze:"얼음" };
const STAGE_NAME = { attack:"공격", defense:"방어", spAttack:"특수공격", spDefense:"특수방어", speed:"스피드" };
const STRUGGLE = { id:"struggle", name:"발버둥", type:"노말", category:"physical", power:50, accuracy:100, pp:1, maxPp:1, recoil:.25, description:"사용할 수 있는 기술이 없을 때 쓰는 기술." };

function cleanId(value="") { return String(value).toLowerCase().replace(/[^a-z0-9]/g,""); }
function clamp(value,min,max) { return Math.max(min,Math.min(max,Number(value)||0)); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function abilityId(monster) { return cleanId(monster?.ability?.id || monster?.abilityId || ""); }
function abilityName(monster) { return monster?.ability?.name || monster?.abilityName || "특성"; }
function log(battle,text,kind="message") {
  battle.eventId += 1;
  battle.log.push({ id:battle.eventId, text, kind, at:Date.now() });
  if (battle.log.length > 50) battle.log.splice(0,battle.log.length - 50);
}
function stageMultiplier(stage) { return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage); }
function effectiveStat(monster,key) {
  let value = Number(monster.stats[key] || 1) * stageMultiplier(monster.stages[key] || 0);
  const ability = abilityId(monster);
  if (key === "speed" && monster.status === "paralysis") value *= .5;
  if (key === "attack") {
    if (["hugepower","purepower"].includes(ability)) value *= 2;
    if (monster.status && ability === "guts") value *= 1.5;
    if (monster.status === "burn" && ability !== "guts") value *= .5;
  }
  if (key === "defense" && ability === "furcoat") value *= 2;
  if (key === "spDefense" && ability === "icescales") value *= 2;
  return Math.max(1,value);
}
function typeEffect(move,target) {
  const chart = TYPES[move.type] || {};
  return (chart[target.type1] ?? 1) * (target.type2 ? (chart[target.type2] ?? 1) : 1);
}
function applyStages(battle,target,changes,opponentCaused=false) {
  if (!changes) return false;
  if (opponentCaused && ["clearbody","whitesmoke","fullmetalbody"].includes(abilityId(target)) && Object.values(changes).some(value => value < 0)) {
    log(battle,`${target.name}의 ${abilityName(target)}! 능력치가 떨어지지 않았다.`);
    return false;
  }
  const changed = [];
  for (const [key,delta] of Object.entries(changes)) {
    if (!(key in target.stages)) continue;
    const before = target.stages[key];
    target.stages[key] = clamp(before + Number(delta),-6,6);
    if (target.stages[key] !== before) changed.push(`${STAGE_NAME[key] || key} ${delta > 0 ? "상승" : "하락"}`);
  }
  if (changed.length) log(battle,`${target.name}의 ${changed.join(" · ")}!`,"stage");
  return changed.length > 0;
}
function defaultPp(move) {
  if (Number(move.pp) > 0) return Number(move.pp);
  if (move.category === "status") return 20;
  if (Number(move.power) >= 120) return 5;
  if (Number(move.power) >= 100) return 10;
  if (Number(move.power) >= 80) return 15;
  return 25;
}
function createCombatant(snapshot) {
  const stats = copy(snapshot.stats || {});
  const maxHp = Math.max(1,Number(stats.hp) || 100);
  return {
    id:String(snapshot.id || snapshot.speciesId || Math.random()), name:String(snapshot.name || "몬스터"), image:String(snapshot.image || ""),
    level:clamp(snapshot.level || 50,1,100), type1:snapshot.type1 || "노말", type2:snapshot.type2 || "", stats,
    ability:copy(snapshot.ability || { id:snapshot.abilityId || "", name:snapshot.abilityName || "특성" }),
    moves:(snapshot.moves || []).slice(0,4).map(raw => { const move=copy(raw); move.maxPp=defaultPp(move); move.pp=move.maxPp; return move; }),
    maxHp, currentHp:maxHp, stages:{attack:0,defense:0,spAttack:0,spDefense:0,speed:0}, status:null, sleepTurns:0, toxicCounter:0,
    fainted:false, protected:false, entered:false, flashFireBoost:false
  };
}
function activeMonster(battle,side) { return battle.teams[side][battle.active[side]]; }
function livingIndexes(battle,side) { return battle.teams[side].map((monster,index)=>!monster.fainted&&monster.currentHp>0?index:-1).filter(index=>index>=0); }
function hasBench(battle,side) { return livingIndexes(battle,side).some(index=>index!==battle.active[side]); }
function applyEntry(battle,side) {
  const actor=activeMonster(battle,side), foe=activeMonster(battle,1-side);
  if (!actor || actor.entered || actor.fainted) return;
  actor.entered=true;
  if (abilityId(actor)==="intimidate" && foe && !foe.fainted) {
    log(battle,`${actor.name}의 위협!`,`ability`);
    if (abilityId(foe)==="innerfocus") log(battle,`${foe.name}은 정신력으로 위축되지 않았다.`);
    else applyStages(battle,foe,{attack:-1},true);
  }
}
function startBattle(teams,nicknames) {
  if (!Array.isArray(teams) || teams.length !== 2 || teams.some(team=>!Array.isArray(team)||team.length<1)) throw new Error("양쪽 팀이 필요합니다.");
  const battle={ version:1, turn:1, phase:"select", teams:teams.map(team=>team.slice(0,6).map(createCombatant)), active:[0,0], pending:[null,null],
    nicknames:[String(nicknames?.[0]||"PLAYER 1"),String(nicknames?.[1]||"PLAYER 2")], winner:null, eventId:0, log:[], updatedAt:Date.now() };
  log(battle,`${battle.nicknames[0]}와 ${battle.nicknames[1]}의 배틀이 시작됐다!`,`start`);
  log(battle,`${activeMonster(battle,0).name}! 준비는 됐지?`);
  log(battle,`상대는 ${activeMonster(battle,1).name}을 내보냈다!`);
  applyEntry(battle,0); applyEntry(battle,1);
  return battle;
}
function statusAllowed(target,status) {
  if (target.status) return false;
  const ability=abilityId(target), types=[target.type1,target.type2];
  if (ability==="purifyingsalt") return false;
  if (status==="burn" && (types.includes("불꽃") || ["waterveil","waterbubble"].includes(ability))) return false;
  if (status==="paralysis" && (types.includes("전기") || ability==="limber")) return false;
  if (["poison","toxic"].includes(status) && (types.includes("독") || types.includes("강철") || ability==="immunity")) return false;
  if (status==="freeze" && (types.includes("얼음") || ability==="magmaarmor")) return false;
  if (status==="sleep" && ["insomnia","vitalspirit","sweetveil"].includes(ability)) return false;
  return true;
}
function inflictStatus(battle,target,status) {
  if (!statusAllowed(target,status)) return false;
  target.status=status;
  if (status==="sleep") target.sleepTurns=1+Math.floor(Math.random()*3);
  if (status==="toxic") target.toxicCounter=0;
  log(battle,`${target.name}은 ${STATUS[status] || status} 상태가 됐다!`,`status`);
  return true;
}
function preAction(battle,actor) {
  if (actor.status==="sleep") {
    actor.sleepTurns-=1;
    if (actor.sleepTurns>0) { log(battle,`${actor.name}은 쿨쿨 잠들어 있다.`); return false; }
    actor.status=null; log(battle,`${actor.name}은 잠에서 깨어났다!`);
  }
  if (actor.status==="freeze") {
    if (Math.random()<.2) { actor.status=null; log(battle,`${actor.name}의 얼음이 녹았다!`); }
    else { log(battle,`${actor.name}은 얼어붙어 움직일 수 없다!`); return false; }
  }
  if (actor.status==="paralysis" && Math.random()<.25) { log(battle,`${actor.name}은 몸이 저려 움직일 수 없다!`); return false; }
  return true;
}
function abilityImmunity(battle,actor,target,move) {
  const source=abilityId(actor), ability=abilityId(target);
  if (["moldbreaker","turboblaze","teravolt"].includes(source)) return false;
  if (ability==="levitate" && move.type==="땅") { log(battle,`${target.name}의 부유! 공격이 통하지 않았다.`,`ability`); return true; }
  if (ability==="goodasgold" && move.category==="status") { log(battle,`${target.name}의 황금몸! 변화기술이 통하지 않았다.`,`ability`); return true; }
  if (move.type==="물" && ["waterabsorb","dryskin","stormdrain"].includes(ability)) {
    target.currentHp=Math.min(target.maxHp,target.currentHp+Math.max(1,Math.floor(target.maxHp/4)));
    if (ability==="stormdrain") applyStages(battle,target,{spAttack:1});
    log(battle,`${target.name}의 ${abilityName(target)}! HP를 회복했다.`,`ability`); return true;
  }
  if (move.type==="불꽃" && ability==="flashfire") { target.flashFireBoost=true; log(battle,`${target.name}의 타오르는불꽃! 불꽃을 받아냈다.`,`ability`); return true; }
  return false;
}
function damageResult(actor,target,move) {
  const atkKey=move.category==="physical"?"attack":"spAttack", defKey=move.category==="physical"?"defense":"spDefense";
  let attack=effectiveStat(actor,atkKey), defense=effectiveStat(target,defKey), power=move.variablePower?60:Math.max(1,Number(move.power)||1);
  const source=abilityId(actor), defender=abilityId(target);
  if (source==="technician" && power<=60) power*=1.5;
  if (source==="toughclaws" && move.contact) power*=1.3;
  if (source==="adaptability") { /* STAB below */ }
  if (actor.currentHp<=actor.maxHp/3 && ((source==="blaze"&&move.type==="불꽃")||(source==="torrent"&&move.type==="물")||(source==="overgrow"&&move.type==="풀")||(source==="swarm"&&move.type==="벌레"))) power*=1.5;
  if (actor.flashFireBoost && move.type==="불꽃") power*=1.5;
  const stab=(move.type===actor.type1||move.type===actor.type2)?(source==="adaptability"?2:1.5):1;
  const effect=typeEffect(move,target), critical=Math.random() < (move.highCrit?1/8:1/24), random=.85+Math.random()*.15;
  let damage=effect===0?0:Math.max(1,Math.floor(((((2*actor.level/5+2)*power*attack/defense)/50)+2)*stab*effect*(critical?1.5:1)*random));
  if (defender==="multiscale" && target.currentHp===target.maxHp) damage=Math.max(1,Math.floor(damage/2));
  if (defender==="sturdy" && target.currentHp===target.maxHp && damage>=target.currentHp) damage=target.currentHp-1;
  return {damage,effect,critical};
}
function useMove(battle,side,action) {
  const actor=activeMonster(battle,side), target=activeMonster(battle,1-side);
  if (!actor || actor.fainted || !target || target.fainted) return;
  if (!preAction(battle,actor)) return;
  let move=actor.moves[action.moveIndex];
  if (!move || move.pp<=0) {
    if (actor.moves.some(item=>item.pp>0)) { log(battle,`${actor.name}은 그 기술을 사용할 수 없다!`); return; }
    move=copy(STRUGGLE);
  } else move.pp-=1;
  log(battle,`${actor.name}의 ${move.name}!`,`move`);
  if (move.effect==="protect") { actor.protected=true; log(battle,`${actor.name}은 방어 태세를 취했다!`); return; }
  if (move.effect==="heal") { const before=actor.currentHp; actor.currentHp=Math.min(actor.maxHp,actor.currentHp+Math.max(1,Math.floor(actor.maxHp*(move.heal||.5)))); log(battle,`${actor.name}의 HP가 ${actor.currentHp-before} 회복됐다!`); return; }
  if (move.category==="status" && move.selfStages) { applyStages(battle,actor,move.selfStages); return; }
  if (target.protected) { log(battle,`${target.name}은 공격을 방어했다!`); return; }
  const accuracy=move.alwaysHit?1000:Number(move.accuracy||100);
  if (Math.random()*100>accuracy) { log(battle,`${actor.name}의 공격은 빗나갔다!`,`miss`); return; }
  if (abilityImmunity(battle,actor,target,move)) return;
  if (move.category==="status" && move.inflict) {
    if (typeEffect(move,target)===0) log(battle,`${target.name}에게는 효과가 없다…`,`immune`);
    else if (!inflictStatus(battle,target,move.inflict)) log(battle,`${target.name}에게는 상태이상이 통하지 않았다.`);
    return;
  }
  if (move.category==="status" && move.targetStages) { applyStages(battle,target,move.targetStages,true); return; }
  const result=damageResult(actor,target,move);
  let hits=1;
  if(Array.isArray(move.multihit)){const min=clamp(move.multihit[0],1,10),max=clamp(move.multihit[1],min,10);hits=min+Math.floor(Math.random()*(max-min+1));}
  else if(Number(move.multihit)>1)hits=clamp(move.multihit,1,10);
  if(result.effect!==0){if(move.ohko)result.damage=target.currentHp;else if(move.fixedDamage==="level")result.damage=actor.level;else if(Number(move.fixedDamage)>0)result.damage=Number(move.fixedDamage);else result.damage*=hits;}
  target.currentHp=Math.max(0,target.currentHp-result.damage);
  if(hits>1)log(battle,`${hits}번 맞았다!`,`message`);
  if (result.effect===0) log(battle,`${target.name}에게는 효과가 없다…`,`immune`);
  else {
    if (result.critical) log(battle,`급소에 맞았다!`,`critical`);
    if (result.effect>1) log(battle,`효과가 굉장했다!`,`super`);
    else if (result.effect<1) log(battle,`효과가 별로인 듯하다…`,`resist`);
  }
  if (move.drain && result.damage>0) { actor.currentHp=Math.min(actor.maxHp,actor.currentHp+Math.max(1,Math.floor(result.damage*move.drain))); log(battle,`${actor.name}은 상대의 체력을 흡수했다!`); }
  if (move.recoil && result.damage>0 && abilityId(actor)!=="magicguard") { actor.currentHp=Math.max(0,actor.currentHp-Math.max(1,Math.floor(result.damage*move.recoil))); log(battle,`${actor.name}은 반동 데미지를 받았다!`); }
  if (move.selfStages) applyStages(battle,actor,move.selfStages);
  if (move.secondary && target.currentHp>0 && Math.random()*100<(Number(move.secondary.chance)||100)) {
    if (move.secondary.status) inflictStatus(battle,target,move.secondary.status);
    if (move.secondary.stages) applyStages(battle,target,move.secondary.stages,true);
    if (move.secondary.selfStages) applyStages(battle,actor,move.secondary.selfStages);
  }
  if (move.contact && target.currentHp>0 && ["roughskin","ironbarbs"].includes(abilityId(target)) && abilityId(actor)!=="magicguard") {
    actor.currentHp=Math.max(0,actor.currentHp-Math.max(1,Math.floor(actor.maxHp/8)));
    log(battle,`${actor.name}은 ${abilityName(target)}로 데미지를 입었다!`,`ability`);
  }
  if (move.contact && target.currentHp>0 && abilityId(target)==="static" && Math.random()<.3) inflictStatus(battle,actor,"paralysis");
  if (move.contact && target.currentHp>0 && abilityId(target)==="flamebody" && Math.random()<.3) inflictStatus(battle,actor,"burn");
  if (move.selfDestruct) { actor.currentHp=0;actor.fainted=true; }
  if (target.currentHp<=0) { target.fainted=true; log(battle,`${target.name}은 쓰러졌다!`,`faint`); }
  if (actor.currentHp<=0) { actor.fainted=true; log(battle,`${actor.name}도 쓰러졌다!`,`faint`); }
}
function switchMonster(battle,side,targetIndex,forced=false) {
  const team=battle.teams[side], before=activeMonster(battle,side), next=team[targetIndex];
  if (!next || next.fainted || next.currentHp<=0 || battle.active[side]===targetIndex) throw new Error("교체할 수 없는 몬스터입니다.");
  if (before && !before.fainted && !forced) log(battle,`${before.name}, 돌아와!`);
  battle.active[side]=targetIndex; next.entered=false;
  log(battle,`${next.name}! 너로 정했다!`,`switch`);
  applyEntry(battle,side);
}
function endTurn(battle) {
  for (let side=0;side<2;side+=1) {
    const monster=activeMonster(battle,side);
    if (!monster || monster.fainted) continue;
    if (abilityId(monster)==="speedboost") { log(battle,`${monster.name}의 가속!`,`ability`); applyStages(battle,monster,{speed:1}); }
    if (abilityId(monster)!=="magicguard" && ["burn","poison","toxic"].includes(monster.status)) {
      if (monster.status==="toxic") monster.toxicCounter=Math.min(15,monster.toxicCounter+1);
      const fraction=monster.status==="toxic"?monster.toxicCounter/16:(monster.status==="poison"?1/8:1/16);
      monster.currentHp=Math.max(0,monster.currentHp-Math.max(1,Math.floor(monster.maxHp*fraction)));
      log(battle,`${monster.name}은 ${STATUS[monster.status]} 데미지를 입었다!`,`status`);
      if (monster.currentHp<=0) { monster.fainted=true; log(battle,`${monster.name}은 쓰러졌다!`,`faint`); }
    }
    monster.protected=false;
  }
}
function updatePhase(battle) {
  const alive=[livingIndexes(battle,0),livingIndexes(battle,1)];
  if (!alive[0].length || !alive[1].length) {
    battle.phase="finished";
    battle.winner=!alive[0].length&&!alive[1].length?-1:(!alive[0].length?1:0);
    log(battle,battle.winner===-1?"배틀은 무승부로 끝났다.":`${battle.nicknames[battle.winner]}의 승리!`,`result`);
    return;
  }
  const forced=[activeMonster(battle,0)?.fainted||false,activeMonster(battle,1)?.fainted||false];
  if (forced[0] || forced[1]) { battle.phase="forcedSwitch"; battle.forced=forced; battle.pending=[forced[0]?null:{kind:"wait"},forced[1]?null:{kind:"wait"}]; }
  else { battle.phase="select"; battle.forced=[false,false]; battle.pending=[null,null]; battle.turn+=1; }
}
function resolveTurn(battle) {
  const actions=battle.pending.map((action,side)=>({...action,side})).filter(action=>action.kind!=="wait");
  if (battle.phase==="forcedSwitch") {
    for (const action of actions) switchMonster(battle,action.side,action.targetIndex,true);
    battle.phase="select"; battle.forced=[false,false]; battle.pending=[null,null]; battle.updatedAt=Date.now(); return;
  }
  actions.sort((left,right)=>{
    const lp=left.kind==="switch"?10:Number(activeMonster(battle,left.side)?.moves[left.moveIndex]?.priority||0);
    const rp=right.kind==="switch"?10:Number(activeMonster(battle,right.side)?.moves[right.moveIndex]?.priority||0);
    if (rp!==lp) return rp-lp;
    return effectiveStat(activeMonster(battle,right.side),"speed")-effectiveStat(activeMonster(battle,left.side),"speed") || Math.random()-.5;
  });
  for (const action of actions) {
    if (battle.phase==="finished") break;
    if (action.kind==="switch") switchMonster(battle,action.side,action.targetIndex);
    else useMove(battle,action.side,action);
  }
  endTurn(battle); updatePhase(battle); battle.updatedAt=Date.now();
}
function validateAction(battle,side,action) {
  if (!battle || battle.phase==="finished") throw new Error("이미 끝난 배틀입니다.");
  if (![0,1].includes(side) || battle.pending[side]!==null) throw new Error("이미 행동을 선택했습니다.");
  if (!action || !["move","switch"].includes(action.kind)) throw new Error("올바른 행동을 선택하세요.");
  if (battle.phase==="forcedSwitch" && action.kind!=="switch") throw new Error("쓰러진 몬스터를 교체해야 합니다.");
  if (action.kind==="switch") {
    const targetIndex=Number(action.targetIndex), target=battle.teams[side][targetIndex];
    if (!target || target.fainted || target.currentHp<=0 || targetIndex===battle.active[side]) throw new Error("교체할 수 없는 몬스터입니다.");
    return {kind:"switch",targetIndex};
  }
  const actor=activeMonster(battle,side), moveIndex=Number(action.moveIndex);
  if (!actor || actor.fainted) throw new Error("먼저 몬스터를 교체하세요.");
  if ((!actor.moves[moveIndex] || actor.moves[moveIndex].pp<=0) && actor.moves.some(move=>move.pp>0)) throw new Error("PP가 남아 있는 기술을 선택하세요.");
  return {kind:"move",moveIndex:actor.moves.some(move=>move.pp>0)?moveIndex:-1};
}
function submitAction(battle,side,action) {
  battle.pending[side]=validateAction(battle,side,action);
  battle.updatedAt=Date.now();
  if (battle.pending.every(Boolean)) resolveTurn(battle);
  return battle;
}
function publicBattle(battle,viewerSide) {
  const data=copy(battle);
  data.viewerSide=viewerSide;
  data.waitingForOpponent=data.phase!=="finished"&&data.pending[viewerSide]!==null&&data.pending[1-viewerSide]===null;
  data.actionRequired=data.phase!=="finished"&&data.pending[viewerSide]===null;
  data.pending=data.pending.map((action,side)=>action?(side===viewerSide?{kind:action.kind,submitted:true}:{submitted:true}):null);
  return data;
}

module.exports={startBattle,submitAction,publicBattle,createCombatant,typeEffect,effectiveStat};
