import {createRoomController, subscribeRoom, inviteLink, selectedPlayers, swapLineup} from './room-controller.js';

export function createRoomUI({root, api, client, rankCatalog, tierCatalog, onStateChange=()=>{}, onStart=null,
    href=location.href, setUrl=url=>history.replaceState(null,'',url),
    login=()=>document.getElementById('openAuthBtn').click(), confirm=message=>window.confirm(message)}) {
    const doc=root.ownerDocument;
    let state, previousUser=null, lastData=null, roomMode=false, draftScope=null;
    const draftSkills=new Map();
    const make=(tag,text,parent=root)=>{const e=doc.createElement(tag);if(text)e.textContent=text;parent.append(e);return e;};
    const button=(text,fn,parent=root)=>{const e=make('button',text,parent);e.type='button';e.addEventListener('click',fn);return e;};
    const input=(label,parent,type='text')=>{const l=make('label',label,parent),e=make('input','',l);e.type=type;return e;};
    const heading=make('h2','Open Match Room');heading.tabIndex=-1;
    const message=make('p');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
    const connection=make('p');
    const entry=make('div');entry.className='room-toolbar';
    const loginBtn=button('Đăng nhập / Đăng ký',login,entry);
    const createBtn=button('Tạo',async()=>{const r=await controller.run('createRoom');if(r){invite.value=r.invite_code;target=r.id;setUrl(inviteLink(href,r));controller.open(target);}},entry);
    const invite=input('Mã mời',entry);invite.maxLength=128;
    const nickname=input('Nickname',entry);nickname.maxLength=40;
    const joinBtn=button('Tham gia',async()=>{const m=await controller.run('joinRoom',invite.value,nickname.value);if(m){target=m.room_id;setUrl(inviteLink(href,{id:target,invite_code:invite.value}));controller.open(target);}},entry);
    const refreshBtn=button('↻',()=>controller.refresh(),entry);refreshBtn.title='Refresh Room';refreshBtn.setAttribute('aria-label','Refresh Room');
    const stopBtn=button('×',()=>{controller.open(null);const u=new URL(href);u.searchParams.delete('room');u.searchParams.delete('invite');setUrl(u.href);},entry);stopBtn.title='Ngừng theo dõi Room';stopBtn.setAttribute('aria-label','Ngừng theo dõi Room');
    const actions=make('div');actions.className='room-toolbar';
    const copyBtn=button('⧉',async()=>{try{await navigator.clipboard.writeText(inviteLink(href,state.data.room));message.textContent='Đã copy link.';}catch{message.textContent='Không copy được link.';}},actions);copyBtn.title='Copy Invite Link';copyBtn.setAttribute('aria-label','Copy Invite Link');
    const continueBtn=button('Tiếp tục',()=>controller.run('continueQueue',target),actions);
    const hostControls=make('div');hostControls.className='room-toolbar';
    const manual=input('Thêm nickname',hostControls);manual.maxLength=40;
    const addBtn=button('＋',()=>controller.run('hostAddPlayer',target,manual.value),hostControls);addBtn.title='Host Add Player';addBtn.setAttribute('aria-label','Host Add Player');
    const startBtn=button('Start',()=>onStart?onStart():controller.run('startRound',target),hostControls);
    const endBtn=button('End',()=>{if(confirm('Kết thúc lượt chơi hiện tại?'))void controller.run('endRound',target);},hostControls);
    const closeBtn=button('⏻',()=>{if(confirm('Đóng Room cho tất cả người tham gia?'))void controller.run('closeRoom',target);},hostControls);closeBtn.title='Close Room';closeBtn.setAttribute('aria-label','Close Room');
    const lists=make('div');lists.className='room-columns';
    const waiting=make('section','',lists), selected=make('section','',lists), members=make('section','',lists);
    const modeWrap=make('label','Cân đội bằng ',lists), mode=make('select','',modeWrap);
    for(const [v,t] of [['tier','Mâm'],['rank','Rank']]){const o=make('option',t,mode);o.value=v;}
    const memberToggle=button('Quản lý thành viên',()=>{members.hidden=!members.hidden;memberToggle.setAttribute('aria-expanded',String(!members.hidden));},lists);memberToggle.setAttribute('aria-expanded','false');members.hidden=true;
    const controller=createRoomController({api,subscribe:(...args)=>subscribeRoom(client,...args),onChange:render});
    const url=new URL(href);let target=url.searchParams.get('room');invite.value=url.searchParams.get('invite')||'';

    function skillCatalog(kind){return kind==='rank'?rankCatalog:tierCatalog;}
    function skillControl(member,current,host,parent){
        const label=make('label','',parent);label.className='room-skill-control';
        const select=make('select','',label);select.setAttribute('aria-label',`Tier/Rank của ${member.display_name||'người chơi'}`);
        make('option','Tier/Rank',select).value='';
        const kind=current?.skill_mode||mode.value;
        for(const c of skillCatalog(kind)){const o=make('option',c.label,select);o.value=String(c.id);}
        const draft=draftSkills.get(member.id);select.value=draft?.value||current?.skill_value||'';select.disabled=!host;
        select.addEventListener('change',()=>{const c=skillCatalog(kind).find(x=>String(x.id)===select.value);if(c)draftSkills.set(member.id,{mode:kind,value:String(c.id),score:c.score});});
        return select;
    }
    function renderList(container,title){container.replaceChildren();make('h3',title,container);return make('ul','',container);}
    function memberName(membersById,id){return membersById.get(id)?.display_name||'Người chơi';}
    function currentWithDraft(data){return selectedPlayers(data).map(p=>{const d=draftSkills.get(p.id);return d?{...p,skill_mode:d.mode,skill_value:d.value,skill_score:d.score}:p;});}
    function render(next){
        state=next;
        onStateChange(state);
        if(previousUser!==state.user?.id){nickname.value='';manual.value='';previousUser=state.user?.id;draftSkills.clear();}
        message.textContent=state.error||(state.busy?'Đang lưu…':state.loading?'Đang tải…':state.data?'Đã đồng bộ trạng thái.':'Nhập mã mời hoặc tạo Room.');
        connection.textContent=state.roomId?`Kết nối: ${state.connection==='SUBSCRIBED'?'Realtime':state.connection==='idle'?'chờ đăng nhập':'đang kết nối lại; tự tải lại mỗi 15 giây'}`:'';
        loginBtn.hidden=!!state.user;createBtn.hidden=!state.user;joinBtn.hidden=!state.user;refreshBtn.hidden=!state.roomId;stopBtn.hidden=!state.roomId;
        actions.hidden=hostControls.hidden=lists.hidden=modeWrap.hidden=memberToggle.hidden=!state.data;
        for(const b of root.querySelectorAll('button'))b.disabled=state.busy;
        if(!state.data){heading.textContent='Open Match Room';lastData=null;draftScope=null;draftSkills.clear();waiting.replaceChildren();selected.replaceChildren();members.replaceChildren();return;}
        const d=state.data,r=d.room,host=r.host_user_id===state.user?.id,open=r.status==='open',preparing=r.current_round_state==='preparing';
        const nextDraftScope=`${r.id}:${r.current_round_no}`;
        if(draftScope!==null&&draftScope!==nextDraftScope)draftSkills.clear();
        draftScope=nextDraftScope;
        heading.textContent=`Room · Lượt ${r.current_round_no} · ${r.status} / ${r.current_round_state}`;invite.value=r.invite_code;
        hostControls.hidden=!host||!open;modeWrap.hidden=!host||!open;memberToggle.hidden=!host||!open;
        const mine=d.members.find(m=>m.user_id===state.user?.id), active=d.queue.filter(q=>['waiting','selected'].includes(q.status));
        const myEntry=active.find(q=>q.member_id===mine?.id);
        joinBtn.disabled=state.busy||!open||mine?.status==='active';continueBtn.hidden=mine?.status!=='active'||!!myEntry||!open;
        startBtn.disabled=state.busy||!preparing||d.currentPlayers.length!==10||d.currentPlayers.some(p=>!p.team);endBtn.disabled=state.busy||r.current_round_state!=='active';
        if(d.currentPlayers[0]?.skill_mode)mode.value=d.currentPlayers[0].skill_mode;
        const changed=JSON.stringify(d)!==lastData;if(!changed)return;lastData=JSON.stringify(d);
        const names=new Map(d.members.map(m=>[m.id,m]));
        const activeQueueMembers=new Set(d.queue.filter(x=>['waiting','selected'].includes(x.status)).map(x=>x.member_id));
        const q=d.queue.filter(x=>x.status==='waiting').sort((a,b)=>Number(a.queue_seq)-Number(b.queue_seq));
        const qu=renderList(waiting,`Đang chờ · FIFO (${q.length})`);
        q.forEach((x,i)=>{const li=make('li',`${i+1}. ${memberName(names,x.member_id)}${x.member_id===mine?.id?' (Bạn)':''}`,qu);if(host&&open)skillControl(names.get(x.member_id)||{id:x.member_id},null,host,li);});
        const su=renderList(selected,`Đã chọn (${d.currentPlayers.length}/10)`);
        for(const p of currentWithDraft(d)){const m=names.get(p.id)||{id:p.id,display_name:p.name};const li=make('li',`${p.name} · ${p.team?`Đội ${p.team.toUpperCase()}`:'Chưa chia đội'}`,su);if(host&&open)skillControl(m,p,host,li);if(host&&open&&preparing){const replace=button('↔',()=>{if(confirm('Thay người này bằng người đầu hàng chờ?'))void controller.run('replacePlayer',target,r.version,p.id);},li);replace.title='Replace';replace.setAttribute('aria-label','Replace người chơi');}}
        const mu=renderList(members,'Thành viên');
        d.members.forEach(m=>{const li=make('li',`${m.display_name} · ${m.user_id?'Account':'Host-added'} · ${m.status}`,mu);if(host&&open&&m.status==='active'&&m.user_id!==state.user.id){const kick=button('×',()=>{if(confirm(`Kick ${m.display_name}?`))void controller.run('hostKickMember',target,m.id);},li);kick.title='Kick';kick.setAttribute('aria-label',`Kick ${m.display_name}`);if(!m.user_id&&!activeQueueMembers.has(m.id)&&r.current_round_state==='ended'){const requeue=button('↻',()=>void controller.run('hostRequeuePlayer',target,m.id),li);requeue.title='Đưa lại vào hàng chờ';requeue.setAttribute('aria-label',`Đưa ${m.display_name} lại vào hàng chờ`);}}});
    }
    mode.addEventListener('change',()=>{draftSkills.clear();lastData=null;if(state?.data)render({...state,data:state.data});});
    controller.open(target);
    return {
        setAuthState:s=>controller.setUser(s.user),setMode:active=>{roomMode=Boolean(active);},
        setSkillMode:kind=>{if(kind==='tier'||kind==='rank'){mode.value=kind;draftSkills.clear();lastData=null;if(state?.data)render({...state,data:state.data});}},
        isActive:()=>roomMode,
        getSelectedPlayers:()=>controller.getState().data?currentWithDraft(controller.getState().data):[],
        getSelectedCount:()=>{const d=controller.getState().data;return d?d.currentPlayers.length:0;},
        getWaitingCount:()=>{const d=controller.getState().data;return d?d.queue.filter(q=>q.status==='waiting'&&d.members.some(m=>m.id===q.member_id&&m.status==='active')).length:0;},
        getRoundState:()=>controller.getState().data?.room.current_round_state||null,
        prepareForDraw:async()=>{const s=controller.getState();if(!s.data)return false;if(['idle','ended'].includes(s.data.room.current_round_state))return Boolean(await controller.run('prepareNextRound',s.roomId));return s.data.room.current_round_state==='preparing';},
        persistDrawResult:result=>{const s=controller.getState();if(!s.data)return false;const teams=new Map([...result.teamA.map(p=>[p.id,'a']),...result.teamB.map(p=>[p.id,'b'])]);const random=result.balanceMode==='random';return controller.run('saveLineup',s.roomId,s.data.room.version,currentWithDraft(s.data).map(p=>({...p,team:teams.get(p.id)||p.team,skill_mode:random?'random':p.skill_mode,skill_value:random?null:p.skill_value,skill_score:random?null:p.skill_score})));},
        swapRoomPlayers:(a,b)=>{const s=controller.getState();if(!s.data||s.data.room.current_round_state!=='preparing')return false;return controller.run('saveLineup',s.roomId,s.data.room.version,swapLineup(currentWithDraft(s.data),a,b));},
        startRound:()=>controller.run('startRound',target),
        destroy:controller.destroy,controller
    };
}
