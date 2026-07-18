(() => {
  "use strict";

  const STORAGE_KEY = "nexus-arena-save-v2";
  const LEGACY_KEY = "nexus-arena-save-v1";
  const ADMIN_SESSION_KEY = "nexus-dex-admin-unlocked";
  const TYPES = {
    "노말": ["#9a9da8", "#eff0f2"], "불꽃": ["#f06b48", "#fff0eb"], "물": ["#4c91e8", "#eaf4ff"], "전기": ["#e7b72b", "#fff8d9"],
    "풀": ["#55ad65", "#eaf8ed"], "얼음": ["#5fc7cd", "#e7fafa"], "격투": ["#d34e63", "#fff0f2"], "독": ["#a763c7", "#f6edfb"],
    "땅": ["#c8894f", "#faefe4"], "비행": ["#748fda", "#eef2ff"], "에스퍼": ["#e86691", "#fff0f5"], "벌레": ["#91ad3e", "#f3f8e6"],
    "바위": ["#ad974f", "#f7f2e4"], "고스트": ["#6265a7", "#ededfa"], "드래곤": ["#5f65cf", "#ededff"], "악": ["#5e5660", "#efedef"],
    "강철": ["#5e94a4", "#eaf3f5"], "페어리": ["#da79b8", "#fff0fa"]
  };
  const TYPE_CHART = {
    "노말": { "바위": .5, "고스트": 0, "강철": .5 }, "불꽃": { "불꽃": .5, "물": .5, "풀": 2, "얼음": 2, "벌레": 2, "바위": .5, "드래곤": .5, "강철": 2 },
    "물": { "불꽃": 2, "물": .5, "풀": .5, "땅": 2, "바위": 2, "드래곤": .5 }, "전기": { "물": 2, "전기": .5, "풀": .5, "땅": 0, "비행": 2, "드래곤": .5 },
    "풀": { "불꽃": .5, "물": 2, "풀": .5, "독": .5, "땅": 2, "비행": .5, "벌레": .5, "바위": 2, "드래곤": .5, "강철": .5 },
    "얼음": { "불꽃": .5, "물": .5, "풀": 2, "얼음": .5, "땅": 2, "비행": 2, "드래곤": 2, "강철": .5 },
    "격투": { "노말": 2, "얼음": 2, "독": .5, "비행": .5, "에스퍼": .5, "벌레": .5, "바위": 2, "고스트": 0, "악": 2, "강철": 2, "페어리": .5 },
    "독": { "풀": 2, "독": .5, "땅": .5, "바위": .5, "고스트": .5, "강철": 0, "페어리": 2 }, "땅": { "불꽃": 2, "전기": 2, "풀": .5, "독": 2, "비행": 0, "벌레": .5, "바위": 2, "강철": 2 },
    "비행": { "전기": .5, "풀": 2, "격투": 2, "벌레": 2, "바위": .5, "강철": .5 }, "에스퍼": { "격투": 2, "독": 2, "에스퍼": .5, "악": 0, "강철": .5 },
    "벌레": { "불꽃": .5, "풀": 2, "격투": .5, "독": .5, "비행": .5, "에스퍼": 2, "고스트": .5, "악": 2, "강철": .5, "페어리": .5 },
    "바위": { "불꽃": 2, "얼음": 2, "격투": .5, "땅": .5, "비행": 2, "벌레": 2, "강철": .5 }, "고스트": { "노말": 0, "에스퍼": 2, "고스트": 2, "악": .5 },
    "드래곤": { "드래곤": 2, "강철": .5, "페어리": 0 }, "악": { "격투": .5, "에스퍼": 2, "고스트": 2, "악": .5, "페어리": .5 },
    "강철": { "불꽃": .5, "물": .5, "전기": .5, "얼음": 2, "바위": 2, "강철": .5, "페어리": 2 }, "페어리": { "불꽃": .5, "격투": 2, "독": .5, "드래곤": 2, "악": 2, "강철": .5 }
  };
  const STATS = [
    ["hp", "HP"], ["attack", "공격"], ["defense", "방어"], ["spAttack", "특공"], ["spDefense", "특방"], ["speed", "스피드"]
  ];
  const CAT = { physical: "물리", special: "특수", status: "변화" };
  const STATUS_LABEL = { burn: "화상", paralysis: "마비", poison: "독", toxic: "맹독", sleep: "잠듦", freeze: "얼음" };

  let MOVES = [
    { id:"tackle", name:"몸통박치기", type:"노말", category:"physical", power:40, accuracy:100, contact:true, description:"상대에게 몸을 부딪쳐 공격한다." },
    { id:"quickAttack", name:"전광석화", type:"노말", category:"physical", power:40, accuracy:100, priority:1, contact:true, description:"눈에 보이지 않는 속도로 먼저 공격한다." },
    { id:"extremeSpeed", name:"신속", type:"노말", category:"physical", power:80, accuracy:100, priority:2, contact:true, description:"굉장한 속도로 선제공격한다." },
    { id:"doubleEdge", name:"이판사판태클", type:"노말", category:"physical", power:120, accuracy:100, contact:true, recoil:.333, description:"강력하지만 준 피해의 1/3을 반동으로 받는다." },
    { id:"flamethrower", name:"화염방사", type:"불꽃", category:"special", power:90, accuracy:100, secondary:{status:"burn", chance:10}, description:"10% 확률로 상대를 화상 상태로 만든다." },
    { id:"flareBlitz", name:"플레어드라이브", type:"불꽃", category:"physical", power:120, accuracy:100, contact:true, recoil:.333, secondary:{status:"burn", chance:10}, description:"반동을 받고 10% 확률로 화상을 입힌다." },
    { id:"firePunch", name:"불꽃펀치", type:"불꽃", category:"physical", power:75, accuracy:100, contact:true, secondary:{status:"burn", chance:10}, description:"10% 확률로 화상을 입힌다." },
    { id:"surf", name:"파도타기", type:"물", category:"special", power:90, accuracy:100, description:"큰 파도로 상대를 공격한다." },
    { id:"hydroPump", name:"하이드로펌프", type:"물", category:"special", power:110, accuracy:80, description:"대량의 물을 세찬 기세로 발사한다." },
    { id:"aquaJet", name:"아쿠아제트", type:"물", category:"physical", power:40, accuracy:100, priority:1, contact:true, description:"물의 기세를 빌려 선제공격한다." },
    { id:"waterfall", name:"폭포오르기", type:"물", category:"physical", power:80, accuracy:100, contact:true, secondary:{flinch:true,chance:20}, description:"20% 확률로 상대를 풀죽게 한다." },
    { id:"thunderbolt", name:"10만볼트", type:"전기", category:"special", power:90, accuracy:100, secondary:{status:"paralysis",chance:10}, description:"10% 확률로 상대를 마비시킨다." },
    { id:"thunder", name:"번개", type:"전기", category:"special", power:110, accuracy:70, secondary:{status:"paralysis",chance:30}, description:"30% 확률로 상대를 마비시킨다." },
    { id:"voltTackle", name:"볼트태클", type:"전기", category:"physical", power:120, accuracy:100, contact:true, recoil:.333, secondary:{status:"paralysis",chance:10}, description:"반동을 받고 10% 확률로 마비시킨다." },
    { id:"gigaDrain", name:"기가드레인", type:"풀", category:"special", power:75, accuracy:100, drain:.5, description:"준 피해의 절반만큼 HP를 회복한다." },
    { id:"leafBlade", name:"리프블레이드", type:"풀", category:"physical", power:90, accuracy:100, contact:true, highCrit:true, description:"급소에 맞을 확률이 높다." },
    { id:"leafStorm", name:"리프스톰", type:"풀", category:"special", power:130, accuracy:90, selfStages:{spAttack:-2}, description:"사용 후 자신의 특수공격이 2랭크 떨어진다." },
    { id:"iceBeam", name:"냉동빔", type:"얼음", category:"special", power:90, accuracy:100, secondary:{status:"freeze",chance:10}, description:"10% 확률로 상대를 얼린다." },
    { id:"iceShard", name:"얼음뭉치", type:"얼음", category:"physical", power:40, accuracy:100, priority:1, description:"얼음덩어리를 순간적으로 만들어 선제공격한다." },
    { id:"blizzard", name:"눈보라", type:"얼음", category:"special", power:110, accuracy:70, secondary:{status:"freeze",chance:10}, description:"10% 확률로 상대를 얼린다." },
    { id:"closeCombat", name:"인파이트", type:"격투", category:"physical", power:120, accuracy:100, contact:true, selfStages:{defense:-1,spDefense:-1}, description:"사용 후 자신의 방어와 특수방어가 떨어진다." },
    { id:"drainPunch", name:"드레인펀치", type:"격투", category:"physical", power:75, accuracy:100, contact:true, drain:.5, description:"준 피해의 절반만큼 HP를 회복한다." },
    { id:"machPunch", name:"마하펀치", type:"격투", category:"physical", power:40, accuracy:100, priority:1, contact:true, description:"굉장한 속도로 펀치를 날려 선제공격한다." },
    { id:"sludgeBomb", name:"오물폭탄", type:"독", category:"special", power:90, accuracy:100, secondary:{status:"poison",chance:30}, description:"30% 확률로 상대를 독 상태로 만든다." },
    { id:"earthquake", name:"지진", type:"땅", category:"physical", power:100, accuracy:100, description:"땅을 흔들어 강한 충격을 준다." },
    { id:"earthPower", name:"대지의힘", type:"땅", category:"special", power:90, accuracy:100, secondary:{stages:{spDefense:-1},chance:10}, description:"10% 확률로 상대의 특수방어를 낮춘다." },
    { id:"airSlash", name:"에어슬래시", type:"비행", category:"special", power:75, accuracy:95, secondary:{flinch:true,chance:30}, description:"30% 확률로 상대를 풀죽게 한다." },
    { id:"braveBird", name:"브레이브버드", type:"비행", category:"physical", power:120, accuracy:100, contact:true, recoil:.333, description:"강력하지만 준 피해의 1/3을 반동으로 받는다." },
    { id:"psychic", name:"사이코키네시스", type:"에스퍼", category:"special", power:90, accuracy:100, secondary:{stages:{spDefense:-1},chance:10}, description:"10% 확률로 상대의 특수방어를 낮춘다." },
    { id:"zenHeadbutt", name:"사념의박치기", type:"에스퍼", category:"physical", power:80, accuracy:90, contact:true, secondary:{flinch:true,chance:20}, description:"20% 확률로 상대를 풀죽게 한다." },
    { id:"rockSlide", name:"스톤샤워", type:"바위", category:"physical", power:75, accuracy:90, secondary:{flinch:true,chance:30}, description:"30% 확률로 상대를 풀죽게 한다." },
    { id:"stoneEdge", name:"스톤에지", type:"바위", category:"physical", power:100, accuracy:80, highCrit:true, description:"급소에 맞을 확률이 높다." },
    { id:"shadowBall", name:"섀도볼", type:"고스트", category:"special", power:80, accuracy:100, secondary:{stages:{spDefense:-1},chance:20}, description:"20% 확률로 상대의 특수방어를 낮춘다." },
    { id:"shadowSneak", name:"야습", type:"고스트", category:"physical", power:40, accuracy:100, priority:1, contact:true, description:"그림자에 숨어 선제공격한다." },
    { id:"dragonClaw", name:"드래곤클로", type:"드래곤", category:"physical", power:80, accuracy:100, contact:true, description:"날카로운 발톱으로 공격한다." },
    { id:"dracoMeteor", name:"용성군", type:"드래곤", category:"special", power:130, accuracy:90, selfStages:{spAttack:-2}, description:"사용 후 자신의 특수공격이 2랭크 떨어진다." },
    { id:"darkPulse", name:"악의파동", type:"악", category:"special", power:80, accuracy:100, secondary:{flinch:true,chance:20}, description:"20% 확률로 상대를 풀죽게 한다." },
    { id:"ironHead", name:"아이언헤드", type:"강철", category:"physical", power:80, accuracy:100, contact:true, secondary:{flinch:true,chance:30}, description:"30% 확률로 상대를 풀죽게 한다." },
    { id:"flashCannon", name:"러스터캐논", type:"강철", category:"special", power:80, accuracy:100, secondary:{stages:{spDefense:-1},chance:10}, description:"10% 확률로 상대의 특수방어를 낮춘다." },
    { id:"moonblast", name:"문포스", type:"페어리", category:"special", power:95, accuracy:100, secondary:{stages:{spAttack:-1},chance:30}, description:"30% 확률로 상대의 특수공격을 낮춘다." },
    { id:"dazzlingGleam", name:"매지컬샤인", type:"페어리", category:"special", power:80, accuracy:100, description:"강력한 빛으로 상대에게 데미지를 준다." },
    { id:"protect", name:"방어", type:"노말", category:"status", accuracy:100, priority:4, effect:"protect", description:"그 턴의 공격을 막는다. 연속 사용 판정은 생략된다." },
    { id:"swordsDance", name:"칼춤", type:"노말", category:"status", accuracy:100, selfStages:{attack:2}, description:"자신의 공격을 2랭크 올린다." },
    { id:"dragonDance", name:"용의춤", type:"드래곤", category:"status", accuracy:100, selfStages:{attack:1,speed:1}, description:"자신의 공격과 스피드를 1랭크 올린다." },
    { id:"calmMind", name:"명상", type:"에스퍼", category:"status", accuracy:100, selfStages:{spAttack:1,spDefense:1}, description:"자신의 특수공격과 특수방어를 1랭크 올린다." },
    { id:"nastyPlot", name:"나쁜음모", type:"악", category:"status", accuracy:100, selfStages:{spAttack:2}, description:"자신의 특수공격을 2랭크 올린다." },
    { id:"recover", name:"HP회복", type:"노말", category:"status", accuracy:100, effect:"heal", heal:.5, description:"최대 HP의 절반을 회복한다." },
    { id:"thunderWave", name:"전기자석파", type:"전기", category:"status", accuracy:90, inflict:"paralysis", description:"상대를 마비 상태로 만든다." },
    { id:"willOWisp", name:"도깨비불", type:"불꽃", category:"status", accuracy:85, inflict:"burn", description:"상대를 화상 상태로 만든다." },
    { id:"toxic", name:"맹독", type:"독", category:"status", accuracy:90, inflict:"toxic", description:"턴마다 피해가 증가하는 맹독 상태로 만든다." },
    { id:"sleepPowder", name:"수면가루", type:"풀", category:"status", accuracy:75, inflict:"sleep", description:"상대를 1–3턴 동안 잠들게 한다." }
  ];

  let ABILITIES = [
    { id:"blaze", name:"맹화", description:"HP가 1/3 이하일 때 불꽃 기술 위력이 1.5배가 된다." },
    { id:"torrent", name:"급류", description:"HP가 1/3 이하일 때 물 기술 위력이 1.5배가 된다." },
    { id:"overgrow", name:"심록", description:"HP가 1/3 이하일 때 풀 기술 위력이 1.5배가 된다." },
    { id:"swarm", name:"벌레의알림", description:"HP가 1/3 이하일 때 벌레 기술 위력이 1.5배가 된다." },
    { id:"intimidate", name:"위협", description:"등장할 때 상대 전체의 공격을 1랭크 낮춘다." },
    { id:"levitate", name:"부유", description:"땅타입 기술을 받지 않는다." },
    { id:"sturdy", name:"옹골참", description:"HP가 가득 찼을 때 일격에 쓰러지지 않고 1 HP로 버틴다." },
    { id:"roughSkin", name:"까칠한피부", description:"접촉 공격을 한 상대에게 최대 HP의 1/8 피해를 준다." },
    { id:"static", name:"정전기", description:"접촉 공격을 받으면 30% 확률로 상대를 마비시킨다." },
    { id:"flameBody", name:"불꽃몸", description:"접촉 공격을 받으면 30% 확률로 상대를 화상 상태로 만든다." },
    { id:"speedBoost", name:"가속", description:"매 턴이 끝날 때 스피드가 1랭크 오른다." },
    { id:"hugePower", name:"천하장사", description:"물리공격에 사용하는 공격 능력치가 2배가 된다." },
    { id:"technician", name:"테크니션", description:"위력 60 이하인 기술의 위력이 1.5배가 된다." },
    { id:"adaptability", name:"적응력", description:"자속 보정이 1.5배 대신 2배가 된다." },
    { id:"multiscale", name:"멀티스케일", description:"HP가 가득 찼을 때 받는 데미지가 절반이 된다." },
    { id:"prankster", name:"짓궂은마음", description:"변화기술의 우선도가 1 올라간다." },
    { id:"magicGuard", name:"매직가드", description:"공격 이외의 반동·상태이상 데미지를 받지 않는다." },
    { id:"guts", name:"근성", description:"상태이상이면 물리공격이 1.5배가 되고 화상 공격 감소를 무시한다." },
    { id:"moldBreaker", name:"틀깨기", description:"공격할 때 상대의 방어 특성을 무시한다." },
    { id:"noGuard", name:"노가드", description:"서로가 사용하는 기술이 반드시 명중한다." },
    { id:"waterAbsorb", name:"저수", description:"물타입 기술을 무효화하고 최대 HP의 1/4을 회복한다." },
    { id:"flashFire", name:"타오르는불꽃", description:"불꽃 기술을 무효화하고 자신의 불꽃 기술을 강화한다." },
    { id:"clearBody", name:"클리어바디", description:"상대의 기술이나 특성으로 능력치가 떨어지지 않는다." },
    { id:"innerFocus", name:"정신력", description:"풀죽지 않으며 위협의 효과도 받지 않는다." }
  ];
  let MOVE_BY_ID = Object.fromEntries(MOVES.map(move => [move.id, move]));
  let ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(ability => [ability.id, ability]));

  const FULL_DEX_CACHE_KEY = "nexus-full-dex-cache-v1";
  const EN_TYPE_TO_KO = { Normal:"노말",Fire:"불꽃",Water:"물",Electric:"전기",Grass:"풀",Ice:"얼음",Fighting:"격투",Poison:"독",Ground:"땅",Flying:"비행",Psychic:"에스퍼",Bug:"벌레",Rock:"바위",Ghost:"고스트",Dragon:"드래곤",Dark:"악",Steel:"강철",Fairy:"페어리" };
  const STATUS_CODE = { brn:"burn",par:"paralysis",psn:"poison",tox:"toxic",slp:"sleep",frz:"freeze" };
  const BOOST_KEY = { atk:"attack",def:"defense",spa:"spAttack",spd:"spDefense",spe:"speed" };
  let fullDexState = { status:"loading", moves:MOVES.length, abilities:ABILITIES.length, source:"내장" };

  function dexId(value="") { return String(value).toLowerCase().replace(/[^a-z0-9]/g,""); }
  function convertBoosts(boosts) {
    const result = {};
    for (const [key,value] of Object.entries(boosts||{})) if (BOOST_KEY[key]) result[BOOST_KEY[key]] = value;
    return result;
  }
  function convertSecondary(secondary) {
    if (!secondary) return null;
    const result = { chance:Number(secondary.chance)||100 };
    if (secondary.status) result.status = STATUS_CODE[secondary.status] || secondary.status;
    if (secondary.volatileStatus === "flinch") result.flinch = true;
    if (secondary.boosts) result.stages = convertBoosts(secondary.boosts);
    if (secondary.self?.boosts) result.selfStages = convertBoosts(secondary.self.boosts);
    return result;
  }
  function koreanMoveDescription(data) {
    const parts=[];
    const boosts=data.boosts||data.self?.boosts;
    if(data.ohko)parts.push("맞으면 상대를 한 번에 쓰러뜨린다");
    else if(data.damage==="level")parts.push("자신의 레벨과 같은 고정 데미지를 준다");
    else if(Number(data.damage))parts.push(`${Number(data.damage)}의 고정 데미지를 준다`);
    else if(Number(data.basePower)>0)parts.push(`${EN_TYPE_TO_KO[data.type]||"노말"}타입 ${String(data.category).toLowerCase()==="physical"?"물리":"특수"} 공격이다`);
    else parts.push("전투 상황을 변화시키는 변화기술이다");
    if(data.priority>0)parts.push("우선도가 높아 먼저 사용하기 쉽다");
    if(data.status)parts.push(`상대를 ${STATUS_LABEL[STATUS_CODE[data.status]||data.status]||"상태이상"} 상태로 만든다`);
    if(data.secondary?.status)parts.push(`${data.secondary.chance||100}% 확률로 ${STATUS_LABEL[STATUS_CODE[data.secondary.status]||data.secondary.status]||"상태이상"}을 일으킨다`);
    if(data.secondary?.volatileStatus==="flinch")parts.push(`${data.secondary.chance||100}% 확률로 상대를 풀죽게 한다`);
    if(Array.isArray(data.drain)&&data.drain[0]>0)parts.push("준 데미지의 일부만큼 HP를 회복한다");
    if(Array.isArray(data.recoil))parts.push("준 데미지의 일부를 반동으로 받는다");
    if(Array.isArray(data.heal))parts.push("자신의 HP를 회복한다");
    if(data.stallingMove)parts.push("그 턴에 받는 공격을 막는다");
    if(Array.isArray(data.multihit))parts.push(`${data.multihit[0]}~${data.multihit[1]}회 연속으로 공격한다`);
    if(boosts&&Object.keys(boosts).length)parts.push(`${data.target==="self"||data.self?.boosts?"자신":"대상"}의 능력치 변화를 일으킨다`);
    return `${[...new Set(parts)].join(". ")}.`;
  }
  function mergeFullDex(extraMoves=[],extraAbilities=[]) {
    const moveAlias = Object.fromEntries(MOVES.map(move=>[dexId(move.id),move.id])),moveNum=Object.fromEntries(MOVES.filter(move=>move.num).map(move=>[move.num,move.id]));
    const abilityAlias = Object.fromEntries(ABILITIES.map(ability=>[dexId(ability.id),ability.id])),abilityNum=Object.fromEntries(ABILITIES.filter(ability=>ability.num).map(ability=>[ability.num,ability.id]));
    for (const incoming of extraMoves) {
      const alias = moveAlias[dexId(incoming.id)]||moveNum[incoming.num];
      if (alias && MOVE_BY_ID[alias]) Object.assign(MOVE_BY_ID[alias],{num:incoming.num,englishName:incoming.englishName||incoming.name,pp:incoming.pp,engineCoverage:"verified"});
      else { MOVES.push(incoming); moveAlias[dexId(incoming.id)]=incoming.id;if(incoming.num)moveNum[incoming.num]=incoming.id; }
    }
    for (const incoming of extraAbilities) {
      const alias = abilityAlias[dexId(incoming.id)]||abilityNum[incoming.num];
      if (alias && ABILITY_BY_ID[alias]) Object.assign(ABILITY_BY_ID[alias],{num:incoming.num,englishName:incoming.englishName||incoming.name,engineCoverage:"verified"});
      else { ABILITIES.push(incoming); abilityAlias[dexId(incoming.id)]=incoming.id;if(incoming.num)abilityNum[incoming.num]=incoming.id; }
    }
    MOVES.sort((a,b)=>(a.num??9999)-(b.num??9999)||a.name.localeCompare(b.name,"ko"));
    ABILITIES.sort((a,b)=>(a.num??9999)-(b.num??9999)||a.name.localeCompare(b.name,"ko"));
    MOVE_BY_ID=Object.fromEntries(MOVES.map(move=>[move.id,move]));
    ABILITY_BY_ID=Object.fromEntries(ABILITIES.map(ability=>[ability.id,ability]));
  }
  function parseFandomTable(html,kind) {
    const doc = new DOMParser().parseFromString(html,"text/html"), result = new Map();
    for (const row of doc.querySelectorAll("table tr")) {
      const cells=[...row.querySelectorAll("td")];
      if (cells.length<2) continue;
      const num=Number(cells[0].textContent.trim().replace(/\D/g,""));
      const name=cells[1].textContent.trim().replace(/\[[^\]]*\]/g,"");
      if (num&&name) result.set(num,{name,description:kind==="ability"?(cells[2]?.textContent.trim()||""):""});
    }
    return result;
  }
  async function fetchFandomNames(page,kind) {
    const url=`https://pokemon.fandom.com/ko/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&origin=*`;
    const data=await fetch(url).then(response=>{if(!response.ok)throw new Error("Fandom data");return response.json();});
    return parseFandomTable(data.parse?.text?.["*"]||"",kind);
  }
  function convertShowdownMove(key,data,korean) {
    const secondary=convertSecondary(data.secondary||(Array.isArray(data.secondaries)?data.secondaries[0]:null));
    const unsupported=!!(data.basePowerCallback||data.condition||data.weather||data.terrain||data.sideCondition||data.slotCondition||data.selfSwitch||data.forceSwitch||data.callsMove||data.twoTurnMove);
    const move={id:dexId(key),num:data.num,englishName:data.name,name:korean?.name||data.name,type:EN_TYPE_TO_KO[data.type]||"노말",category:String(data.category||"Status").toLowerCase(),power:Number(data.basePower)||((data.ohko||data.damage)?0:60),accuracy:data.accuracy===true?100:(Number(data.accuracy)||100),alwaysHit:data.accuracy===true,pp:Number(data.pp)||1,priority:Number(data.priority)||0,contact:!!data.flags?.contact,sound:!!data.flags?.sound,punch:!!data.flags?.punch,bite:!!data.flags?.bite,slicing:!!data.flags?.slicing,pulse:!!data.flags?.pulse,bullet:!!data.flags?.bullet,wind:!!data.flags?.wind,recoil:Array.isArray(data.recoil)?Math.abs(data.recoil[0]/data.recoil[1]):0,drain:Array.isArray(data.drain)&&data.drain[0]>0?data.drain[0]/data.drain[1]:0,highCrit:Number(data.critRatio)>1,multihit:data.multihit||null,ohko:!!data.ohko,fixedDamage:data.damage||null,selfDestruct:!!data.selfdestruct,description:koreanMoveDescription(data),isNonstandard:data.isNonstandard||"",engineCoverage:unsupported?"partial":"auto"};
    if (data.stallingMove) move.effect="protect";
    if (Array.isArray(data.heal)) { move.effect="heal"; move.heal=data.heal[0]/data.heal[1]; }
    if (data.status) move.inflict=STATUS_CODE[data.status]||data.status;
    if (data.boosts) { const boosts=convertBoosts(data.boosts); if(data.target==="self")move.selfStages=boosts;else move.targetStages=boosts; }
    if (data.self?.boosts) move.selfStages=convertBoosts(data.self.boosts);
    if (secondary) move.secondary=secondary;
    return move;
  }
  function parseShowdownAbilities(text) {
    const module={exports:{}};
    new Function("exports","module",text)(module.exports,module);
    return module.exports.BattleAbilities||module.exports;
  }
  async function fetchFullAbilityData() {
    try {
      const response=await fetch("https://play.pokemonshowdown.com/data/abilities.js");
      if(!response.ok)throw new Error("abilities");
      return parseShowdownAbilities(await response.text());
    } catch {
      const response=await fetch("https://pokeapi.co/api/v2/ability?limit=2000");
      if(!response.ok)throw new Error("ability fallback");
      const list=await response.json(), result={};
      for(const item of list.results||[]){const num=Number(item.url.match(/\/(\d+)\/?$/)?.[1]);if(num)result[dexId(item.name)]={num,name:item.name.split("-").map(part=>part[0]?.toUpperCase()+part.slice(1)).join(" "),shortDesc:"포켓몬 고유의 특성 효과를 발휘한다."};}
      return result;
    }
  }
  function convertShowdownAbility(key,data,korean) {
    return {id:dexId(key),num:data.num,englishName:data.name,name:korean?.name||data.name,description:korean?.description||"전투 중 이 포켓몬만의 고유한 특성 효과를 발휘한다.",isNonstandard:data.isNonstandard||"",engineCoverage:"reference"};
  }
  function updateFullDexStatus() {
    const node=document.querySelector("#fullDexStatus"); if(!node)return;
    node.classList.toggle("ready",fullDexState.status==="ready");
    node.classList.toggle("fallback",fullDexState.status==="fallback");
    if(fullDexState.status==="ready")node.innerHTML=`<span class="live-dot"></span><b>전체 데이터 준비 완료 · 기술 ${fullDexState.moves}개 · 특성 ${fullDexState.abilities}개</b><small>${fullDexState.source} 기준 · 고유 예외 효과는 지원 상태가 표시됩니다.</small>`;
    else if(fullDexState.status==="fallback")node.innerHTML=`<span class="live-dot"></span><b>온라인 전체 데이터를 불러오지 못했습니다.</b><small>현재 내장 기술 ${MOVES.length}개 · 특성 ${ABILITIES.length}개로 실행 중</small>`;
    else node.innerHTML=`<span class="live-dot"></span><b>전체 기술·특성 데이터를 불러오는 중입니다…</b><small>인터넷 연결이 없으면 내장 데이터로 실행됩니다.</small>`;
  }
  function loadCachedFullDex() {
    try { const cache=JSON.parse(localStorage.getItem(FULL_DEX_CACHE_KEY));if(cache?.version===1&&Array.isArray(cache.moves)&&Array.isArray(cache.abilities)){mergeFullDex(cache.moves,cache.abilities);fullDexState={status:"ready",moves:MOVES.length,abilities:ABILITIES.length,source:"저장된 전체 데이터"};return true;} } catch {}
    return false;
  }
  async function loadFullDex() {
    const cached=loadCachedFullDex(); updateFullDexStatus();
    try {
      const [moveRaw,abilityRaw,koMoves,koAbilities]=await Promise.all([
        fetch("https://play.pokemonshowdown.com/data/moves.json").then(r=>{if(!r.ok)throw new Error("moves");return r.json();}),
        fetchFullAbilityData(),
        fetchFandomNames("기술 목록","move").catch(()=>new Map()),
        fetchFandomNames("특성","ability").catch(()=>new Map())
      ]);
      const convertedMoves=Object.entries(moveRaw).map(([key,data])=>convertShowdownMove(key,data,koMoves.get(Number(data.num))));
      const convertedAbilities=Object.entries(abilityRaw).map(([key,data])=>convertShowdownAbility(key,data,koAbilities.get(Number(data.num))));
      mergeFullDex(convertedMoves,convertedAbilities);
      try{localStorage.setItem(FULL_DEX_CACHE_KEY,JSON.stringify({version:1,moves:convertedMoves,abilities:convertedAbilities}));}catch{}
      fullDexState={status:"ready",moves:MOVES.length,abilities:ABILITIES.length,source:"Pokémon Showdown + 한국 포켓몬 위키"};
      if(!document.querySelector("#monsterModal")?.hidden){renderAbilityLibrary(document.querySelector("#abilityLibrarySearch")?.value||"");renderMoveLibrary(document.querySelector("#moveLibrarySearch")?.value||"");}
    } catch { if(!cached)fullDexState={status:"fallback",moves:MOVES.length,abilities:ABILITIES.length,source:"내장"}; }
    updateFullDexStatus();
  }

  loadCachedFullDex();

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const els = {
    content: $("#appContent"), badge: $("#rosterBadge"), monsterModal: $("#monsterModal"), monsterForm: $("#monsterForm"),
    buildModal: $("#buildModal"), buildForm: $("#buildForm"), adminModal: $("#adminModal"), adminForm: $("#adminForm"), dataModal: $("#dataModal"), imageFile: $("#imageFile"),
    imageData: $("#imageData"), imagePreview: $("#imagePreview"), abilityLibrary: $("#abilityLibrary"), moveLibrary: $("#moveLibrary"),
    toast: $("#toastRegion"), floatingAdd: $("#floatingAdd")
  };
  let state = loadState();
  let route = "home", rosterQuery = "", rosterFilter = "전체", selectedFormat = "single", moveCategory = "all";
  let draftAbilities = new Set(), draftMoves = new Set(), draftBuildMoves = new Set();
  let battle = null, battleBusy = false, battlePanel = "moves";
  let adminUnlocked = sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
  let pendingAdminAction = null;

  function blankState() { return { version: 2, monsters: [], team: [], sound: true }; }
  function uid() { return crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function esc(value="") { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
  function defaultBuild(species) { return { speciesId:species.id, abilityId:species.allowedAbilityIds[0], moveIds:species.allowedMoveIds.slice(0,4), evs:Object.fromEntries(STATS.map(([key])=>[key,0])) }; }
  function normalizeMonster(m) {
    const baseStats = m.baseStats || { hp:m.stats?.hp||100, attack:m.stats?.attack||100, defense:m.stats?.defense||100, spAttack:m.stats?.attack||100, spDefense:m.stats?.defense||100, speed:m.stats?.speed||100 };
    const ivs = m.ivs || Object.fromEntries(STATS.map(([key])=>[key,31]));
    const mappedAbility = ABILITIES.find(a => a.name === m.ability)?.id || "clearBody";
    const mappedMoves = (m.moves || []).map(old => MOVES.find(move => move.name === old.name)?.id).filter(Boolean);
    return { id:m.id||uid(), name:m.name||"이름 없음", image:m.image||"", level:clamp(m.level||50,1,100), type1:m.type1||"노말", type2:m.type2||"", baseStats, ivs,
      allowedAbilityIds:(Array.isArray(m.allowedAbilityIds)&&m.allowedAbilityIds.length ? [...new Set(m.allowedAbilityIds.map(String))] : [mappedAbility]),
      allowedMoveIds:(Array.isArray(m.allowedMoveIds)&&m.allowedMoveIds.length ? [...new Set(m.allowedMoveIds.map(String))] : (mappedMoves.length?mappedMoves:["tackle"])) };
  }
  function normalizeState(raw) {
    const result = { ...blankState(), ...raw, version:2 };
    result.monsters = Array.isArray(raw?.monsters) ? raw.monsters.map(normalizeMonster) : [];
    result.team = (Array.isArray(raw?.team)?raw.team:[]).map(item => {
      if (typeof item === "string") { const species=result.monsters.find(m=>m.id===item); return species?defaultBuild(species):null; }
      const species=result.monsters.find(m=>m.id===item.speciesId); if(!species)return null;
      const validMoves=(item.moveIds||[]).filter(id=>species.allowedMoveIds.includes(id)).slice(0,4);
      return { ...defaultBuild(species), ...item, evs:{...defaultBuild(species).evs,...item.evs}, moveIds:validMoves.length?validMoves:species.allowedMoveIds.slice(0,4), abilityId:species.allowedAbilityIds.includes(item.abilityId)?item.abilityId:species.allowedAbilityIds[0] };
    }).filter(Boolean).slice(0,6);
    return result;
  }
  function loadState() {
    try { const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_KEY)); return raw?normalizeState(raw):blankState(); } catch { return blankState(); }
  }
  function saveState(reason="team",options={}) { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); els.badge.textContent=state.monsters.length;if(!options.silent)window.dispatchEvent(new CustomEvent("ishs-state-change",{detail:{reason,state:structuredClone(state),hydrating:!!options.hydrating}})); }
  function toast(message,kind="") { const n=document.createElement("div"); n.className=`toast ${kind}`; n.textContent=message; els.toast.appendChild(n); setTimeout(()=>n.remove(),3200); }
  async function hashPassword(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,"0")).join("");
  }
  function requireAdmin(action) {
    if (adminUnlocked) { action(); return; }
    pendingAdminAction = action;
    els.adminForm.reset();
    $("#adminError").hidden = true;
    els.adminModal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#adminPassword").focus(), 80);
  }
  function closeAdmin(clearPending=true) {
    els.adminModal.hidden = true;
    document.body.style.overflow = "";
    els.adminForm.reset();
    $("#adminError").hidden = true;
    if (clearPending) pendingAdminAction = null;
  }
  async function submitAdmin(event) {
    event.preventDefault();
    const submit = els.adminForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const password=$("#adminPassword").value;
      let verified=false;
      if(window.ISHSNetwork?.serverMode&&window.ISHSNetwork?.user){try{verified=await window.ISHSNetwork.adminUnlock(password);}catch{verified=false;}}
      else throw new Error("server-required");
      if (!verified) {
        $("#adminError").hidden = false;
        $("#adminPassword").select();
        return;
      }
      adminUnlocked = true;
      sessionStorage.setItem(ADMIN_SESSION_KEY,"1");
      const action = pendingAdminAction;
      closeAdmin(false);
      pendingAdminAction = null;
      toast("관리자 인증이 완료되었습니다.");
      if (action) action();
    } catch {
      toast("이 브라우저에서는 비밀번호 인증을 사용할 수 없습니다.","error");
    } finally {
      submit.disabled = false;
    }
  }
  function lockAdmin() {
    adminUnlocked = false;
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    toast("도감 관리자 기능을 잠갔습니다.");
    if (route === "roster") renderRoster();
  }
  function typeStyle(type){const t=TYPES[type]||TYPES["노말"];return `--type-color:${t[0]};--type-soft:${t[1]}`;}
  function typeTag(type){return type?`<span class="type-tag" style="--tag-color:${TYPES[type]?.[0]||TYPES["노말"][0]}">${esc(type)}</span>`:"";}
  function imageMarkup(m){return m.image?`<img src="${esc(m.image)}" alt="${esc(m.name)} 이미지">`:`<span class="monster-placeholder">${esc(m.name.slice(0,1)||"?")}</span>`;}
  function getSpecies(id){return state.monsters.find(m=>m.id===id);}
  function getAbility(id){return ABILITY_BY_ID[id]||ABILITIES[0];}
  function computeStats(species,evs={}) { const level=species.level; const out={}; for(const [key] of STATS){const base=Number(species.baseStats[key]),iv=Number(species.ivs[key]),ev=Math.floor((Number(evs[key])||0)/4);out[key]=key==="hp"?Math.floor(((2*base+iv+ev)*level)/100)+level+10:Math.floor(((2*base+iv+ev)*level)/100)+5;}return out; }

  function navigate(next){ route=next; $$('[data-route]').forEach(b=>b.classList.toggle("active",b.dataset.route===next&&b.classList.contains("nav-item"))); els.floatingAdd.style.display=next==="roster"&&innerWidth<=820?"flex":"none"; if(next==="rooms")return window.ISHSMultiplayer?.renderRooms(els.content);({home:renderHome,roster:renderRoster,team:renderTeam,battle:renderBattleSetup}[next]||renderHome)(); }
  function renderHome(){const count=state.monsters.length,team=state.team.length;els.content.innerHTML=`<div class="view home-view"><div class="arena-glow"></div><div class="home-content"><div class="home-copy"><span class="eyebrow">BUILD · COMMAND · CONQUER</span><h1>ISHS <span>ARENA</span></h1><p>도감에 나만의 몬스터를 등록하고 실제 기술·특성으로 배틀하세요. 개체값과 노력치가 전략을 완성합니다.</p><div class="home-actions"><button class="primary-button" data-action="${count?"go-team":"add-monster"}"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg>${count?"팀 만들기":"첫 몬스터 등록"}</button><button class="secondary-button" data-action="go-roster">몬스터 도감</button></div><div class="home-meta"><div><b>${String(count).padStart(2,"0")}</b><small>DEX</small></div><div><b>${String(team).padStart(2,"0")}/06</b><small>BATTLE TEAM</small></div><div><b>${count&&team?"READY":"SETUP"}</b><small>STATUS</small></div></div></div><div class="battle-orb-stage" aria-hidden="true"><div class="battle-orb"><span class="orb-line"></span><span class="orbit"><i></i></span></div><div class="stage-label"><small>COMPETITIVE CORE</small><b>IV · EV 시스템 온라인</b></div></div></div></div>`;}

  function renderRoster(){const visible=state.monsters.filter(m=>(!rosterQuery||m.name.toLowerCase().includes(rosterQuery.toLowerCase()))&&(rosterFilter==="전체"||m.type1===rosterFilter||m.type2===rosterFilter));const cards=visible.map(m=>`<article class="monster-card" style="${typeStyle(m.type1)}"><div class="monster-visual"><span class="level-tag">LV.${m.level}</span><div class="card-menu"><button data-action="edit-monster" data-id="${m.id}" aria-label="수정"><svg viewBox="0 0 24 24"><path d="m4 16-1 5 5-1L19 9l-4-4L4 16Zm9-9 4 4"/></svg></button><button class="delete-monster" data-action="delete-monster" data-id="${m.id}" aria-label="삭제"><svg viewBox="0 0 24 24"><path d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-3 3 1 14h10l1-14"/></svg></button></div>${imageMarkup(m)}</div><div class="monster-card-body"><div class="monster-name-row"><h3>${esc(m.name)}</h3></div><div class="type-tags">${typeTag(m.type1)}${typeTag(m.type2)}</div><p class="ability-line"><b>허용 풀</b>특성 ${m.allowedAbilityIds.length} · 기술 ${m.allowedMoveIds.length}</p><div class="actual-stat-list">${STATS.map(([k,l])=>`<span>${l} ${m.baseStats[k]}</span>`).join("")}</div><span class="locked-note">◇ IV ${STATS.map(([k])=>m.ivs[k]).join("/")}</span></div></article>`).join("");const empty=state.monsters.length?`<div class="empty-state"><div><div class="empty-state-visual"></div><h2>조건에 맞는 몬스터가 없습니다</h2><p>검색어나 타입 필터를 바꿔 보세요.</p></div></div>`:`<div class="empty-state"><div><div class="empty-state-visual"></div><h2>몬스터 도감이 비어 있습니다</h2><p>종족값과 개체값, 배울 수 있는 기술·특성을 정해 첫 몬스터를 등록하세요.</p><button class="primary-button" data-action="add-monster">도감 등록</button></div></div>`;els.content.innerHTML=`<div class="view roster-view"><div class="view-inner"><div class="page-heading"><div><span class="eyebrow">MONSTER DEX · ${state.monsters.length} SPECIES</span><h1>몬스터 도감</h1><p>몬스터의 고유 정보와 배울 수 있는 기술·특성 범위를 관리합니다.</p></div><div class="heading-actions"><button class="primary-button" data-action="add-monster"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>도감 등록</button></div></div>${state.monsters.length?`<div class="roster-toolbar"><label class="search-box"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="rosterSearch" value="${esc(rosterQuery)}" placeholder="몬스터 이름 검색"></label><div class="filter-chips">${["전체",...Object.keys(TYPES)].map(t=>`<button class="filter-chip ${rosterFilter===t?"active":""}" data-action="filter-type" data-type="${t}">${t}</button>`).join("")}</div></div>`:""}${visible.length?`<div class="monster-grid">${cards}</div>`:empty}</div></div>`;$("#rosterSearch")?.addEventListener("input",e=>{rosterQuery=e.target.value;renderRoster();$("#rosterSearch")?.focus();});}

  function renderTeam(){state.team=state.team.filter(b=>getSpecies(b.speciesId)).slice(0,6);const slots=Array.from({length:6},(_,i)=>{const build=state.team[i],m=build&&getSpecies(build.speciesId);if(!m)return`<div class="team-slot"><span class="slot-number">${String(i+1).padStart(2,"0")}</span><span class="slot-empty">빈 슬롯</span></div>`;const ability=getAbility(build.abilityId),stats=computeStats(m,build.evs);return`<div class="team-slot filled" style="${typeStyle(m.type1)}"><span class="slot-number">${String(i+1).padStart(2,"0")}</span><div class="slot-image">${imageMarkup(m)}</div><div class="slot-info"><b>${esc(m.name)}</b><small>${esc(ability.name)} · 기술 ${build.moveIds.length}개</small><small class="slot-build">EV ${Object.values(build.evs).reduce((a,b)=>a+Number(b),0)}/510 · HP ${stats.hp} · 스피드 ${stats.speed}</small></div><div class="slot-controls"><button data-action="edit-build" data-index="${i}" aria-label="세팅 수정"><svg viewBox="0 0 24 24"><path d="m4 16-1 5 5-1L19 9l-4-4L4 16"/></svg></button><button data-action="move-team-up" data-index="${i}" ${i===0?"disabled":""}><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button><button data-action="move-team-down" data-index="${i}" ${i===state.team.length-1?"disabled":""}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button><button data-action="remove-team" data-index="${i}"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button></div></div>`}).join("");const pool=state.monsters.map(m=>{const index=state.team.findIndex(b=>b.speciesId===m.id),selected=index>=0;return`<div class="pool-card ${selected?"selected":""}" style="${typeStyle(m.type1)}"><div class="pool-image">${imageMarkup(m)}</div><div class="pool-info"><b>${esc(m.name)}</b><small>${esc(m.type1)} · IV ${Object.values(m.ivs).filter(v=>v===31).length}V</small><div class="build-tags"><span class="build-tag">특성 ${m.allowedAbilityIds.length}</span><span class="build-tag">기술 ${m.allowedMoveIds.length}</span></div></div><button class="configure-button" data-action="open-build" data-id="${m.id}" data-index="${index}">${selected?"세팅 수정":"세팅 후 추가"}</button></div>`}).join("");els.content.innerHTML=`<div class="view team-view"><div class="view-inner"><div class="page-heading"><div><span class="eyebrow">TEAM CONFIGURATION · EV TRAINING</span><h1>배틀 팀 편성</h1><p>도감에서 몬스터를 불러와 허용된 기술·특성을 선택하고 노력치를 배분하세요.</p></div><div class="heading-actions"><button class="primary-button" data-action="go-battle" ${!state.team.length?"disabled":""}>배틀로 이동<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button></div></div><div class="team-board"><section class="team-panel"><div class="panel-title"><h2>배틀 팀</h2><span>${state.team.length} / 6</span></div><div class="team-slots">${slots}</div><div class="team-tip"><span class="info-dot">i</span><span>도감에서 허용한 기술과 특성만 선택할 수 있습니다. 각 몬스터의 연필 버튼으로 노력치와 기술을 다시 조정할 수 있습니다.</span></div></section><section class="pool-panel"><div class="panel-title"><h2>몬스터 도감</h2><span>${state.monsters.length}종</span></div>${state.monsters.length?`<div class="pool-list">${pool}</div>`:`<div class="empty-state"><div><div class="empty-state-visual"></div><h2>도감 등록이 필요합니다</h2><p>몬스터 도감에서 먼저 종족을 등록하세요.</p><button class="primary-button" data-action="add-monster">도감 등록</button></div></div>`}</section></div></div></div>`;}

  function buildStatInputs(){const base=$("#baseStatInputs"),ivs=$("#ivInputs");base.innerHTML=STATS.map(([k,l])=>`<label><span>${l}</span><input name="base_${k}" type="number" min="1" max="255" value="100" required></label>`).join("");ivs.innerHTML=STATS.map(([k,l])=>`<label><span>${l}</span><input name="iv_${k}" type="number" min="0" max="31" value="31" required></label>`).join("");const opts=Object.keys(TYPES).map(t=>`<option value="${t}">${t}</option>`).join("");$$('.type-select').forEach(s=>s.innerHTML=(s.classList.contains("optional-type")?'<option value="">없음</option>':"")+opts);}
  function renderAbilityLibrary(query=""){
    const q=query.toLowerCase(), matches=ABILITIES.filter(a=>`${a.name} ${a.englishName||""} ${a.description}`.toLowerCase().includes(q)), shown=matches.slice(0,300);
    els.abilityLibrary.innerHTML=shown.map(a=>`<label class="library-choice"><input type="checkbox" data-library-ability value="${a.id}" ${draftAbilities.has(a.id)?"checked":""}><span class="choice-card"><i class="choice-check">✓</i><span class="choice-info"><b>${esc(a.name)}${a.englishName&&a.englishName!==a.name?` <i class="english-name">${esc(a.englishName)}</i>`:""}</b><small>${esc(a.description)}</small></span><i class="coverage-badge ${a.engineCoverage||"verified"}">${a.engineCoverage==="verified"?"정밀":a.engineCoverage==="auto"?"자동":"고유"}</i></span></label>`).join("")+(matches.length>shown.length?`<p class="library-more">${matches.length-shown.length}개가 더 있습니다. 이름을 검색하면 모두 찾을 수 있습니다.</p>`:"");
    $("#abilitySelectionCount").textContent=`${draftAbilities.size} 선택 · 전체 ${ABILITIES.length}`;
  }
  function renderMoveLibrary(query=""){
    const q=query.toLowerCase(),matches=MOVES.filter(m=>(moveCategory==="all"||m.category===moveCategory)&&`${m.name} ${m.englishName||""} ${m.type}`.toLowerCase().includes(q)),shown=matches.slice(0,350);
    els.moveLibrary.innerHTML=shown.map(m=>`<label class="library-choice move-choice"><input type="checkbox" data-library-move value="${m.id}" ${draftMoves.has(m.id)?"checked":""}><span class="choice-card"><i class="choice-check">✓</i><span class="choice-info"><b>${esc(m.name)}${m.englishName&&m.englishName!==m.name?` <i class="english-name">${esc(m.englishName)}</i>`:""}</b><small>${esc(m.description)}</small></span><span class="move-meta"><i class="coverage-badge ${m.engineCoverage||"verified"}">${m.engineCoverage==="partial"?"고유":m.engineCoverage==="verified"?"정밀":"자동"}</i><i class="move-category ${m.category}">${CAT[m.category]}</i><i class="move-type-mini" style="--mini-color:${TYPES[m.type]?.[0]||TYPES["노말"][0]}">${m.type} ${m.power||"—"}</i></span></span></label>`).join("")+(matches.length>shown.length?`<p class="library-more">${matches.length-shown.length}개가 더 있습니다. 이름을 검색하면 모두 찾을 수 있습니다.</p>`:"");
    $("#moveSelectionCount").textContent=`${draftMoves.size} 선택 · 전체 ${MOVES.length}`;
  }
  function openMonsterModal(m=null){els.monsterForm.reset();els.monsterForm.elements.monsterId.value=m?.id||"";$("#modalTitle").textContent=m?"몬스터 도감 수정":"새 몬스터 도감 등록";resetImage();draftAbilities=new Set(m?.allowedAbilityIds||[]);draftMoves=new Set(m?.allowedMoveIds||[]);if(m){["name","level","type1","type2"].forEach(k=>els.monsterForm.elements[k].value=m[k]||"");STATS.forEach(([k])=>{els.monsterForm.elements[`base_${k}`].value=m.baseStats[k];els.monsterForm.elements[`iv_${k}`].value=m.ivs[k];});els.imageData.value=m.image||"";if(m.image)showImage(m.image);}$("#abilityLibrarySearch").value="";$("#moveLibrarySearch").value="";renderAbilityLibrary();renderMoveLibrary();updateFullDexStatus();els.monsterModal.hidden=false;document.body.style.overflow="hidden";setTimeout(()=>els.monsterForm.elements.name.focus(),80);}
  function closeMonster(){els.monsterModal.hidden=true;document.body.style.overflow="";}
  function resetImage(){els.imageData.value="";els.imagePreview.innerHTML=`<svg viewBox="0 0 64 64"><path d="M14 50h36V14H14v36Zm5-7 8-9 7 7 5-6 6 8H19Zm9-18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg><b>이미지를 선택하세요</b><small>PNG, JPG · 권장 800×800</small>`;}
  function showImage(src){els.imagePreview.innerHTML=`<img src="${src}" alt="선택 이미지">`;}
  async function compressImage(file){const src=await new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result);f.onerror=j;f.readAsDataURL(file)});const img=await new Promise((r,j)=>{const i=new Image();i.onload=()=>r(i);i.onerror=j;i.src=src});const s=Math.min(1,700/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);return c.toDataURL("image/webp",.82);}
  function submitMonster(e){e.preventDefault();if(!draftAbilities.size)return toast("사용 가능한 특성을 최소 1개 선택하세요.","error");if(!draftMoves.size)return toast("사용 가능한 기술을 최소 1개 선택하세요.","error");const f=new FormData(els.monsterForm),id=String(f.get("monsterId")||"");const m={id:id||uid(),name:String(f.get("name")).trim(),image:String(f.get("imageData")||""),level:clamp(f.get("level"),1,100),type1:f.get("type1"),type2:f.get("type2")||"",baseStats:{},ivs:{},allowedAbilityIds:[...draftAbilities],allowedMoveIds:[...draftMoves]};STATS.forEach(([k])=>{m.baseStats[k]=clamp(f.get(`base_${k}`),1,255);m.ivs[k]=clamp(f.get(`iv_${k}`),0,31);});const i=state.monsters.findIndex(x=>x.id===id);if(i>=0){state.monsters[i]=m;state.team=state.team.map(b=>b.speciesId===id?normalizeState({monsters:[m],team:[b]}).team[0]:b).filter(Boolean);}else state.monsters.push(m);saveState("dex");closeMonster();renderRoster();toast(`${m.name} 도감 데이터가 저장되었습니다.`);}

  function openBuild(species,index=-1){if(index<0&&state.team.length>=6)return toast("팀은 최대 6마리까지 편성할 수 있습니다.","error");const existing=index>=0?state.team[index]:defaultBuild(species);els.buildForm.elements.speciesId.value=species.id;els.buildForm.elements.buildIndex.value=index;$("#buildModalTitle").textContent=`${species.name} 배틀 세팅`;$("#buildSummary").style.cssText=typeStyle(species.type1);$("#buildSummary").innerHTML=`<div class="build-summary-image">${imageMarkup(species)}</div><div class="build-summary-info"><h3>${esc(species.name)} <small>Lv.${species.level}</small></h3><div class="type-tags">${typeTag(species.type1)}${typeTag(species.type2)}</div><p>IV ${STATS.map(([k])=>species.ivs[k]).join(" / ")} · 허용 기술 ${species.allowedMoveIds.length}개 / 잠김 ${MOVES.length-species.allowedMoveIds.length}개 · 허용 특성 ${species.allowedAbilityIds.length}개</p></div>`;$("#buildAbilityList").innerHTML=species.allowedAbilityIds.map((id,i)=>{const a=getAbility(id);return`<label class="radio-choice"><input type="radio" name="buildAbility" value="${id}" ${existing.abilityId===id||(!existing.abilityId&&i===0)?"checked":""}><span><b>${esc(a.name)}</b><small>${esc(a.description)}</small></span></label>`}).join("");draftBuildMoves=new Set(existing.moveIds||[]);renderBuildMoves(species);$("#evInputs").innerHTML=STATS.map(([k,l])=>`<label class="ev-field"><span>${l}</span><input name="ev_${k}" data-ev-key="${k}" type="number" min="0" max="252" step="4" value="${clamp(existing.evs?.[k],0,252)}"><i class="ev-bar"><i data-ev-bar="${k}"></i></i></label>`).join("");updateEvPreview(species);els.buildModal.hidden=false;document.body.style.overflow="hidden";}
  function renderBuildMoves(species){$("#buildMoveList").innerHTML=species.allowedMoveIds.map(id=>{const m=MOVE_BY_ID[id];if(!m)return"";const checked=draftBuildMoves.has(id),disabled=!checked&&draftBuildMoves.size>=4;return`<label class="build-move-choice"><input type="checkbox" data-build-move value="${id}" ${checked?"checked":""} ${disabled?"disabled":""}><span style="border-left:4px solid ${TYPES[m.type]?.[0]||TYPES["노말"][0]}"><b>${esc(m.name)} · ${m.type} · ${CAT[m.category]} · 위력 ${m.power||"—"} · PP ${defaultMovePp(m)}</b><small>${esc(m.description)}</small></span></label>`}).join("");$("#buildMoveCount").textContent=`${draftBuildMoves.size} / 4`;}
  function readEvs(){return Object.fromEntries(STATS.map(([k])=>[k,clamp(els.buildForm.elements[`ev_${k}`]?.value,0,252)]));}
  function updateEvPreview(species){const evs=readEvs(),total=Object.values(evs).reduce((a,b)=>a+b,0),stats=computeStats(species,evs);$("#evTotal").textContent=total;$("#evTotal").parentElement.classList.toggle("over",total>510);STATS.forEach(([k])=>{const bar=$(`[data-ev-bar="${k}"]`);if(bar)bar.style.width=`${evs[k]/252*100}%`;});$("#computedStats").innerHTML=STATS.map(([k,l])=>`<div class="computed-stat"><b>${stats[k]}</b><small>실제 ${l}</small></div>`).join("");}
  function closeBuild(){els.buildModal.hidden=true;document.body.style.overflow="";}
  function submitBuild(e){e.preventDefault();const species=getSpecies(els.buildForm.elements.speciesId.value),index=Number(els.buildForm.elements.buildIndex.value),evs=readEvs(),total=Object.values(evs).reduce((a,b)=>a+b,0),abilityId=new FormData(els.buildForm).get("buildAbility");if(total>510)return toast("노력치 합계는 510을 넘을 수 없습니다.","error");if(!draftBuildMoves.size)return toast("기술을 최소 1개 선택하세요.","error");const build={speciesId:species.id,abilityId,moveIds:[...draftBuildMoves],evs};if(index>=0)state.team[index]=build;else state.team.push(build);saveState("build");closeBuild();renderTeam();toast(`${species.name}의 배틀 세팅을 적용했습니다.`);}

  function renderBattleSetup(){const count=state.team.length,need=selectedFormat==="double"?2:1,ready=count>=need;els.content.innerHTML=`<div class="view battle-setup"><div class="view-inner"><div class="page-heading"><div><span class="eyebrow">BATTLE GATE</span><h1>배틀 형식 선택</h1><p>개체값과 노력치, 선택한 실제 기술·특성이 모두 전투 계산에 반영됩니다.</p></div></div><div class="format-selector"><button class="format-card ${selectedFormat==="single"?"selected":""}" data-action="select-format" data-format="single"><span class="format-number">1</span><span class="format-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg></span><h2>싱글 배틀</h2><p>한 번에 한 마리가 필드에 나섭니다. 팀의 선두 3마리까지 참가합니다.</p><small>TEAM SIZE · UP TO 3</small></button><button class="format-card ${selectedFormat==="double"?"selected":""}" data-action="select-format" data-format="double"><span class="format-number">2</span><span class="format-icon"><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="3"/><path d="M2 20a6 6 0 0 1 12 0m0 0a5 5 0 0 1 10 0"/></svg></span><h2>더블 배틀</h2><p>두 마리가 함께 싸우며 우선도와 특성 발동 순서가 중요합니다.</p><small>TEAM SIZE · UP TO 4</small></button></div><div class="setup-footer"><div class="team-ready"><span class="team-ready-indicator">${ready?"✓":"!"}</span><span><b>${ready?"팀 준비 완료":`몬스터 ${need}마리 필요`}</b><small>현재 팀 ${count}마리 · ${selectedFormat==="double"?"더블":"싱글"} 배틀</small></span></div><button class="primary-button" data-action="start-battle" ${ready?"":"disabled"}><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5Z"/></svg>매치 시작</button></div></div></div>`;}

  function defaultMovePp(move){if(Number(move.pp)>0)return Number(move.pp);if(move.category==="status")return 20;if(Number(move.power)>=120)return 5;if(Number(move.power)>=100)return 10;if(Number(move.power)>=80)return 15;return 25;}
  function createCombatant(build,enemy=false){const species=getSpecies(build.speciesId),stats=computeStats(species,build.evs);return{...structuredClone(species),name:enemy?`섀도 ${species.name}`:species.name,stats,maxHp:stats.hp,currentHp:stats.hp,abilityId:build.abilityId,moves:build.moveIds.map(id=>MOVE_BY_ID[id]).filter(Boolean).map(raw=>{const move=structuredClone(raw),maxPp=defaultMovePp(move);return{...move,pp:maxPp,maxPp};}),stages:{attack:0,defense:0,spAttack:0,spDefense:0,speed:0},status:null,toxicCounter:0,sleepTurns:0,protected:false,flashFireBoost:false,fainted:false,entered:false,flinched:false,hasActed:false,enemy};}
  function startBattle(){const size=selectedFormat==="double"?4:3,builds=state.team.slice(0,size);if(builds.length<(selectedFormat==="double"?2:1))return toast("팀 인원이 부족합니다.","error");battle={format:selectedFormat,playerTeam:builds.map(b=>createCombatant(b)),enemyTeam:[...builds].reverse().map(b=>createCombatant(b,true)),playerActive:[],enemyActive:[],turn:1,queued:[],actorCursor:0,phase:"select",messages:[]};battlePanel="moves";refreshActive();applyEntryAbilities();battle.messages.push(`상대는 ${battle.enemyTeam[battle.enemyActive[0]].name}을 내보냈다!`);renderBattle();beep(310,.08);}
  function refreshActive(){const count=battle.format==="double"?2:1;for(const side of ["player","enemy"]){const team=side==="player"?battle.playerTeam:battle.enemyTeam,key=side==="player"?"playerActive":"enemyActive",alive=team.map((m,i)=>!m.fainted&&m.currentHp>0?i:-1).filter(i=>i>=0),kept=(battle[key]||[]).filter(i=>alive.includes(i)).slice(0,count);for(const index of alive)if(kept.length<count&&!kept.includes(index))kept.push(index);battle[key]=kept;}battle.actorCursor=Math.min(battle.actorCursor,Math.max(0,battle.playerActive.length-1));}
  function stageMultiplier(stage){return stage>=0?(2+stage)/2:2/(2-stage);}
  function effectiveStat(monster,key){let value=monster.stats[key]*stageMultiplier(monster.stages[key]||0),ability=abilityKey(monster);if(key==="speed"&&monster.status==="paralysis")value*=.5;if(key==="speed"&&monster.status&&ability==="quickfeet")value*=1.5;if(key==="attack"){if(["hugepower","purepower"].includes(ability))value*=2;if(["gorillatactics"].includes(ability))value*=1.5;if(monster.status&&ability==="guts")value*=1.5;if((monster.status==="poison"||monster.status==="toxic")&&ability==="toxicboost")value*=1.5;if(monster.status==="burn"&&ability!=="guts")value*=.5;}if(key==="spAttack"&&monster.status==="burn"&&ability==="flareboost")value*=1.5;if(key==="defense"&&monster.status&&ability==="marvelscale")value*=1.5;if(key==="defense"&&ability==="furcoat")value*=2;if(key==="spDefense"&&ability==="icescales")value*=2;return value;}
  function applyStages(target,changes,opponentCaused=false){if(!changes)return false;if(opponentCaused&&["clearbody","whitesmoke","fullmetalbody"].includes(abilityKey(target))&&Object.values(changes).some(v=>v<0)){battle.messages.push(`${target.name}의 ${abilityName(target)}! 능력치가 떨어지지 않는다.`);return false;}for(const [key,delta] of Object.entries(changes))target.stages[key]=clamp((target.stages[key]||0)+delta,-6,6);return true;}
  function applyEntryAbilities(){for(const side of ["player","enemy"]){const team=side==="player"?battle.playerTeam:battle.enemyTeam,active=side==="player"?battle.playerActive:battle.enemyActive,foes=side==="player"?battle.enemyTeam:battle.playerTeam,foeActive=side==="player"?battle.enemyActive:battle.playerActive;for(const i of active){const actor=team[i];if(actor.entered)continue;actor.entered=true;const ability=abilityKey(actor);if(ability==="intimidate"){battle.messages.push(`${actor.name}의 위협!`);for(const fi of foeActive){const foe=foes[fi];if(abilityKey(foe)==="innerfocus")battle.messages.push(`${foe.name}은 정신력으로 위축되지 않는다.`);else applyStages(foe,{attack:-1},true);}}if(ability==="download"&&foeActive.length){const foe=foes[foeActive[0]];applyStages(actor,foe.stats.defense<foe.stats.spDefense?{attack:1}:{spAttack:1});battle.messages.push(`${actor.name}의 다운로드! 능력치가 올랐다.`);}if(ability==="trace"&&foeActive.length){const foe=foes[foeActive[0]];actor.abilityId=foe.abilityId;battle.messages.push(`${actor.name}은 ${abilityName(foe)} 특성을 트레이스했다!`);}}}}
  function effectValue(move,target){const chart=TYPE_CHART[move.type]||{};return(chart[target.type1]??1)*(target.type2?(chart[target.type2]??1):1);}
  function abilityKey(monster){return dexId(monster?.abilityId||"");}
  function movePriority(actor,move){const ability=abilityKey(actor);return(move.priority||0)+(ability==="prankster"&&move.category==="status"?1:0)+(ability==="galewings"&&move.type==="비행"&&actor.currentHp===actor.maxHp?1:0)+(ability==="triage"&&(move.heal||move.drain)?3:0);}
  function abilityName(monster){return getAbility(monster.abilityId).name;}
  function combatantMarkup(m,index,side,pos){const pct=Math.max(0,m.currentHp/m.maxHp*100),extra=pos===1?`double-${side}-2`:"";return`<div class="combatant ${side} ${extra}" style="${typeStyle(m.type1)}" data-combatant="${side}-${index}"><div class="status-card"><div class="status-name"><b>${esc(m.name)}${m.status?`<i class="status-badge">${STATUS_LABEL[m.status]}</i>`:""}</b><span>LV.${m.level}</span></div><div class="hp-line"><div class="hp-fill ${pct<30?"low":""}" data-hp-fill="${side}-${index}" style="width:${pct}%"></div></div><div class="hp-text" data-hp-text="${side}-${index}">${m.currentHp} / ${m.maxHp}</div><i class="battle-ability">${esc(abilityName(m))}</i></div><div class="fighter" data-fighter="${side}-${index}">${imageMarkup(m)}</div></div>`;}
  function cpuMovePanel(actor){const hasPp=actor?.moves.some(move=>move.pp>0);if(!hasPp)return`<div class="move-buttons"><button class="move-button" data-action="battle-move" data-move="-1" style="--move-color:${TYPES["노말"][0]}"><span class="move-type-label">노말</span><b>발버둥</b><small>PP가 모두 소진되어 이 기술만 사용할 수 있습니다.</small><span class="pp-count">PP —</span></button></div>`;return`<div class="move-buttons">${actor.moves.map((m,i)=>`<button class="move-button" data-action="battle-move" data-move="${i}" style="--move-color:${TYPES[m.type]?.[0]||TYPES["노말"][0]};--move-tint:${TYPES[m.type]?.[0]||TYPES["노말"][0]}33" ${battleBusy||m.pp<=0?"disabled":""}><span class="move-type-label">${esc(m.type)}</span><b>${esc(m.name)}</b><small>${CAT[m.category]} · 위력 ${m.power||"—"} · 명중 ${m.alwaysHit?"—":m.accuracy}</small><span class="pp-count">PP <b>${m.pp}</b> / ${m.maxPp}</span><small class="move-effect-line">${esc(m.description)}</small></button>`).join("")}</div>`;}
  function cpuSwitchPanel(){const current=battle.playerActive[battle.actorCursor];return`<div class="battle-switch-list">${battle.playerTeam.map((m,i)=>{const pct=Math.max(0,m.currentHp/m.maxHp*100),active=battle.playerActive.includes(i),disabled=battleBusy||active||m.fainted;return`<button data-action="battle-switch" data-index="${i}" ${disabled?"disabled":""}><span class="switch-thumb">${imageMarkup(m)}</span><span><b>${esc(m.name)}</b><small>${m.status?STATUS_LABEL[m.status]:"정상"} · HP ${Math.ceil(pct)}%</small></span><i>${i===current?"선택 중":active?"배틀 중":m.fainted?"기절":"교체"}</i></button>`;}).join("")}</div>`;}
  function cpuStatusPanel(){const groups=[["내 포켓몬",battle.playerTeam,battle.playerActive],["상대 포켓몬",battle.enemyTeam,battle.enemyActive]];return`<div class="battle-status-panel">${groups.map(([label,team,active])=>`<section><div class="status-panel-title"><b>${label}</b><span>능력치 랭크</span></div>${active.map(i=>{const m=team[i];return`<article><div><b>${esc(m.name)}</b><small>${m.status?STATUS_LABEL[m.status]:"정상"} · 특성 ${esc(abilityName(m))}</small></div><div class="stage-grid">${STATS.filter(([k])=>k!=="hp").map(([k,l])=>{const stage=m.stages[k]||0;return`<span class="stage-cell ${stage>0?"up":stage<0?"down":""}"><small>${l}</small><b>${stage>0?`+${stage}`:stage}</b><i>현재 ${Math.floor(effectiveStat(m,k))}</i></span>`;}).join("")}</div></article>`;}).join("")}</section>`).join("")}</div>`;}
  function renderBattle(){if(!battle)return renderBattleSetup();const players=battle.playerActive.map((i,p)=>combatantMarkup(battle.playerTeam[i],i,"player",p)).join(""),enemies=battle.enemyActive.map((i,p)=>combatantMarkup(battle.enemyTeam[i],i,"enemy",p)).join(""),actorIndex=battle.playerActive[battle.actorCursor]??battle.playerActive[0],actor=battle.playerTeam[actorIndex],message=battle.messages.pop()||`${actor?.name||"몬스터"}은 무엇을 할까?`,panel=battlePanel==="switch"?cpuSwitchPanel():battlePanel==="status"?cpuStatusPanel():cpuMovePanel(actor);els.content.innerHTML=`<div class="view battle-view"><div class="stadium"><div class="stadium-lights"></div></div><div class="battle-hud"><div class="battle-topline"><span class="battle-mode-label">COMPETITIVE · ${battle.format==="double"?"DOUBLE":"SINGLE"} BATTLE</span><div class="turn-timer">${battle.turn}</div></div><div class="battle-team player">${battle.playerTeam.map(m=>`<i class="team-pip ${m.fainted?"fainted":""}"></i>`).join("")}</div><div class="battle-team enemy">${battle.enemyTeam.map(m=>`<i class="team-pip ${m.fainted?"fainted":""}"></i>`).join("")}</div><div class="battle-log" id="battleLog">${esc(message)}</div>${enemies}${players}<div class="battle-controls"><div class="battle-command-tabs"><button data-action="battle-panel" data-panel="moves" class="${battlePanel==="moves"?"active":""}">기술</button><button data-action="battle-panel" data-panel="switch" class="${battlePanel==="switch"?"active":""}">포켓몬</button><button data-action="battle-panel" data-panel="status" class="${battlePanel==="status"?"active":""}">상태</button></div><div class="battle-prompt"><b>${esc(actor?.name||"몬스터")}은 무엇을 할까? ${battle.format==="double"?`(${battle.actorCursor+1}/${battle.playerActive.length})`:""}</b><span>TURN ${String(battle.turn).padStart(2,"0")}</span></div>${panel}</div></div></div>`;}
  function setLog(text){const l=$("#battleLog");if(l)l.textContent=text;}
  function animate(side,index,cls){const n=$(`[data-fighter="${side}-${index}"]`);if(!n)return;n.classList.remove("hit","attack");void n.offsetWidth;n.classList.add(cls);}
  function updateHp(side,index,m){const pct=Math.max(0,m.currentHp/m.maxHp*100),f=$(`[data-hp-fill="${side}-${index}"]`),t=$(`[data-hp-text="${side}-${index}"]`);if(f){f.style.width=`${pct}%`;f.classList.toggle("low",pct<30);}if(t)t.textContent=`${m.currentHp} / ${m.maxHp}`;}
  function finishPlayerChoice(){battlePanel="moves";if(battle.actorCursor<battle.playerActive.length-1){battle.actorCursor++;renderBattle();}else processTurn();}
  function chooseMove(position){if(!battle||battleBusy||battle.phase!=="select")return;const actorIndex=battle.playerActive[battle.actorCursor],actor=battle.playerTeam[actorIndex],hasPp=actor.moves.some(move=>move.pp>0),move=hasPp?actor.moves[position]:{id:"struggle",name:"발버둥",type:"노말",category:"physical",power:50,accuracy:100,recoil:.25,pp:1,maxPp:1,description:"PP가 모두 소진되었을 때 사용하는 기술."};if(!move||hasPp&&move.pp<=0)return toast("그 기술은 PP가 남아 있지 않습니다.","error");battle.queued.push({side:"player",kind:"move",actorIndex,move});finishPlayerChoice();}
  function chooseSwitch(index){if(!battle||battleBusy||battle.phase!=="select")return;const actorIndex=battle.playerActive[battle.actorCursor],target=battle.playerTeam[index];if(!target||target.fainted||battle.playerActive.includes(index))return toast("그 포켓몬으로는 교체할 수 없습니다.","error");battle.queued.push({side:"player",kind:"switch",actorIndex,switchIndex:index,move:{priority:10}});finishPlayerChoice();}
  function statusAllowed(target,status,move){if(target.status)return false;const ability=abilityKey(target);if(ability==="purifyingsalt")return false;if(status==="burn"&&([target.type1,target.type2].includes("불꽃")||["waterveil","waterbubble"].includes(ability)))return false;if(status==="paralysis"&&([target.type1,target.type2].includes("전기")||ability==="limber"))return false;if((status==="poison"||status==="toxic")&&([target.type1,target.type2].some(t=>t==="독"||t==="강철")||ability==="immunity"))return false;if(status==="freeze"&&([target.type1,target.type2].includes("얼음")||ability==="magmaarmor"))return false;if(status==="sleep"&&(["insomnia","vitalspirit","sweetveil"].includes(ability)||(move?.id==="sleepPowder"&&[target.type1,target.type2].includes("풀"))))return false;return true;}
  function inflictStatus(target,status,move){if(!statusAllowed(target,status,move))return false;target.status=status;if(status==="toxic")target.toxicCounter=0;if(status==="sleep")target.sleepTurns=1+Math.floor(Math.random()*3);return true;}
  function abilityImmunity(actor,target,move){const source=abilityKey(actor),ability=abilityKey(target);if(["moldbreaker","turboblaze","teravolt"].includes(source))return false;if(ability==="goodasgold"&&move.category==="status"){setLog(`${target.name}의 황금몸! 변화기술을 막았다.`);return true;}if(["dazzling","queenlymajesty","armortail"].includes(ability)&&movePriority(actor,move)>0){setLog(`${target.name}의 특성이 선제공격을 막았다!`);return true;}if((ability==="levitate"&&move.type==="땅")||(ability==="soundproof"&&move.sound)||(ability==="bulletproof"&&move.bullet)||(ability==="windrider"&&move.wind)||(ability==="wonderguard"&&move.category!=="status"&&effectValue(move,target)<=1)){setLog(`${target.name}의 ${abilityName(target)}! 기술이 통하지 않는다.`);return true;}const healType=(amount=.25)=>{const heal=Math.floor(target.maxHp*amount);target.currentHp=Math.min(target.maxHp,target.currentHp+heal);setLog(`${target.name}의 ${abilityName(target)}! HP를 회복했다.`);return true;};if(move.type==="물"&&["waterabsorb","dryskin","stormdrain"].includes(ability)){if(ability==="stormdrain")applyStages(target,{spAttack:1});return healType();}if(move.type==="전기"&&["voltabsorb","motordrive","lightningrod"].includes(ability)){if(ability==="motordrive")applyStages(target,{speed:1});else if(ability==="lightningrod")applyStages(target,{spAttack:1});else return healType();setLog(`${target.name}의 ${abilityName(target)}! 능력치가 올랐다.`);return true;}if(move.type==="풀"&&ability==="sapsipper"){applyStages(target,{attack:1});setLog(`${target.name}의 초식! 공격이 올랐다.`);return true;}if(move.type==="땅"&&ability==="eartheater")return healType();if(move.type==="불꽃"&&["flashfire","wellbakedbody"].includes(ability)){if(ability==="flashfire")target.flashFireBoost=true;else applyStages(target,{defense:2});setLog(`${target.name}의 ${abilityName(target)}! 공격을 무효화했다.`);return true;}return false;}
  function damageResult(actor,target,move){let attack=effectiveStat(actor,move.category==="physical"?"attack":"spAttack"),defense=effectiveStat(target,move.category==="physical"?"defense":"spDefense"),power=move.power||1;const source=abilityKey(actor),defender=abilityKey(target);if(source==="technician"&&power<=60)power*=1.5;if(source==="toughclaws"&&move.contact)power*=1.3;if(source==="ironfist"&&move.punch)power*=1.2;if(source==="strongjaw"&&move.bite)power*=1.5;if(source==="sharpness"&&move.slicing)power*=1.5;if(source==="megalauncher"&&move.pulse)power*=1.5;if(source==="punkrock"&&move.sound)power*=1.3;if(source==="reckless"&&move.recoil)power*=1.2;if(source==="sheerforce"&&move.secondary)power*=1.3;if(source==="transistor"&&move.type==="전기")power*=1.3;if(source==="dragonsmaw"&&move.type==="드래곤")power*=1.5;if(["steelworker","steelyspirit"].includes(source)&&move.type==="강철")power*=1.5;if(source==="rockypayload"&&move.type==="바위")power*=1.5;if(source==="waterbubble"&&move.type==="물")power*=2;const low=actor.currentHp<=actor.maxHp/3;if(low&&((source==="blaze"&&move.type==="불꽃")||(source==="torrent"&&move.type==="물")||(source==="overgrow"&&move.type==="풀")||(source==="swarm"&&move.type==="벌레")))power*=1.5;if(actor.flashFireBoost&&move.type==="불꽃")power*=1.5;const stab=(move.type===actor.type1||move.type===actor.type2)?(source==="adaptability"?2:1.5):1,type=effectValue(move,target),crit=Math.random()<(move.highCrit||source==="superluck"?1/8:1/24)?(source==="sniper"?2.25:1.5):1,random=.85+Math.random()*.15;let damage=Math.max(type===0?0:1,Math.floor(((((2*actor.level/5+2)*power*attack/Math.max(1,defense))/50)+2)*stab*type*crit*random));if(["multiscale","shadowshield"].includes(defender)&&target.currentHp===target.maxHp&&!['moldbreaker','turboblaze','teravolt'].includes(source))damage=Math.max(1,Math.floor(damage/2));if(["filter","solidrock","prismarmor"].includes(defender)&&type>1)damage=Math.max(1,Math.floor(damage*.75));if(defender==="thickfat"&&(move.type==="불꽃"||move.type==="얼음"))damage=Math.max(1,Math.floor(damage*.5));if(defender==="heatproof"&&move.type==="불꽃")damage=Math.max(1,Math.floor(damage*.5));if(defender==="waterbubble"&&move.type==="불꽃")damage=Math.max(1,Math.floor(damage*.5));if(defender==="punkrock"&&move.sound)damage=Math.max(1,Math.floor(damage*.5));if(defender==="fluffy"){if(move.contact)damage=Math.max(1,Math.floor(damage*.5));if(move.type==="불꽃")damage*=2;}if(defender==="sturdy"&&target.currentHp===target.maxHp&&damage>=target.currentHp&&!['moldbreaker','turboblaze','teravolt'].includes(source))damage=target.currentHp-1;return{damage,type,critical:crit>1};}
  async function preAction(actor){if(actor.flinched&&!actor.hasActed){setLog(`${actor.name}은 풀죽어서 움직일 수 없다!`);return false;}if(actor.status==="sleep"){actor.sleepTurns--;if(actor.sleepTurns>0){setLog(`${actor.name}은 쿨쿨 잠들어 있다.`);return false;}actor.status=null;setLog(`${actor.name}은 잠에서 깨어났다!`);await delay(400);}if(actor.status==="freeze"){if(Math.random()<.2){actor.status=null;setLog(`${actor.name}의 얼음이 녹았다!`);await delay(400);}else{setLog(`${actor.name}은 얼어붙어 움직일 수 없다!`);return false;}}if(actor.status==="paralysis"&&Math.random()<.25){setLog(`${actor.name}은 몸이 저려 움직일 수 없다!`);return false;}return true;}
  async function executeAction(action){const own=action.side==="player"?battle.playerTeam:battle.enemyTeam,foes=action.side==="player"?battle.enemyTeam:battle.playerTeam,active=action.side==="player"?battle.enemyActive:battle.playerActive,ownActive=action.side==="player"?battle.playerActive:battle.enemyActive,actor=own[action.actorIndex];if(action.kind==="switch"){const position=ownActive.indexOf(action.actorIndex),next=own[action.switchIndex];if(position<0||!next||next.fainted||ownActive.includes(action.switchIndex))return;setLog(`${actor.name}, 돌아와!`);await delay(260);ownActive[position]=action.switchIndex;next.entered=false;setLog(`${next.name}! 너로 정했다!`);applyEntryAbilities();await delay(480);return;}if(!actor||actor.fainted)return;if(!await preAction(actor)){actor.hasActed=true;await delay(650);return;}let targets=active.filter(i=>!foes[i].fainted);if(!targets.length)targets=foes.map((m,i)=>!m.fainted?i:-1).filter(i=>i>=0);if(!targets.length)return;const targetIndex=targets[Math.floor(Math.random()*targets.length)],target=foes[targetIndex],targetSide=action.side==="player"?"enemy":"player",move=action.move;if(move.id!=="struggle"){if(move.pp<=0)return;move.pp=Math.max(0,move.pp-1);}setLog(`${actor.name}의 ${move.name}!`);animate(action.side,action.actorIndex,"attack");beep(action.side==="player"?420:260,.07);await delay(430);
    if(move.effect==="protect"){actor.protected=true;setLog(`${actor.name}은 방어 태세를 취했다!`);actor.hasActed=true;await delay(550);return;}
    if(move.effect==="heal"){const amount=Math.floor(actor.maxHp*move.heal),before=actor.currentHp;actor.currentHp=Math.min(actor.maxHp,actor.currentHp+amount);updateHp(action.side,action.actorIndex,actor);setLog(`${actor.name}은 HP를 ${actor.currentHp-before} 회복했다!`);actor.hasActed=true;await delay(600);return;}
    if(move.category==="status"&&move.selfStages){applyStages(actor,move.selfStages);setLog(`${actor.name}의 능력치가 올랐다!`);actor.hasActed=true;await delay(600);return;}
    if(target.protected){setLog(`${target.name}은 공격을 방어했다!`);actor.hasActed=true;await delay(600);return;}
    const alwaysHit=move.alwaysHit||abilityKey(actor)==="noguard"||abilityKey(target)==="noguard";let accuracy=move.id==="toxic"&&(actor.type1==="독"||actor.type2==="독")?100:move.accuracy;if(abilityKey(actor)==="compoundeyes")accuracy*=1.3;if(abilityKey(actor)==="victorystar")accuracy*=1.1;if(abilityKey(actor)==="hustle"&&move.category==="physical")accuracy*=.8;if(!alwaysHit&&Math.random()*100>accuracy){setLog("공격이 빗나갔다!");actor.hasActed=true;await delay(600);return;}
    if(move.category==="status"&&move.inflict){if(effectValue(move,target)===0){setLog(`${target.name}에게는 효과가 없다!`);}else if(inflictStatus(target,move.inflict,move)){setLog(`${target.name}은 ${STATUS_LABEL[move.inflict]} 상태가 되었다!`);}else setLog(`${target.name}에게는 상태이상이 통하지 않는다!`);actor.hasActed=true;await delay(650);return;}
    if(move.category==="status"&&move.targetStages){applyStages(target,move.targetStages,true);setLog(`${target.name}의 능력치가 변했다!`);actor.hasActed=true;await delay(650);return;}
    if(abilityImmunity(actor,target,move)){updateHp(targetSide,targetIndex,target);actor.hasActed=true;await delay(700);return;}
    const result=damageResult(actor,target,move);let hits=1;if(Array.isArray(move.multihit)){const[min,max]=move.multihit;hits=min+Math.floor(Math.random()*(max-min+1));}else if(Number(move.multihit)>1)hits=Number(move.multihit);if(move.ohko)result.damage=target.currentHp;else if(move.fixedDamage==="level")result.damage=actor.level;else if(Number(move.fixedDamage))result.damage=Number(move.fixedDamage);else result.damage*=hits;target.currentHp=Math.max(0,target.currentHp-result.damage);updateHp(targetSide,targetIndex,target);animate(targetSide,targetIndex,"hit");beep(130,.1);if(hits>1)setLog(`${hits}번 맞았다!`);else if(result.type===0)setLog("효과가 없다…");else if(result.type>1)setLog(`효과가 굉장했다!${result.critical?" 급소에 맞았다!":""}`);else if(result.type<1)setLog("효과가 별로인 듯하다…");else if(result.critical)setLog("급소에 맞았다!");await delay(620);
    if(move.drain&&result.damage>0){const heal=Math.max(1,Math.floor(result.damage*move.drain));actor.currentHp=Math.min(actor.maxHp,actor.currentHp+heal);updateHp(action.side,action.actorIndex,actor);}
    if(move.recoil&&result.damage>0&&!["magicguard","rockhead"].includes(abilityKey(actor))){const recoil=Math.max(1,Math.floor(result.damage*move.recoil));actor.currentHp=Math.max(0,actor.currentHp-recoil);updateHp(action.side,action.actorIndex,actor);if(actor.currentHp===0)actor.fainted=true;}
    if(move.selfStages)applyStages(actor,move.selfStages);
    const secondaryChance=(move.secondary?.chance||0)*(abilityKey(actor)==="serenegrace"?2:1);if(move.secondary&&abilityKey(actor)!=="sheerforce"&&abilityKey(target)!=="shielddust"&&target.currentHp>0&&Math.random()*100<secondaryChance){if(move.secondary.status&&inflictStatus(target,move.secondary.status,move))setLog(`${target.name}은 ${STATUS_LABEL[move.secondary.status]||move.secondary.status} 상태가 되었다!`);if(move.secondary.stages)applyStages(target,move.secondary.stages,true);if(move.secondary.selfStages)applyStages(actor,move.secondary.selfStages);if(move.secondary.flinch&&abilityKey(target)!=="innerfocus"&&!target.hasActed)target.flinched=true;}
    if(target.currentHp>0&&abilityKey(target)==="stamina")applyStages(target,{defense:1});if(move.contact&&target.currentHp>0){const contactAbility=abilityKey(target);if(["roughskin","ironbarbs"].includes(contactAbility)&&abilityKey(actor)!=="magicguard"){actor.currentHp=Math.max(0,actor.currentHp-Math.max(1,Math.floor(actor.maxHp/8)));updateHp(action.side,action.actorIndex,actor);setLog(`${actor.name}은 ${abilityName(target)}로 피해를 입었다!`);}if(contactAbility==="static"&&Math.random()<.3&&inflictStatus(actor,"paralysis"))setLog(`${actor.name}은 정전기로 마비되었다!`);if(contactAbility==="flamebody"&&Math.random()<.3&&inflictStatus(actor,"burn"))setLog(`${actor.name}은 불꽃몸으로 화상을 입었다!`);if(contactAbility==="poisonpoint"&&Math.random()<.3&&inflictStatus(actor,"poison"))setLog(`${actor.name}은 독가시로 중독되었다!`);if(contactAbility==="effectspore"&&Math.random()<.3){const status=["poison","paralysis","sleep"][Math.floor(Math.random()*3)];inflictStatus(actor,status);}if(["gooey","tanglinghair"].includes(contactAbility))applyStages(actor,{speed:-1},true);}
    if(move.selfDestruct){actor.currentHp=0;actor.fainted=true;updateHp(action.side,action.actorIndex,actor);}if(target.currentHp<=0){target.fainted=true;setLog(`${target.name}은 쓰러졌다!`);await delay(650);}if(actor.currentHp<=0){actor.fainted=true;setLog(`${actor.name}도 쓰러졌다!`);await delay(650);}actor.hasActed=true;}
  async function endTurnEffects(){for(const [side,team,active] of [["player",battle.playerTeam,battle.playerActive],["enemy",battle.enemyTeam,battle.enemyActive]])for(const i of active){const m=team[i];if(m.fainted)continue;const ability=abilityKey(m);if(ability==="speedboost"){applyStages(m,{speed:1});setLog(`${m.name}의 가속! 스피드가 올랐다.`);await delay(350);}if(ability==="shedskin"&&m.status&&Math.random()<1/3){m.status=null;setLog(`${m.name}의 탈피! 상태이상이 회복됐다.`);await delay(350);}if(ability==="poisonheal"&&(m.status==="poison"||m.status==="toxic")){m.currentHp=Math.min(m.maxHp,m.currentHp+Math.max(1,Math.floor(m.maxHp/8)));updateHp(side,i,m);setLog(`${m.name}은 포이즌힐로 회복했다!`);await delay(350);}else if(ability!=="magicguard"&&(m.status==="burn"||m.status==="poison"||m.status==="toxic")){if(m.status==="toxic")m.toxicCounter=Math.min(15,m.toxicCounter+1);const fraction=m.status==="toxic"?m.toxicCounter/16:(m.status==="poison"?1/8:1/16),damage=Math.max(1,Math.floor(m.maxHp*fraction));m.currentHp=Math.max(0,m.currentHp-damage);updateHp(side,i,m);setLog(`${m.name}은 ${STATUS_LABEL[m.status]} 데미지를 입었다!`);await delay(450);if(m.currentHp===0)m.fainted=true;}m.protected=false;}}
  async function processTurn(){battleBusy=true;battle.phase="action";[...battle.playerTeam,...battle.enemyTeam].forEach(m=>{m.hasActed=false;m.flinched=false;});const enemyActions=battle.enemyActive.map(i=>{const actor=battle.enemyTeam[i],available=actor.moves.filter(move=>move.pp>0),move=available.length?available[Math.floor(Math.random()*available.length)]:{id:"struggle",name:"발버둥",type:"노말",category:"physical",power:50,accuracy:100,recoil:.25,pp:1,maxPp:1};return{side:"enemy",kind:"move",actorIndex:i,move};});const actions=[...battle.queued,...enemyActions].sort((a,b)=>{const aa=a.side==="player"?battle.playerTeam[a.actorIndex]:battle.enemyTeam[a.actorIndex],bb=b.side==="player"?battle.playerTeam[b.actorIndex]:battle.enemyTeam[b.actorIndex],p=movePriority(bb,b.move)-movePriority(aa,a.move);return p||effectiveStat(bb,"speed")-effectiveStat(aa,"speed")||Math.random()-.5;});$$('.move-button').forEach(b=>b.disabled=true);for(const action of actions)await executeAction(action);await endTurnEffects();const playerLost=battle.playerTeam.every(m=>m.fainted),enemyLost=battle.enemyTeam.every(m=>m.fainted);if(playerLost||enemyLost){battleBusy=false;showResult(!playerLost&&enemyLost);return;}refreshActive();applyEntryAbilities();battle.turn++;battle.queued=[];battle.actorCursor=0;battle.phase="select";battlePanel="moves";battleBusy=false;renderBattle();}
  function showResult(victory){const host=$(".battle-view");if(!host)return;host.insertAdjacentHTML("beforeend",`<div class="battle-result"><div class="result-card"><div class="result-emblem"><svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4m-5 2v5m-4 0h8"/></svg></div><span class="eyebrow">MATCH COMPLETE</span><h2>${victory?"VICTORY":"DEFEAT"}</h2><p>${victory?"개체 세팅과 전략이 완벽했습니다!":"도감과 노력치 세팅을 조정해 다시 도전하세요."}</p><button class="primary-button" data-action="battle-again">다시 배틀</button> <button class="secondary-button" data-action="exit-battle">나가기</button></div></div>`);beep(victory?620:180,.2);}
  function delay(ms){return new Promise(r=>setTimeout(r,ms));}
  function beep(freq,duration){if(!state.sound)return;try{const C=window.AudioContext||window.webkitAudioContext,c=new C,o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.03,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration);o.onended=()=>c.close();}catch{}}

  function deleteMonster(id){const m=getSpecies(id);if(!m||!confirm(`'${m.name}' 도감 데이터를 삭제할까요?`))return;state.monsters=state.monsters.filter(x=>x.id!==id);state.team=state.team.filter(b=>b.speciesId!==id);saveState("dex");renderRoster();toast("도감 데이터를 삭제했습니다.");}
  function moveTeam(index,direction){const next=index+direction;if(next<0||next>=state.team.length)return;[state.team[index],state.team[next]]=[state.team[next],state.team[index]];saveState("team");renderTeam();}
  function exportData(){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ishs-arena-save.json";a.click();URL.revokeObjectURL(url);toast("도감과 팀 데이터를 내보냈습니다.");}
  async function importData(file){try{const raw=JSON.parse(await file.text());state=normalizeState(raw);saveState("import");els.dataModal.hidden=true;document.body.style.overflow="";navigate("roster");toast("데이터를 가져왔습니다.");}catch{toast("올바른 저장 파일이 아닙니다.","error");}}
  function handleAction(action,target){
    if(action==="add-monster")requireAdmin(()=>openMonsterModal());
    if(action==="edit-monster")requireAdmin(()=>openMonsterModal(getSpecies(target.dataset.id)));
    if(action==="delete-monster")requireAdmin(()=>deleteMonster(target.dataset.id));
    if(action==="unlock-admin")requireAdmin(()=>renderRoster());
    if(action==="lock-admin")lockAdmin();
    if(action==="go-roster")navigate("roster");
    if(action==="go-team")navigate("team");
    if(action==="go-battle")navigate("battle");
    if(action==="filter-type"){rosterFilter=target.dataset.type;renderRoster();}
    if(action==="perfect-ivs")STATS.forEach(([k])=>els.monsterForm.elements[`iv_${k}`].value=31);
    if(action==="zero-ivs")STATS.forEach(([k])=>els.monsterForm.elements[`iv_${k}`].value=0);
    if(action==="open-build"){const m=getSpecies(target.dataset.id);openBuild(m,Number(target.dataset.index));}
    if(action==="edit-build"){const i=Number(target.dataset.index);openBuild(getSpecies(state.team[i].speciesId),i);}
    if(action==="remove-team"){state.team.splice(Number(target.dataset.index),1);saveState("team");renderTeam();}
    if(action==="move-team-up")moveTeam(Number(target.dataset.index),-1);
    if(action==="move-team-down")moveTeam(Number(target.dataset.index),1);
    if(action==="select-format"){selectedFormat=target.dataset.format;renderBattleSetup();}
    if(action==="start-battle")startBattle();
    if(action==="battle-move")chooseMove(Number(target.dataset.move));
    if(action==="battle-switch")chooseSwitch(Number(target.dataset.index));
    if(action==="battle-panel"){battlePanel=target.dataset.panel||"moves";renderBattle();}
    if(action==="battle-again")startBattle();
    if(action==="exit-battle"){battle=null;renderBattleSetup();}
  }

  document.addEventListener("click",e=>{const r=e.target.closest("[data-route]");if(r){navigate(r.dataset.route);return;}const a=e.target.closest("[data-action]");if(a)handleAction(a.dataset.action,a);const cat=e.target.closest("[data-category]");if(cat){moveCategory=cat.dataset.category;$$('[data-category]').forEach(b=>b.classList.toggle("active",b===cat));renderMoveLibrary($("#moveLibrarySearch").value);}});
  document.addEventListener("change",e=>{if(e.target.matches("[data-library-ability]")){e.target.checked?draftAbilities.add(e.target.value):draftAbilities.delete(e.target.value);$("#abilitySelectionCount").textContent=`${draftAbilities.size} 선택 · 전체 ${ABILITIES.length}`;}if(e.target.matches("[data-library-move]")){e.target.checked?draftMoves.add(e.target.value):draftMoves.delete(e.target.value);$("#moveSelectionCount").textContent=`${draftMoves.size} 선택 · 전체 ${MOVES.length}`;}if(e.target.matches("[data-build-move]")){e.target.checked?draftBuildMoves.add(e.target.value):draftBuildMoves.delete(e.target.value);renderBuildMoves(getSpecies(els.buildForm.elements.speciesId.value));}if(e.target.matches("[data-ev-key]"))updateEvPreview(getSpecies(els.buildForm.elements.speciesId.value));});
  $("#abilityLibrarySearch").addEventListener("input",e=>renderAbilityLibrary(e.target.value));$("#moveLibrarySearch").addEventListener("input",e=>renderMoveLibrary(e.target.value));
  els.monsterForm.addEventListener("submit",submitMonster);els.buildForm.addEventListener("submit",submitBuild);els.adminForm.addEventListener("submit",submitAdmin);
  $$('[data-close-modal]').forEach(b=>b.addEventListener("click",closeMonster));$$('[data-close-build]').forEach(b=>b.addEventListener("click",closeBuild));$$('[data-close-admin]').forEach(b=>b.addEventListener("click",()=>closeAdmin()));$$('[data-close-data]').forEach(b=>b.addEventListener("click",()=>{els.dataModal.hidden=true;document.body.style.overflow="";}));
  els.monsterModal.addEventListener("click",e=>{if(e.target===els.monsterModal)closeMonster();});els.buildModal.addEventListener("click",e=>{if(e.target===els.buildModal)closeBuild();});els.adminModal.addEventListener("click",e=>{if(e.target===els.adminModal)closeAdmin();});els.dataModal.addEventListener("click",e=>{if(e.target===els.dataModal){els.dataModal.hidden=true;document.body.style.overflow="";}});
  $("#imageSelectButton").addEventListener("click",()=>els.imageFile.click());els.imagePreview.addEventListener("click",()=>els.imageFile.click());els.imageFile.addEventListener("change",async()=>{const f=els.imageFile.files[0];if(!f)return;if(f.size>12*1024*1024)return toast("12MB보다 작은 이미지를 선택하세요.","error");try{const d=await compressImage(f);els.imageData.value=d;showImage(d);}catch{toast("이미지를 읽을 수 없습니다.","error");}});
  $("#soundToggle").addEventListener("click",e=>{state.sound=!state.sound;saveState("sound",{silent:true});e.currentTarget.style.opacity=state.sound?"1":".45";toast(state.sound?"효과음을 켰습니다.":"효과음을 껐습니다.");});
  $("#dataButton").addEventListener("click",()=>{els.dataModal.hidden=false;document.body.style.overflow="hidden";});$("#exportButton").addEventListener("click",exportData);$("#importButton").addEventListener("click",()=>requireAdmin(()=>$("#importFile").click()));$("#importFile").addEventListener("change",e=>e.target.files[0]&&importData(e.target.files[0]));$("#resetButton").addEventListener("click",()=>requireAdmin(()=>{if(!confirm("모든 도감과 팀 데이터를 삭제할까요?"))return;state=blankState();saveState("reset");els.dataModal.hidden=true;document.body.style.overflow="";navigate("home");toast("모든 데이터를 초기화했습니다.");}));
  document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!els.monsterModal.hidden)closeMonster();else if(!els.buildModal.hidden)closeBuild();else if(!els.adminModal.hidden)closeAdmin();else if(!els.dataModal.hidden){els.dataModal.hidden=true;document.body.style.overflow="";}});window.addEventListener("resize",()=>els.floatingAdd.style.display=route==="roster"&&innerWidth<=820?"flex":"none");els.floatingAdd.addEventListener("click",()=>requireAdmin(()=>openMonsterModal()));

  function getTeamSnapshot(){return state.team.map(build=>{const species=getSpecies(build.speciesId);if(!species)return null;const ability=getAbility(build.abilityId);return{id:species.id,speciesId:species.id,name:species.name,image:species.image,level:species.level,type1:species.type1,type2:species.type2,stats:computeStats(species,build.evs),ability:{id:ability.id,name:ability.name,description:ability.description},moves:build.moveIds.map(id=>MOVE_BY_ID[id]).filter(Boolean).map(raw=>{const move=structuredClone(raw);move.pp=defaultMovePp(move);return move;})};}).filter(Boolean);}
  function hydrateFromServer(payload){const sound=state.sound;state=normalizeState({version:2,monsters:Array.isArray(payload?.monsters)?payload.monsters:[],team:Array.isArray(payload?.team)?payload.team:[],sound});adminUnlocked=!!payload?.admin;if(adminUnlocked)sessionStorage.setItem(ADMIN_SESSION_KEY,"1");else sessionStorage.removeItem(ADMIN_SESSION_KEY);saveState("hydrate",{silent:true,hydrating:true});if(route!=="rooms")navigate(route);}
  window.ISHSArena={hydrate:hydrateFromServer,getTeamSnapshot,currentRoute:()=>route,navigate,toast,getState:()=>structuredClone(state)};
  buildStatInputs();saveState("init",{silent:true});$("#soundToggle").style.opacity=state.sound?"1":".45";navigate("home");loadFullDex();
})();
