"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { startBattle, submitAction, publicBattle } = require("./battle-engine");

const ROOT = __dirname;
const LEGACY_DATA_DIR = process.env.ISHS_LEGACY_DATA_DIR ? path.resolve(process.env.ISHS_LEGACY_DATA_DIR) : path.join(ROOT,"server-data");
const DATA_DIR = process.env.ISHS_DATA_DIR ? path.resolve(process.env.ISHS_DATA_DIR) : path.join(os.homedir(),".ishs-arena-data");
const STORE_FILE = path.join(DATA_DIR,"store.json");
const BACKUP_FILE = path.join(DATA_DIR,"store.backup.json");
const PORT = Number(process.env.PORT) || 4173;
const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
let database = null;
const ADMIN_PASSWORD_HASH = process.env.ISHS_ADMIN_PASSWORD_HASH || (process.env.ISHS_ADMIN_PASSWORD
  ? crypto.createHash("sha256").update(process.env.ISHS_ADMIN_PASSWORD).digest("hex")
  : "");
const sessions = new Map();
const rooms = new Map();

function emptyStore() { return { version:2, accounts:[], dex:[], teams:{},updatedAt:null }; }
function normalizeStore(raw) {
  return { ...emptyStore(), ...raw, version:2, accounts:Array.isArray(raw?.accounts)?raw.accounts:[],dex:Array.isArray(raw?.dex)?raw.dex:[],teams:raw?.teams&&typeof raw.teams==="object"?raw.teams:{} };
}
function prepareDataDirectory() {
  fs.mkdirSync(DATA_DIR,{recursive:true});
  const legacyFile=path.join(LEGACY_DATA_DIR,"store.json");
  if(!fs.existsSync(STORE_FILE)&&path.resolve(DATA_DIR)!==path.resolve(LEGACY_DATA_DIR)&&fs.existsSync(legacyFile)){
    fs.copyFileSync(legacyFile,STORE_FILE);
    console.log(`기존 데이터를 새 영구 저장소로 옮겼습니다: ${DATA_DIR}`);
  }
}
function loadStore() {
  prepareDataDirectory();
  for(const file of [STORE_FILE,BACKUP_FILE]){
    try{return normalizeStore(JSON.parse(fs.readFileSync(file,"utf8")));}
    catch{}
  }
  return emptyStore();
}
let store = loadStore();
let saveQueue = Promise.resolve();
async function initializeDatabaseStore() {
  if(!DATABASE_URL)return;
  const {neon}=await import("@neondatabase/serverless");
  database=neon(DATABASE_URL);
  await database`CREATE TABLE IF NOT EXISTS ishs_arena_store (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  const rows=await database`SELECT data FROM ishs_arena_store WHERE id = 1`;
  if(rows.length){store=normalizeStore(rows[0].data);return;}
  store.updatedAt=new Date().toISOString();
  await database`INSERT INTO ishs_arena_store (id,data,updated_at)
    VALUES (1,${JSON.stringify(store)}::jsonb,NOW())`;
}
async function persistStoreSnapshot(snapshot) {
  if(database){
    await database`INSERT INTO ishs_arena_store (id,data,updated_at)
      VALUES (1,${snapshot}::jsonb,NOW())
      ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW()`;
    return;
  }
  fs.mkdirSync(DATA_DIR,{recursive:true});
  const temp=`${STORE_FILE}.tmp`;
  fs.writeFileSync(temp,JSON.stringify(JSON.parse(snapshot),null,2),"utf8");
  if(fs.existsSync(STORE_FILE)){
    try{JSON.parse(fs.readFileSync(STORE_FILE,"utf8"));fs.copyFileSync(STORE_FILE,BACKUP_FILE);}catch{}
  }
  fs.renameSync(temp,STORE_FILE);
}
function saveStore() {
  store.updatedAt=new Date().toISOString();
  const snapshot=JSON.stringify(store);
  saveQueue=saveQueue.catch(()=>{}).then(()=>persistStoreSnapshot(snapshot));
  return saveQueue;
}
function send(res,status,data,headers={}) {
  const body=Buffer.from(JSON.stringify(data));
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Content-Length":body.length,"Cache-Control":"no-store",...headers});
  res.end(body);
}
function fail(res,status,message) { send(res,status,{error:message}); }
function readJson(req,limit=20*1024*1024) {
  return new Promise((resolve,reject)=>{
    const chunks=[]; let size=0;
    req.on("data",chunk=>{size+=chunk.length;if(size>limit){reject(new Error("요청 데이터가 너무 큽니다."));req.destroy();}else chunks.push(chunk);});
    req.on("end",()=>{try{resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString("utf8")):{});}catch{reject(new Error("올바른 JSON이 아닙니다."));}});
    req.on("error",reject);
  });
}
function cookieMap(req) {
  return Object.fromEntries(String(req.headers.cookie||"").split(";").map(item=>item.trim().split("=")).filter(parts=>parts.length===2).map(([key,value])=>[key,decodeURIComponent(value)]));
}
function sessionFor(req) {
  const token=cookieMap(req).ishs_session, session=token&&sessions.get(token);
  if (!session || session.expiresAt<Date.now()) { if(token)sessions.delete(token); return null; }
  session.expiresAt=Date.now()+7*24*60*60*1000;
  return session;
}
function currentUser(req) {
  const session=sessionFor(req); if(!session)return null;
  const account=store.accounts.find(item=>item.id===session.userId); return account?{session,account}:null;
}
function requireUser(req,res) { const auth=currentUser(req);if(!auth)fail(res,401,"로그인이 필요합니다.");return auth; }
function setSession(req,res,account) {
  const token=crypto.randomBytes(32).toString("hex");
  sessions.set(token,{userId:account.id,admin:false,expiresAt:Date.now()+7*24*60*60*1000});
  const secure=process.env.NODE_ENV==="production"||String(req.headers["x-forwarded-proto"]||"").toLowerCase()==="https";
  return { token, headers:{"Set-Cookie":`ishs_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure?"; Secure":""}`} };
}
function normalizeNickname(value) { return String(value||"").trim().normalize("NFKC"); }
function validNickname(name) { return /^[가-힣A-Za-z0-9_]{2,16}$/.test(name); }
function passwordHash(password,salt) { return crypto.scryptSync(String(password),salt,64).toString("hex"); }
function safeUser(account) { return { id:account.id,nickname:account.nickname,createdAt:account.createdAt }; }
function roomCode() {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let code="";
  do { code=Array.from({length:6},()=>chars[crypto.randomInt(chars.length)]).join(""); } while(rooms.has(code));
  return code;
}
function sanitizeTeamSnapshot(input) {
  if(!Array.isArray(input)||input.length<1||input.length>6)throw new Error("팀은 1~6마리로 구성하세요.");
  return input.map(raw=>{
    const moves=Array.isArray(raw.moves)?raw.moves.slice(0,4):[];
    if(!moves.length)throw new Error("모든 몬스터에게 기술을 하나 이상 설정하세요.");
    return {
      id:String(raw.id||raw.speciesId||crypto.randomUUID()).slice(0,80), name:String(raw.name||"몬스터").slice(0,24), image:String(raw.image||"").slice(0,4*1024*1024),
      level:Math.max(1,Math.min(100,Number(raw.level)||50)), type1:String(raw.type1||"노말").slice(0,12), type2:String(raw.type2||"").slice(0,12),
      stats:Object.fromEntries(["hp","attack","defense","spAttack","spDefense","speed"].map(key=>[key,Math.max(1,Math.min(999,Number(raw.stats?.[key])||1))])),
      ability:{id:String(raw.ability?.id||raw.abilityId||"").slice(0,80),name:String(raw.ability?.name||raw.abilityName||"특성").slice(0,40)},
      moves:moves.map(move=>({
        id:String(move.id||"").slice(0,80),name:String(move.name||"기술").slice(0,50),type:String(move.type||"노말").slice(0,12),category:["physical","special","status"].includes(move.category)?move.category:"status",
        power:Math.max(0,Math.min(500,Number(move.power)||0)),accuracy:move.alwaysHit?1000:Math.max(1,Math.min(100,Number(move.accuracy)||100)),pp:Math.max(1,Math.min(64,Number(move.pp)||20)),priority:Math.max(-7,Math.min(7,Number(move.priority)||0)),
        contact:!!move.contact,sound:!!move.sound,punch:!!move.punch,bite:!!move.bite,slicing:!!move.slicing,pulse:!!move.pulse,bullet:!!move.bullet,wind:!!move.wind,alwaysHit:!!move.alwaysHit,highCrit:!!move.highCrit,variablePower:!!move.variablePower,ohko:!!move.ohko,selfDestruct:!!move.selfDestruct,forceSwitch:!!move.forceSwitch,sideCondition:String(move.sideCondition||"").toLowerCase()==="stealthrock"?"stealthrock":"",description:String(move.description||"").slice(0,500),effect:String(move.effect||"").slice(0,40),heal:Number(move.heal)||0,
        inflict:String(move.inflict||"").slice(0,30),selfStages:move.selfStages||null,targetStages:move.targetStages||null,secondary:move.secondary||null,recoil:Number(move.recoil)||0,drain:Number(move.drain)||0,fixedDamage:move.fixedDamage==="level"?"level":Math.max(0,Math.min(999,Number(move.fixedDamage)||0)),multihit:Array.isArray(move.multihit)?move.multihit.slice(0,2):Math.max(0,Math.min(10,Number(move.multihit)||0))
      }))
    };
  });
}
function roomSide(room,userId) { return room.players.findIndex(player=>player.userId===userId); }
function publicRoom(room,userId) {
  const side=roomSide(room,userId);
  return { code:room.code,status:room.status,createdAt:room.createdAt,players:room.players.map(player=>({nickname:player.nickname,ready:!!player.team})),youSide:side,
    battle:room.battle?publicBattle(room.battle,side):null };
}
function maybeStartRoom(room) {
  if(room.players.length===2&&room.players.every(player=>player.team)&&!room.battle){
    room.battle=startBattle(room.players.map(player=>player.team),room.players.map(player=>player.nickname));room.status="battle";
  }
}
function mime(file) {
  return ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml"})[path.extname(file).toLowerCase()]||"application/octet-stream";
}
function serveStatic(req,res,pathname) {
  const relative=pathname==="/"?"index.html":decodeURIComponent(pathname).replace(/^\/+/,"");
  const file=path.resolve(ROOT,relative);
  if(!file.startsWith(`${path.resolve(ROOT)}${path.sep}`)&&file!==path.resolve(ROOT,"index.html"))return fail(res,403,"접근할 수 없습니다.");
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile())return fail(res,404,"파일을 찾을 수 없습니다.");
    res.writeHead(200,{"Content-Type":mime(file),"Content-Length":stat.size,"Cache-Control":"no-cache, must-revalidate"});
    fs.createReadStream(file).pipe(res);
  });
}
async function api(req,res,pathname) {
  try {
    if(req.method==="GET"&&pathname==="/api/health")return send(res,200,{ok:true,version:"4.2",storage:database?"neon-postgres":process.env.ISHS_DATA_DIR?"persistent-configured":"user-data",updatedAt:store.updatedAt});
    if(req.method==="POST"&&pathname==="/api/auth/signup"){
      const body=await readJson(req),nickname=normalizeNickname(body.nickname),password=String(body.password||"");
      if(!validNickname(nickname))return fail(res,400,"닉네임은 한글·영문·숫자·밑줄 2~16자로 입력하세요.");
      if(password.length<8||password.length>100)return fail(res,400,"비밀번호는 8자 이상으로 입력하세요.");
      if(store.accounts.some(item=>item.nicknameKey===nickname.toLocaleLowerCase("ko")))return fail(res,409,"이미 사용 중인 닉네임입니다.");
      const salt=crypto.randomBytes(16).toString("hex"),account={id:crypto.randomUUID(),nickname,nicknameKey:nickname.toLocaleLowerCase("ko"),salt,passwordHash:passwordHash(password,salt),createdAt:new Date().toISOString()};
      store.accounts.push(account);store.teams[account.id]=[];await saveStore();const auth=setSession(req,res,account);return send(res,201,{user:safeUser(account)},auth.headers);
    }
    if(req.method==="POST"&&pathname==="/api/auth/login"){
      const body=await readJson(req),nickname=normalizeNickname(body.nickname),account=store.accounts.find(item=>item.nicknameKey===nickname.toLocaleLowerCase("ko"));
      if(!account){await new Promise(resolve=>crypto.scrypt("dummy","dummy",64,resolve));return fail(res,401,"닉네임 또는 비밀번호가 올바르지 않습니다.");}
      const candidate=Buffer.from(passwordHash(body.password,account.salt),"hex"),expected=Buffer.from(account.passwordHash,"hex");
      if(candidate.length!==expected.length||!crypto.timingSafeEqual(candidate,expected))return fail(res,401,"닉네임 또는 비밀번호가 올바르지 않습니다.");
      const auth=setSession(req,res,account);return send(res,200,{user:safeUser(account)},auth.headers);
    }
    if(req.method==="POST"&&pathname==="/api/auth/logout"){
      const token=cookieMap(req).ishs_session;if(token)sessions.delete(token);
      return send(res,200,{ok:true},{"Set-Cookie":"ishs_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"});
    }
    if(req.method==="GET"&&pathname==="/api/bootstrap"){
      const auth=requireUser(req,res);if(!auth)return;
      return send(res,200,{user:safeUser(auth.account),dex:store.dex,team:store.teams[auth.account.id]||[],admin:!!auth.session.admin});
    }
    if(req.method==="POST"&&pathname==="/api/admin/unlock"){
      const auth=requireUser(req,res);if(!auth)return;const body=await readJson(req),candidate=crypto.createHash("sha256").update(String(body.password||"")).digest("hex");
      if(!ADMIN_PASSWORD_HASH)return fail(res,503,"관리자 비밀번호가 서버에 설정되지 않았습니다.");
      const a=Buffer.from(candidate),b=Buffer.from(ADMIN_PASSWORD_HASH);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return fail(res,403,"관리자 비밀번호가 올바르지 않습니다.");
      auth.session.admin=true;return send(res,200,{ok:true});
    }
    if(req.method==="PUT"&&pathname==="/api/dex"){
      const auth=requireUser(req,res);if(!auth)return;if(!auth.session.admin)return fail(res,403,"도감 관리자 인증이 필요합니다.");
      const body=await readJson(req);if(!Array.isArray(body.monsters)||body.monsters.length>1000)return fail(res,400,"올바른 도감 데이터가 아닙니다.");
      store.dex=body.monsters;await saveStore();return send(res,200,{ok:true,count:store.dex.length});
    }
    if(req.method==="PUT"&&pathname==="/api/me/team"){
      const auth=requireUser(req,res);if(!auth)return;const body=await readJson(req,2*1024*1024);
      if(!Array.isArray(body.team)||body.team.length>6)return fail(res,400,"팀은 최대 6마리까지 저장할 수 있습니다.");
      store.teams[auth.account.id]=body.team;await saveStore();return send(res,200,{ok:true});
    }
    if(req.method==="POST"&&pathname==="/api/rooms"){
      const auth=requireUser(req,res);if(!auth)return;const code=roomCode(),room={code,status:"waiting",createdAt:Date.now(),players:[{userId:auth.account.id,nickname:auth.account.nickname,team:null}],battle:null};rooms.set(code,room);return send(res,201,{room:publicRoom(room,auth.account.id)});
    }
    if(req.method==="POST"&&pathname==="/api/rooms/join"){
      const auth=requireUser(req,res);if(!auth)return;const body=await readJson(req),code=String(body.code||"").trim().toUpperCase(),room=rooms.get(code);
      if(!room)return fail(res,404,"방을 찾을 수 없습니다.");let side=roomSide(room,auth.account.id);
      if(side<0){if(room.players.length>=2)return fail(res,409,"이미 두 명이 참가한 방입니다.");if(room.status!=="waiting")return fail(res,409,"이미 시작된 방입니다.");room.players.push({userId:auth.account.id,nickname:auth.account.nickname,team:null});}
      return send(res,200,{room:publicRoom(room,auth.account.id)});
    }
    const roomMatch=pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})(?:\/(team|action))?$/);
    if(roomMatch){
      const auth=requireUser(req,res);if(!auth)return;const room=rooms.get(roomMatch[1]);if(!room)return fail(res,404,"방을 찾을 수 없습니다.");const side=roomSide(room,auth.account.id);if(side<0)return fail(res,403,"이 방의 참가자가 아닙니다.");
      if(req.method==="GET"&&!roomMatch[2])return send(res,200,{room:publicRoom(room,auth.account.id)});
      if(req.method==="DELETE"&&!roomMatch[2]){rooms.delete(room.code);return send(res,200,{ok:true});}
      if(req.method==="PUT"&&roomMatch[2]==="team"){
        if(room.battle)return fail(res,409,"이미 배틀이 시작되었습니다.");const body=await readJson(req,12*1024*1024);room.players[side].team=sanitizeTeamSnapshot(body.team);maybeStartRoom(room);return send(res,200,{room:publicRoom(room,auth.account.id)});
      }
      if(req.method==="POST"&&roomMatch[2]==="action"){
        if(!room.battle)return fail(res,409,"아직 배틀이 시작되지 않았습니다.");const body=await readJson(req,1024*32);submitAction(room.battle,side,body.action);return send(res,200,{room:publicRoom(room,auth.account.id)});
      }
    }
    return fail(res,404,"API 경로를 찾을 수 없습니다.");
  } catch(error) { return fail(res,400,error?.message||"요청을 처리하지 못했습니다."); }
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost"),pathname=url.pathname;
  if(pathname.startsWith("/api/"))return api(req,res,pathname);
  return serveStatic(req,res,pathname);
});
async function startServer(){
  await initializeDatabaseStore();
  server.listen(PORT,"0.0.0.0",()=>{
  console.log(`ISHS ARENA server: http://localhost:${PORT}`);
  console.log(`영구 데이터 저장 위치: ${DATA_DIR}`);
  console.log("같은 Wi-Fi의 다른 기기는 이 컴퓨터의 IP 주소와 위 포트를 사용하세요.");
  });
}
startServer().catch(error=>{
  console.error("ISHS ARENA server startup failed:",error?.message||error);
  process.exitCode=1;
});

setInterval(()=>{
  const now=Date.now();
  for(const [token,session] of sessions)if(session.expiresAt<now)sessions.delete(token);
  for(const [code,room] of rooms)if(room.createdAt<now-12*60*60*1000)rooms.delete(code);
},10*60*1000).unref();
