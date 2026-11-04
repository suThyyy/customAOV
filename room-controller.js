// No DOM, auth listener, or storage: snapshots always come from the database.
export function inviteLink(href, room) {
    const url = new URL(href);
    url.hash = '';
    url.search = '';
    url.searchParams.set('room', room.id);
    url.searchParams.set('invite', room.invite_code);
    return url.href;
}

export function selectedPlayers(snapshot) {
    const members = new Map(snapshot.members.map(m => [m.id, m]));
    return [...snapshot.currentPlayers].sort((a,b) => a.slot-b.slot).map(p => ({
        ...p, id: p.member_id, name: members.get(p.member_id)?.display_name || 'Người chơi',
        tier: Number(p.skill_value), rankTier: p.skill_value, active: true
    }));
}

export function generateLineup(core, players, mode, catalog, assignments) {
    if (players.length !== 10) throw new Error('Cần đủ 10 người được chọn.');
    const mapped = players.map(p => {
        const skill = catalog.find(c => String(c.id) === String(assignments[p.id]));
        if (!skill) throw new Error('Hãy chọn Tier/Rank cho từng người.');
        return {...p, skill_mode: mode, skill_value: String(skill.id), skill_score: skill.score};
    });
    const scores = Object.fromEntries(mapped.map(p => [p.id, p.skill_score]));
    const {teamA, teamB} = core.splitTierBalanced(mapped, scores, '50-50', Math.random, p => p.id);
    return [...teamA.map(p=>({...p,team:'a'})), ...teamB.map(p=>({...p,team:'b'}))];
}

export function swapLineup(players, first, second) {
    const a=players.find(p=>p.member_id===first), b=players.find(p=>p.member_id===second);
    if (!a?.team || !b?.team || a.team===b.team) throw new Error('Chọn hai người thuộc hai đội khác nhau.');
    return players.map(p=>({...p,team:p===a ? b.team : p===b ? a.team : p.team}));
}

export function createRoomController({api, subscribe, onChange=()=>{}}) {
    let epoch=0, cleanup=null, running=null, dirty=false;
    let state={user:null,roomId:null,data:null,busy:false,loading:false,error:null,connection:'idle'};
    const emit = patch => { state={...state,...patch}; onChange(state); };
    const reset = () => {
        epoch++; cleanup?.(); cleanup=null; running=null; dirty=false;
        emit({data:null,busy:false,loading:false,error:null,connection:'idle'});
    };
    const refresh = () => {
        if (!state.user || !state.roomId) return Promise.resolve();
        if (running) { dirty=true; return running; }
        const token=epoch, roomId=state.roomId;
        emit({loading:true});
        const task=(async()=>{
            do {
                dirty=false;
                try {
                    const result=await api.readSnapshot(roomId);
                    if(token!==epoch) return;
                    if(result.error) throw result.error;
                    emit({data:result.data?.room ? result.data : null,error:null});
                } catch(error) { if(token===epoch) emit({error:error.message,data:null}); }
            } while(dirty && token===epoch);
        })();
        running=task;
        void task.finally(()=>{if(token===epoch){running=null;emit({loading:false});}});
        return task;
    };
    const connect = () => {
        if(!state.user || !state.roomId) return;
        const token=epoch;
        cleanup=subscribe(state.roomId,()=>{if(token===epoch) void refresh();},status=>{
            if(token!==epoch) return;
            emit({connection:status});
            if(status==='SUBSCRIBED') void refresh();
        });
        void refresh();
    };
    const setUser = user => {
        const next=user?.is_anonymous ? null : user;
        if(state.user?.id===next?.id) return;
        reset(); emit({user:next || null}); connect();
    };
    const open = roomId => { reset();emit({roomId});connect(); };
    const run = async (method,...args) => {
        if(state.busy) return null;
        if(!state.user) {emit({error:'Đăng nhập tài khoản CustomAOV để tham gia.'});return null;}
        const token=epoch;
        emit({busy:true,error:null});
        try {
            const result=await api[method](...args);
            if(token!==epoch) return null;
            if(result.error) throw result.error;
            await refresh();
            if(token!==epoch) return null;
            return result.data ?? true;
        } catch(error) {if(token===epoch) emit({error:error.message});return null;}
        finally {if(token===epoch) emit({busy:false});}
    };
    return {setUser,open,refresh,run,getState:()=>state,destroy:()=>{reset();emit({user:null,roomId:null});}};
}

export function subscribeRoom(client, roomId, changed, status) {
    const channel=client.channel(`open-room:${roomId}`);
    for(const table of ['rooms','room_members','room_queue_entries','room_current_players']) {
        channel.on('postgres_changes',{event:'*',schema:'public',table,
            filter:`${table==='rooms'?'id':'room_id'}=eq.${roomId}`},changed);
    }
    channel.subscribe(status);
    // Reconcile missed events / removed membership even when Realtime RLS hides a delete.
    const timer=setInterval(changed,15000);
    return ()=>{clearInterval(timer);void client.removeChannel(channel);};
}
