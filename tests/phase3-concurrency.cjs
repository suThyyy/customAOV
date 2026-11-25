const assert = require('node:assert/strict');
const {mkdtempSync} = require('node:fs');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {randomUUID} = require('node:crypto');
const {setup} = require('./phase3-postgres.cjs');
async function run() {
 const Embedded = require('embedded-postgres').default;
 const cluster = new Embedded({databaseDir:mkdtempSync(join(tmpdir(),'customaov-pg-')),port:58439,
  user:'postgres',password:randomUUID(),persistent:true,initdbFlags:['--encoding=UTF8'],postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{}});
 await cluster.initialise();
 await cluster.start();
 const clients=[];
 try {
  for(let i=0;i<2;i++) {
   const c=cluster.getPgClient('postgres','127.0.0.1'); await c.connect(); clients.push(c);
  }
  const [a,b]=clients;
  await setup({exec:sql=>a.query(sql)});
  const account=randomUUID();
  await a.query('insert into auth.users values ($1)',[account]);
  await a.query('set role authenticated');
  await b.query("set role authenticated");
  await b.query("select set_config('test.uid',$1,false)",[account]);
  const r=(await a.query("select * from create_series_room('Race',3,'public','fun','random')")).rows[0];
  for(let i=0;i<49;i++) await a.query('select host_add_player_to_room($1,$2)',[r.id,'Guest '+i]);
  await a.query('begin');
  await a.query("select join_open_room($1,'Host account')",[r.invite_code]);
  const joinRace=assert.rejects(b.query("select join_open_room($1,'Account')",[r.invite_code]),/QUEUE_FULL/);
  await a.query('commit');
  await joinRace;
  const queuePosition=async()=> (await a.query("select max(queue_seq)::integer seq from room_queue_entries where room_id=$1",[r.id])).rows[0].seq;
  const before=await queuePosition();
  await a.query('select leave_open_room($1)',[r.id]);
  await a.query("select join_open_room($1,'Host again')",[r.invite_code]);
  assert.ok(await queuePosition()>before);
  await a.query('select prepare_next_open_room_round($1)',[r.id]);
  const version=(await a.query('select version from rooms where id=$1',[r.id])).rows[0].version;
  const target=(await a.query('select member_id from room_current_players where room_id=$1 order by slot',[r.id])).rows[0].member_id;
  const replace=c=>c.query('select replace_open_room_player($1,$2,$3)',[r.id,version,target]);
  await b.query("set test.uid='00000000-0000-0000-0000-000000000001'");
  await a.query('begin');await replace(a);
  const replaceRace=assert.rejects(replace(b),/refresh and retry/);
  await a.query('commit');await replaceRace;
  assert.equal((await a.query("select count(*) from room_queue_entries where room_id=$1 and status='selected'",[r.id])).rows[0].count,'10');
  console.log('Concurrent final-place join and same-version replace passed');
 } finally {
  await Promise.all(clients.map(c=>c.end()));await cluster.stop();
 }
}
run().catch(err=>{console.error(err);process.exitCode=1;});
