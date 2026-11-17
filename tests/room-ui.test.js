import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomUI} from '../room-ui.js';
const tick=()=>new Promise(r=>setImmediate(r));
class Element {
 constructor(tag,doc){this.tag=tag;this.ownerDocument=doc;this.children=[];this.handlers={};this.hidden=false;this.disabled=false;this.value='';}
 set textContent(t){this.children=[];this.text=String(t);this.firstChild={textContent:String(t)};}
 get textContent(){return (this.text||'')+this.children.map(c=>c.textContent).join('');}
 append(e){this.children.push(e);e.parentElement=this;}
 replaceChildren(){this.children=[];this.text='';}
 replaceWith(e){const p=this.parentElement;p.children[p.children.indexOf(this)]=e;e.parentElement=p;}
 addEventListener(n,f){this.handlers[n]=f;}
 setAttribute(){}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);}
 async click(){if(!this.disabled)await this.handlers.click?.();}
}
function setup(user='host') {
 const doc={createElement:tag=>new Element(tag,doc)},root=new Element('section',doc),calls=[];
 let data={room:{id:'r',host_user_id:'host',invite_code:'code',status:'open',current_round_no:1,current_round_state:'preparing',version:1},
 members:[{id:'m',user_id:'viewer',display_name:'<img onerror=attack>',status:'active'},{id:'manual',user_id:null,display_name:'Manual',status:'active'}],
 queue:[{member_id:'manual',queue_seq:7,status:'waiting'},{member_id:'m',queue_seq:2,status:'waiting'}],currentPlayers:[]};
 const api={readSnapshot:async()=>({data}),hostAddPlayer:async(...args)=>{calls.push(args);return{error:{message:'Host only'}};},createRoom:async()=>({data:data.room})};
 const channel={on(){return this;},subscribe(){return this;}};
 const ui=createRoomUI({root,api,client:{channel:()=>channel,removeChannel:()=>{}},core:{},rankCatalog:[],tierCatalog:[],href:'https://site/customAOV/?room=r&invite=code',setUrl:()=>{},login:()=>calls.push('login'),confirm:()=>true});
 ui.setAuthState({user:user?{id:user}:null});
 const button=text=>root.querySelectorAll('button').find(b=>b.textContent===text);
 return{ui,root,calls,button,api,getData:()=>data,setData:d=>data=d};
}
test('Room UI renders FIFO as text, handles API error, clears private state on logout',async()=>{
 const f=setup();try{
 await tick();const list=f.root.querySelectorAll('ul')[0];
 assert.ok(list.textContent.indexOf('<img')<list.textContent.indexOf('Manual'));
 assert.equal(f.root.querySelectorAll('img').length,0);
 await f.button('＋').click();assert.match(f.root.textContent,/Host only/);
 f.ui.setAuthState({user:null});assert.doesNotMatch(f.root.textContent,/<img|Manual/);
 }finally{f.ui.destroy();}
});

test('Room sidebar keeps lineup state in its adapter and does not create a second result UI',async()=>{
 const f=setup();
 let ui;
 try {
  const data=structuredClone(f.getData());
  f.ui.destroy();
  const channel={on(){return this;},subscribe(){return this;}};
  data.currentPlayers=[];f.api.readSnapshot=async()=>({data});
  ui=createRoomUI({root:f.root,api:f.api,client:{channel:()=>channel,removeChannel:()=>{}},rankCatalog:[],tierCatalog:[],href:'https://site/customAOV/?room=r',setUrl:()=>{},login:()=>{}});
  ui.setAuthState({user:{id:'host'}});ui.setMode(true);await tick();
  assert.equal(ui.getSelectedPlayers().length,0);assert.equal(f.button('Chia và lưu đội hình'),undefined);
 } finally {ui?.destroy();}
});
test('Viewer cannot see Host controls; guest can log in without creating a Room',async()=>{
 const f=setup('viewer');try{await tick();assert.equal(f.button('＋').parentElement.hidden,true);
 f.ui.setAuthState({user:null});assert.equal(f.button('Tạo').hidden,true);
 await f.button('Đăng nhập / Đăng ký').click();assert.deepEqual(f.calls,['login']);
 }finally{f.ui.destroy();}
});
test('active round hides edits/replace and disables Start; closed room hides Host mutations',async()=>{
 const f=setup();try{await tick();let d=structuredClone(f.ui.controller.getState().data);
 d.room.current_round_state='active';f.setData(d);await f.ui.controller.refresh();
 assert.equal(f.button('Start').disabled,true);
  d={...d,room:{...d.room,status:'closed'}};f.setData(d);await f.ui.controller.refresh();
  const plus=f.root.querySelectorAll('button').find(b=>b.textContent==='＋');
  assert.equal(plus.parentElement.hidden,true);
 }finally{f.ui.destroy();}
});

test('Prepare is internal to Draw and waiting rows expose draft Tier/Rank controls',async()=>{
 const f=setup();try{
  await tick();const d=structuredClone(f.ui.controller.getState().data);d.room.current_round_state='idle';
  f.setData(d);await f.ui.controller.refresh();assert.equal(f.button('Chuẩn bị / Next Round'),undefined);
  for(let i=2;i<10;i++){d.members.push({id:String(i),status:'active'});d.queue.push({member_id:String(i),status:'waiting',queue_seq:i+10});}
  f.setData(d);await f.ui.controller.refresh();assert.ok(f.root.querySelectorAll('select').length>0);
  assert.equal(f.ui.controller.getState().data.currentPlayers.length,0);
 }finally{f.ui.destroy();}
});

test('Room adapter forwards versioned swap to the authorized lineup RPC',async()=>{
 const f=setup();try{
  await tick();const d=structuredClone(f.ui.controller.getState().data);
  d.currentPlayers=[{member_id:'m',slot:1,team:'a'},{member_id:'manual',slot:2,team:'b'}];d.queue[1].status='selected';
  f.api.saveLineup=async(...args)=>{f.calls.push(args);return{data:d.room};};
  f.setData(d);await f.ui.controller.refresh();
  const swapped=f.ui.swapRoomPlayers('m','manual');assert.ok(swapped!==false);await tick();
   d.room.current_round_state='active';f.setData(d);await f.ui.controller.refresh();
   assert.equal(f.ui.controller.getState().data.room.current_round_state,'active');
 }finally{f.ui.destroy();}
});
