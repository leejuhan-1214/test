(() => {
  "use strict";

  const TYPE_COLOR={"노말":"#9a9da8","불꽃":"#f06b48","물":"#4c91e8","전기":"#e7b72b","풀":"#55ad65","얼음":"#5fc7cd","격투":"#d34e63","독":"#a763c7","땅":"#c8894f","비행":"#748fda","에스퍼":"#e86691","벌레":"#91ad3e","바위":"#ad974f","고스트":"#6265a7","드래곤":"#5f65cf","악":"#5e5660","강철":"#5e94a4","페어리":"#da79b8"};
  const STATS=[["attack","공격"],["defense","방어"],["spAttack","특공"],["spDefense","특방"],["speed","스피드"]];
  const STATUS={burn:"화상",paralysis:"마비",poison:"독",toxic:"맹독",sleep:"잠듦",freeze:"얼음"};
  const CAT={physical:"물리",special:"특수",status:"변화"};
  const runtime={user:null,admin:false,room:null,poll:null,panel:"moves",authMode:"login",serverMode:location.protocol==="http:"||location.protocol==="https:",syncTimer:null,renderedEventId:0};
  const esc=(value="")=>String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  const arena=()=>window.ISHSArena;

  async function api(path,options={}) {
    const response=await fetch(path,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"서버 요청을 처리하지 못했습니다.");
    return data;
  }
  function notify(message,kind="") { if(arena()?.toast)arena().toast(message,kind);else alert(message); }
  function ensureAuthUi() {
    if(document.querySelector("#accountGate"))return;
    const node=document.createElement("div");node.id="accountGate";node.className="account-gate";node.hidden=true;
    node.innerHTML=`<section class="account-card" role="dialog" aria-modal="true" aria-labelledby="accountTitle">
      <div class="account-brand"><span class="brand-mark"><i></i></span><span><b>ISHS</b><small>ARENA ONLINE</small></span></div>
      <div id="serverNotice" class="server-notice" hidden></div>
      <div id="authForms">
        <span class="eyebrow">TRAINER ACCOUNT</span><h1 id="accountTitle">트레이너 로그인</h1><p>나만의 계정으로 팀을 저장하고 친구와 프라이빗 배틀을 시작하세요.</p>
        <div class="auth-tabs"><button type="button" data-mp="auth-mode" data-mode="login" class="active">로그인</button><button type="button" data-mp="auth-mode" data-mode="signup">계정 만들기</button></div>
        <form id="accountForm"><label><span>닉네임</span><input name="nickname" minlength="2" maxlength="16" autocomplete="username" placeholder="한글·영문·숫자 2~16자" required></label><label><span>비밀번호</span><input name="password" type="password" minlength="8" maxlength="100" autocomplete="current-password" placeholder="8자 이상" required></label><p class="auth-error" id="authError" hidden></p><button class="primary-button account-submit" type="submit">로그인</button></form>
      </div>
    </section>`;
    document.body.appendChild(node);
    node.querySelector("#accountForm").addEventListener("submit",submitAuth);
  }
  function showAuth(message="") {
    ensureAuthUi();const gate=document.querySelector("#accountGate"),notice=document.querySelector("#serverNotice"),forms=document.querySelector("#authForms");gate.hidden=false;forms.hidden=false;
    if(message){const error=document.querySelector("#authError");error.textContent=message;error.hidden=false;}
    notice.hidden=true;setTimeout(()=>gate.querySelector('input[name="nickname"]')?.focus(),80);
  }
  function showServerNotice() {
    ensureAuthUi();const gate=document.querySelector("#accountGate"),notice=document.querySelector("#serverNotice"),forms=document.querySelector("#authForms");gate.hidden=false;forms.hidden=true;notice.hidden=false;
    notice.innerHTML=`<span class="server-icon">◎</span><h1>온라인 서버로 실행해 주세요</h1><p>계정과 멀티플레이는 <b>index.html 더블 클릭</b>이 아니라 서버 주소에서 작동합니다.</p><ol><li><b>start-server.bat</b> 실행</li><li>브라우저에서 <b>http://localhost:4173</b> 열기</li></ol><button class="secondary-button" type="button" data-mp="offline">오프라인 CPU 모드 계속하기</button>`;
  }
  function hideAuth(){document.querySelector("#accountGate")?.setAttribute("hidden","");}
  function setAuthMode(mode){runtime.authMode=mode;document.querySelectorAll('[data-mp="auth-mode"]').forEach(button=>button.classList.toggle("active",button.dataset.mode===mode));const title=document.querySelector("#accountTitle"),submit=document.querySelector(".account-submit"),password=document.querySelector('#accountForm [name="password"]');if(title)title.textContent=mode==="signup"?"새 트레이너 계정":"트레이너 로그인";if(submit)submit.textContent=mode==="signup"?"계정 만들기":"로그인";if(password)password.autocomplete=mode==="signup"?"new-password":"current-password";}
  async function submitAuth(event){event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),error=form.querySelector("#authError"),body=Object.fromEntries(new FormData(form));button.disabled=true;error.hidden=true;try{await api(`/api/auth/${runtime.authMode}`,{method:"POST",body:JSON.stringify(body)});await bootstrap();}catch(reason){error.textContent=reason.message;error.hidden=false;}finally{button.disabled=false;}}
  function updateProfile(){const chip=document.querySelector(".profile-chip");if(!chip)return;if(runtime.user){chip.classList.add("online");chip.dataset.mp="profile";chip.title="클릭하여 로그아웃";chip.querySelector(".avatar").textContent=runtime.user.nickname.slice(0,1).toUpperCase();chip.querySelector("small").textContent="ONLINE";chip.querySelector("b").textContent=runtime.user.nickname;}else{chip.classList.remove("online");chip.removeAttribute("data-mp");}}
  async function bootstrap(){
    if(!runtime.serverMode){showServerNotice();return;}
    try{const data=await api("/api/bootstrap");runtime.user=data.user;runtime.admin=!!data.admin;hideAuth();updateProfile();arena()?.hydrate({monsters:data.dex,team:data.team,admin:data.admin});}
    catch(reason){if(/로그인/.test(reason.message))showAuth();else showAuth(`서버에 연결하지 못했습니다: ${reason.message}`);}
  }
  async function logout(){try{await api("/api/auth/logout",{method:"POST",body:"{}"});}catch{}stopPolling();runtime.user=null;runtime.room=null;updateProfile();showAuth();}
  async function adminUnlock(password){if(!runtime.serverMode||!runtime.user)return false;await api("/api/admin/unlock",{method:"POST",body:JSON.stringify({password})});runtime.admin=true;return true;}
  function syncState(detail){
    if(!runtime.user||!runtime.serverMode||detail.hydrating)return;
    clearTimeout(runtime.syncTimer);runtime.syncTimer=setTimeout(async()=>{try{
      if(["dex","import","reset"].includes(detail.reason)){await api("/api/dex",{method:"PUT",body:JSON.stringify({monsters:detail.state.monsters})});await api("/api/me/team",{method:"PUT",body:JSON.stringify({team:detail.state.team})});}
      else if(["team","build"].includes(detail.reason))await api("/api/me/team",{method:"PUT",body:JSON.stringify({team:detail.state.team})});
    }catch(reason){notify(reason.message,"error");}},180);
  }
  function stopPolling(){if(runtime.poll)clearInterval(runtime.poll);runtime.poll=null;}
  function startPolling(){stopPolling();runtime.poll=setInterval(refreshRoom,850);}
  async function createRoom(){try{const data=await api("/api/rooms",{method:"POST",body:"{}"});runtime.room=data.room;runtime.panel="moves";renderRooms();startPolling();}catch(reason){notify(reason.message,"error");}}
  async function joinRoom(code){try{const data=await api("/api/rooms/join",{method:"POST",body:JSON.stringify({code})});runtime.room=data.room;runtime.panel="moves";renderRooms();startPolling();}catch(reason){notify(reason.message,"error");}}
  async function leaveRoom(){if(!runtime.room)return;try{await api(`/api/rooms/${runtime.room.code}`,{method:"DELETE"});}catch{}stopPolling();runtime.room=null;renderRooms();}
  async function readyRoom(){const team=arena()?.getTeamSnapshot?.()||[];if(!team.length)return notify("팀 편성에서 몬스터를 먼저 준비하세요.","error");try{const data=await api(`/api/rooms/${runtime.room.code}/team`,{method:"PUT",body:JSON.stringify({team})});runtime.room=data.room;renderRooms();}catch(reason){notify(reason.message,"error");}}
  async function refreshRoom(){if(!runtime.room)return;try{const data=await api(`/api/rooms/${runtime.room.code}`);const before=runtime.room?.battle?.eventId||0;runtime.room=data.room;if(runtime.room.battle?.eventId!==before&&arena()?.currentRoute?.()==="rooms")renderRooms();}catch(reason){stopPolling();notify(reason.message,"error");runtime.room=null;if(arena()?.currentRoute?.()==="rooms")renderRooms();}}
  async function submitBattleAction(action){try{const data=await api(`/api/rooms/${runtime.room.code}/action`,{method:"POST",body:JSON.stringify({action})});runtime.room=data.room;runtime.panel="moves";renderRooms();}catch(reason){notify(reason.message,"error");}}
  function copyRoomCode(){navigator.clipboard?.writeText(runtime.room.code).then(()=>notify("방 코드를 복사했습니다.")).catch(()=>notify(`방 코드: ${runtime.room.code}`));}
  function imageMarkup(monster){return monster.image?`<img src="${esc(monster.image)}" alt="${esc(monster.name)}">`:`<span class="monster-placeholder">${esc(monster.name?.slice(0,1)||"?")}</span>`;}
  function hpMarkup(monster,side){const pct=Math.max(0,monster.currentHp/monster.maxHp*100);return `<div class="online-status-card"><div><b>${esc(monster.name)}${monster.status?`<i class="status-badge">${STATUS[monster.status]||monster.status}</i>`:""}</b><span>Lv.${monster.level}</span></div><div class="hp-line"><i class="hp-fill ${pct<30?"low":""}" style="width:${pct}%"></i></div><small>${side==="own"?`${monster.currentHp} / ${monster.maxHp}`:`HP ${Math.ceil(pct)}%`}</small></div>`;}
  function stageText(value){return value===0?"±0":value>0?`+${value}`:`${value}`;}
  function statusPanel(battle,ownSide){return `<div class="online-status-panel">${[ownSide,1-ownSide].map((side,row)=>{const monster=battle.teams[side][battle.active[side]];return `<section><div class="status-panel-title"><b>${row===0?"내":"상대"} ${esc(monster.name)}</b><span>${monster.status?STATUS[monster.status]:"정상"}</span></div><div class="stage-grid">${STATS.map(([key,label])=>`<div class="stage-cell ${monster.stages[key]>0?"up":monster.stages[key]<0?"down":""}"><small>${label}</small><b>${stageText(monster.stages[key])}</b><span>현재 ${Math.floor((monster.stats[key]||1)*(monster.stages[key]>=0?(2+monster.stages[key])/2:2/(2-monster.stages[key])))}</span></div>`).join("")}</div><p>특성 <b>${esc(monster.ability?.name||"—")}</b></p></section>`;}).join("")}</div>`;}
  function switchPanel(battle,ownSide,actionRequired){const active=battle.active[ownSide];return `<div class="online-switch-list">${battle.teams[ownSide].map((monster,index)=>{const disabled=!actionRequired||index===active||monster.fainted||monster.currentHp<=0,pct=Math.max(0,monster.currentHp/monster.maxHp*100);return `<button data-mp="battle-switch" data-index="${index}" ${disabled?"disabled":""}><span class="switch-thumb">${imageMarkup(monster)}</span><span><b>${esc(monster.name)}</b><small>${monster.status?STATUS[monster.status]:"정상"} · HP ${Math.ceil(pct)}%</small></span><i>${index===active?"배틀 중":monster.fainted?"기절":"교체"}</i></button>`;}).join("")}</div>`;}
  function movePanel(battle,ownSide,actionRequired){const actor=battle.teams[ownSide][battle.active[ownSide]],hasPp=actor.moves.some(move=>move.pp>0);if(!hasPp)return `<div class="move-buttons online-moves"><button class="move-button type-normal" data-mp="battle-move" data-index="-1" ${actionRequired?"":"disabled"}><span class="move-type-label">노말</span><b>발버둥</b><small>PP가 모두 소진되어 발버둥을 사용합니다.</small></button></div>`;return `<div class="move-buttons online-moves">${actor.moves.map((move,index)=>`<button class="move-button" data-mp="battle-move" data-index="${index}" style="--move-color:${TYPE_COLOR[move.type]||TYPE_COLOR["노말"]};--move-tint:${TYPE_COLOR[move.type]||TYPE_COLOR["노말"]}33" ${!actionRequired||move.pp<=0?"disabled":""}><span class="move-type-label">${esc(move.type)}</span><b>${esc(move.name)}</b><small>${CAT[move.category]||"변화"} · 위력 ${move.power||"—"} · 명중 ${move.accuracy>=1000?"—":move.accuracy}</small><span class="pp-count">PP <b>${move.pp}</b> / ${move.maxPp}</span><small class="move-effect-line">${esc(move.description||"")}</small></button>`).join("")}</div>`;}
  function renderOnlineBattle(host,room){
    const battle=room.battle,ownSide=room.youSide,foeSide=1-ownSide,own=battle.teams[ownSide][battle.active[ownSide]],foe=battle.teams[foeSide][battle.active[foeSide]],last=battle.log[battle.log.length-1],actionRequired=battle.actionRequired;
    if(battle.phase==="forcedSwitch"&&battle.forced?.[ownSide])runtime.panel="switch";
    const panel=runtime.panel==="status"?statusPanel(battle,ownSide):runtime.panel==="switch"?switchPanel(battle,ownSide,actionRequired):movePanel(battle,ownSide,actionRequired);
    const finished=battle.phase==="finished",won=battle.winner===ownSide;
    host.innerHTML=`<div class="view battle-view online-battle"><div class="stadium"><div class="stadium-lights"></div></div><div class="battle-hud"><div class="battle-topline"><span class="battle-mode-label"><i class="live-dot"></i> PRIVATE ROOM · ${room.code}</span><div class="turn-timer">${battle.turn}</div></div>
      <div class="online-combatant enemy">${hpMarkup(foe,"foe")}<div class="fighter">${imageMarkup(foe)}</div></div><div class="online-combatant player">${hpMarkup(own,"own")}<div class="fighter">${imageMarkup(own)}</div></div>
      <div class="battle-log online-log"><small>${esc(battle.nicknames[foeSide])} VS ${esc(battle.nicknames[ownSide])}</small><b>${esc(last?.text||"배틀을 준비하고 있습니다.")}</b></div>
      <div class="battle-controls online-controls"><div class="battle-command-tabs"><button data-mp="battle-panel" data-panel="moves" class="${runtime.panel==="moves"?"active":""}">기술</button><button data-mp="battle-panel" data-panel="switch" class="${runtime.panel==="switch"?"active":""}">포켓몬</button><button data-mp="battle-panel" data-panel="status" class="${runtime.panel==="status"?"active":""}">상태</button></div><div class="battle-prompt"><b>${finished?"배틀 종료":battle.waitingForOpponent?"상대의 선택을 기다리는 중…":battle.phase==="forcedSwitch"?"교체할 포켓몬을 선택하세요.":`${esc(own.name)}은 무엇을 할까?`}</b><span>TURN ${String(battle.turn).padStart(2,"0")}</span></div>${panel}</div>
      <aside class="online-event-log"><b>배틀 기록</b>${battle.log.slice(-7).reverse().map(item=>`<p class="${esc(item.kind)}">${esc(item.text)}</p>`).join("")}</aside>
      ${finished?`<div class="battle-result"><div class="result-card"><span class="eyebrow">MATCH COMPLETE</span><h2>${battle.winner===-1?"DRAW":won?"VICTORY":"DEFEAT"}</h2><p>${esc(battle.log[battle.log.length-1]?.text||"")}</p><button class="primary-button" data-mp="leave-room">룸 나가기</button></div></div>`:""}</div></div>`;
  }
  function renderLobby(host,room){const me=room.players[room.youSide],opponent=room.players[1-room.youSide];host.innerHTML=`<div class="view room-view"><div class="view-inner"><div class="page-heading"><div><span class="eyebrow">PRIVATE MATCH</span><h1>프라이빗 룸</h1><p>방 코드를 친구에게 보내고 서로 준비를 완료하세요.</p></div><button class="secondary-button" data-mp="leave-room">룸 나가기</button></div><div class="room-code-card"><small>ROOM CODE</small><button data-mp="copy-code"><b>${room.code}</b><span>복사</span></button></div><div class="room-versus"><section class="room-player ready"><span>${esc(me?.nickname?.slice(0,1)||"?")}</span><div><small>YOU</small><b>${esc(me?.nickname||"")}</b><i>${me?.ready?"팀 제출 완료":"팀 준비 필요"}</i></div></section><em>VS</em><section class="room-player ${opponent?.ready?"ready":""}"><span>${esc(opponent?.nickname?.slice(0,1)||"?")}</span><div><small>RIVAL</small><b>${opponent?esc(opponent.nickname):"상대 기다리는 중"}</b><i>${opponent?.ready?"팀 제출 완료":"아직 참가하지 않음"}</i></div></section></div><div class="room-ready-box"><p>현재 팀 ${arena()?.getTeamSnapshot?.().length||0}마리 · 준비 버튼을 누르면 이 팀이 룸에 고정됩니다.</p><button class="primary-button" data-mp="ready-room" ${me?.ready?"disabled":""}>${me?.ready?"준비 완료 · 상대 대기 중":"이 팀으로 준비 완료"}</button></div></div></div>`;}
  function renderRoomGate(host){const teamCount=arena()?.getTeamSnapshot?.().length||0;host.innerHTML=`<div class="view room-view"><div class="view-inner"><div class="page-heading"><div><span class="eyebrow">ONLINE PRIVATE MATCH</span><h1>친구와 배틀</h1><p>계정마다 자신의 팀을 저장하고, 6자리 비공개 코드로 서로 대전할 수 있습니다.</p></div><span class="online-user-pill"><i class="live-dot"></i>${esc(runtime.user?.nickname||"OFFLINE")}</span></div><div class="room-gate-grid"><section><span class="room-gate-icon">＋</span><h2>새 룸 만들기</h2><p>새로운 방 코드를 만들고 친구를 초대합니다.</p><small>현재 배틀 팀 · ${teamCount}/6</small><button class="primary-button" data-mp="create-room" ${!teamCount?"disabled":""}>프라이빗 룸 생성</button></section><section><span class="room-gate-icon">→</span><h2>룸 참가하기</h2><p>친구에게 받은 6자리 코드를 입력하세요.</p><form id="joinRoomForm"><input name="code" maxlength="6" autocomplete="off" placeholder="ABC123" required><button class="secondary-button" type="submit">참가</button></form></section></div></div></div>`;host.querySelector("#joinRoomForm")?.addEventListener("submit",event=>{event.preventDefault();joinRoom(new FormData(event.currentTarget).get("code"));});}
  function renderRooms(host=document.querySelector("#appContent")){if(!host)return;if(!runtime.user){showAuth();host.innerHTML="";return;}if(!runtime.room)renderRoomGate(host);else if(runtime.room.battle)renderOnlineBattle(host,runtime.room);else renderLobby(host,runtime.room);}

  document.addEventListener("click",event=>{
    const target=event.target.closest("[data-mp]");if(!target)return;const action=target.dataset.mp;
    if(action==="auth-mode")setAuthMode(target.dataset.mode);
    if(action==="offline")hideAuth();
    if(action==="profile"&&confirm("현재 계정에서 로그아웃할까요?"))logout();
    if(action==="create-room")createRoom();
    if(action==="leave-room")leaveRoom();
    if(action==="ready-room")readyRoom();
    if(action==="copy-code")copyRoomCode();
    if(action==="battle-panel"){runtime.panel=target.dataset.panel;renderRooms();}
    if(action==="battle-move")submitBattleAction({kind:"move",moveIndex:Number(target.dataset.index)});
    if(action==="battle-switch")submitBattleAction({kind:"switch",targetIndex:Number(target.dataset.index)});
  });
  window.addEventListener("ishs-state-change",event=>syncState(event.detail||{}));
  window.ISHSNetwork={adminUnlock,pushState:syncState,get user(){return runtime.user;},get serverMode(){return runtime.serverMode;}};
  window.ISHSMultiplayer={renderRooms,refreshRoom};
  document.addEventListener("DOMContentLoaded",()=>{ensureAuthUi();bootstrap();});
})();
