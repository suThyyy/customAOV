import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomController,inviteLink,generateLineup,selectedPlayers,swapLineup,subscribeRoom} from '../room-controller.js';
import {createRoomApi} from '../room-api-core.js';
import '../randomizer-core.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const snapshot=()=>({room:{id:'r',version:1},members:[{id:'m',display_name:'Nick'}],queue:[],currentPlayers:[]});

test('invite preserves GitHub Pages subpath and clears Phase 1 share parameters',()=>{
 const url=new URL(inviteLink('https://x.github.io/customAOV/?live=old#x',{id:'r',invite_code:'code'}));
 assert.equal(url.pathname,'/customAOV/');assert.equal(url.search,'?room=r&invite=code');assert.equal(url.hash,'');
});
test('subscribe before initial fetch, duplicate events coalesce, reconnect refetches',async()=>{
 let events,status,calls=0,resolve;const order=[];
 const c=createRoomController({api:{readSnapshot:()=>{calls++;order.push('read');return new Promise(r=>resolve=r);}},
 subscribe:(_r,e,s)=>{order.push('subscribe');events=e;status=s;return()=>{};}});
 c.setUser({id:'a'});c.open('r');events();events();
 assert.deepEqual(order,['subscribe','read']);resolve({data:snapshot()});await tick();
 assert.equal(calls,2);resolve({data:snapshot()});await tick();
 status('CHANNEL_ERROR');assert.equal(c.getState().connection,'CHANNEL_ERROR');
 status('SUBSCRIBED');assert.equal(calls,3);resolve({data:snapshot()});await tick();c.destroy();
});
test('logout/account switching discards stale snapshots and mutation responses',async()=>{
 const pending=[];let stops=0,resolveWrite;
 const c=createRoomController({api:{readSnapshot:()=>new Promise(r=>pending.push(r)),createRoom:()=>new Promise(r=>resolveWrite=r)},subscribe:()=>()=>stops++});
 c.setUser({id:'a'});c.open('r');const mutation=c.run('createRoom');
 c.setUser({id:'b'});pending[0]({data:{room:{id:'old'}}});resolveWrite({data:{id:'old'}});
 assert.equal(await mutation,null);await tick();assert.equal(c.getState().data,null);
 pending[1]({data:snapshot()});await tick();assert.equal(c.getState().data.room.id,'r');
 c.setUser(null);assert.equal(c.getState().data,null);assert.equal(stops,2);
});
test('single mutation in flight, service denial and read errors become UI states',async()=>{
 let count=0,resolve;
 const c=createRoomController({api:{readSnapshot:async()=>({error:{message:'Access denied'}}),hostAddPlayer:()=>{count++;return new Promise(r=>resolve=r);}},subscribe:()=>()=>{}});
 c.setUser({id:'a'});c.open('r');await tick();assert.equal(c.getState().error,'Access denied');
 const p=c.run('hostAddPlayer','r','name');assert.equal(await c.run('hostAddPlayer','r','name'),null);
 resolve({error:{message:'Host only'}});await p;assert.equal(count,1);assert.equal(c.getState().error,'Host only');c.destroy();
});

test('account changes during post-mutation refetch cannot navigate to the old room',async()=>{
 let resolveRead;
 const c=createRoomController({api:{readSnapshot:()=>new Promise(r=>resolveRead=r),createRoom:async()=>({data:{id:'old'}})},subscribe:()=>()=>{}});
 c.setUser({id:'a'});c.open('r');
 const writing=c.run('createRoom');await tick();
 c.setUser(null);resolveRead({data:snapshot()});
 assert.equal(await writing,null);assert.equal(c.getState().data,null);c.destroy();
});
test('Room mapping and Tier/Rank generation reuse Core and preserve source data',()=>{
 const d=snapshot();d.currentPlayers=Array.from({length:10},(_,i)=>({member_id:String(i),slot:i+1}));
 const players=selectedPlayers(d),before=JSON.stringify(d),assign=Object.fromEntries(players.map(p=>[p.id,'1']));
 for(const mode of ['tier','rank']){
  const lineup=generateLineup(globalThis.CustomAOVRandomizer,players,mode,[{id:'1',score:8}],assign);
  assert.equal(lineup.filter(p=>p.team==='a').length,5);assert.equal(new Set(lineup.map(p=>p.id)).size,10);
  const a=lineup.find(p=>p.team==='a'),b=lineup.find(p=>p.team==='b');
  const swapped=swapLineup(lineup,a.id,b.id);assert.equal(swapped.find(p=>p.id===a.id).team,'b');assert.equal(a.team,'a');
 }
 assert.equal(JSON.stringify(d),before);
 assert.throws(()=>generateLineup(globalThis.CustomAOVRandomizer,players.slice(1),'tier',[],{}),/10/);
 assert.throws(()=>generateLineup(globalThis.CustomAOVRandomizer,players,'tier',[],assign),/Tier/);
});
test('lineup API whitelists fields and forwards version/replace contract',async()=>{
 const calls=[];const api=createRoomApi({getCurrentUser:async()=>({id:'a'}),client:{rpc:async(name,args)=>{calls.push({name,args});return{data:{}};}}});
 await api.saveLineup('r',2,[{member_id:'m',team:'a',skill_mode:'tier',skill_value:'1',skill_score:8,user_id:'spoof',role:'admin'}]);
 assert.equal(calls[0].args.p_version,2);assert.equal('user_id' in calls[0].args.p_players[0],false);
 await api.replacePlayer('r',2,'m');assert.deepEqual(calls[1],{name:'replace_open_room_player',args:{p_room_id:'r',p_version:2,p_member_id:'m'}});
});
test('Realtime filters isolate rooms and unsubscribe removes channel and polling',()=>{
 const filters=[];let removed=false;
 const channel={on:(_kind,f)=>{filters.push(f);return channel;},subscribe:()=>channel};
 const stop=subscribeRoom({channel:()=>channel,removeChannel:()=>{removed=true;}},'r',()=>{},()=>{});
 assert.equal(filters.length,4);assert.ok(filters.every(f=>f.filter.endsWith('=eq.r')));stop();assert.ok(removed);
});
