// Local-only Chrome smoke test. Fake API; no Supabase/Firebase requests.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const chrome=process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const page=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/style.css"><link rel="stylesheet" href="css/room.css"><section id="openRoomArea"></section><pre id="result">RUNNING</pre><script src="randomizer-core.js"></script><script type="module">
import {createRoomUI} from './room-ui.js';
const out=document.querySelector('#result');
const assert=(v,m)=>{if(!v)throw Error(m)};
const wait=()=>new Promise(r=>setTimeout(r,30));
let ui;
try {
 const data={room:{id:'r',host_user_id:'host',invite_code:'test-code',status:'open',current_round_no:1,current_round_state:'preparing',version:1},members:[],queue:[],currentPlayers:[]};
 for(let i=0;i<10;i++){data.members.push({id:String(i),display_name:'Player '+i,status:'active',user_id:null});data.currentPlayers.push({member_id:String(i),slot:i+1,team:i<5?'a':'b',skill_mode:'tier',skill_value:'1',skill_score:8});}
 let saved=0;
 const api={readSnapshot:async()=>({data:structuredClone(data)}),saveLineup:async(r,v,players)=>{assert(players.length===10,'ten players');saved++;data.currentPlayers=players;data.room.version++;return {data:data.room}}};
 const channel={on(){return this},subscribe(){return this}};
 ui=createRoomUI({root:document.querySelector('#openRoomArea'),api,client:{channel:()=>channel,removeChannel(){}},core:globalThis.CustomAOVRandomizer,tierCatalog:[{id:'1',label:'Mâm 1',score:8}],rankCatalog:[],href:location.href+'?room=r',setUrl(){},login(){},confirm:()=>true});
 ui.controller.open('r');ui.setAuthState({user:{id:'host'}});await wait();
 assert(document.querySelectorAll('.room-skill-control select').length===10,'skill selectors');
 await ui.swapRoomPlayers('0','5');await wait();assert(saved===1,'swap save');
 assert(data.currentPlayers.filter(p=>p.team==='a').length===5,'5v5');
 assert(document.documentElement.scrollWidth<=innerWidth,'horizontal overflow');
 ui.setAuthState({user:null});assert(!document.querySelector('#openRoomArea').textContent.includes('Player 0'),'logout cleanup');
 out.textContent='BROWSER_PASS width='+innerWidth;
}catch(e){out.textContent='BROWSER_FAIL '+e.message}finally{ui?.destroy()}
</script>`;
const allowed=new Map(['room-ui.js','room-controller.js','randomizer-core.js','css/style.css','css/room.css'].map(p=>['/customAOV/'+p,p]));
const server=createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/customAOV/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(page);}
 if(!allowed.has(path)){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(new URL('../'+allowed.get(path),import.meta.url)));
 }catch{res.statusCode=500;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 for(const width of [1280,480]){
  const profile=await mkdtemp(join(tmpdir(),'customaov-browser-'));
  const args=['--headless','--disable-gpu','--no-first-run','--no-default-browser-check', '--disable-background-networking',
    '--user-data-dir='+profile,'--window-size='+width+',900','--dump-dom','--virtual-time-budget=5000',
    'http://127.0.0.1:'+server.address().port+'/customAOV/'];
  const output=await new Promise((resolve,reject)=>{
   const p=spawn(chrome,args,{windowsHide:true});let out='';const timer=setTimeout(()=>{p.kill();reject(Error('browser timeout'));},30000);
   p.stdout.on('data',b=>out+=b);p.stderr.resume();p.on('error',reject);p.on('close',()=>{clearTimeout(timer);resolve(out);});
  });
  const result=output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  console.log(result||'BROWSER_NOT_VERIFIED');if(!result?.startsWith('BROWSER_PASS'))process.exitCode=1;
 }
}finally{server.close();}
