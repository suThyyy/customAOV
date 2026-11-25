// Read-only comparison. Usage: node tests/compare-production-room-source.mjs exact-export.json
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const md5 = value => createHash('md5').update(value).digest('hex');
const exported = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rows = Array.isArray(exported) && exported.length === 1 && exported[0].exact_source_export
  ? exported[0].exact_source_export : exported.exact_source_export ?? exported;
const baseline = new Map(readFileSync(new URL('../docs/export.md',import.meta.url),'utf8')
  .split(/\r?\n/).filter(line=>line.includes('CREATE OR REPLACE FUNCTION')).map(line=>{
    const cells=line.split('|').map(x=>x.trim());
    return [cells[1],cells[3].replaceAll('<br>','\n').split('$function$')[1]];
  }));
assert.equal(rows.length,17,'Exactly 17 exported functions required');
const seen=new Set();
let unresolved=false;
for(const row of rows){
 const signature=row.signature.replace(/^public\./,'');
 assert.ok(baseline.has(signature) && !seen.has(signature),'Unknown or duplicate signature');
 seen.add(signature);
 const bytes=Buffer.from(row.source_utf8_base64,'base64');
 assert.equal(bytes.length,row.source_bytes,'Export byte length mismatch');
 assert.equal(md5(bytes),row.source_md5,'Export hash mismatch');
 const actual=bytes.toString('utf8');
 assert.deepEqual(Buffer.from(actual,'utf8'),bytes,'Invalid UTF-8');
 const prior=baseline.get(signature);
 const normalize=s=>s.replace(/\r\n/g,'\n');
 const difference=actual===prior?'EXACT':normalize(actual)===normalize(prior)
   ?'CRLF/LF difference only':'SOURCE DIFFERENCE: review required';
 // No whitespace stripping: spaces/newlines inside SQL literals can be meaningful.
 if(difference.startsWith('SOURCE')) unresolved=true;
 console.log(JSON.stringify({signature,actual_md5:row.source_md5,markdown_md5:md5(prior),difference}));
}
if(unresolved) process.exitCode=1;
