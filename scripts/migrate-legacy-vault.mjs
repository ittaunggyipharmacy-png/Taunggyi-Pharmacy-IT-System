// Run once on the server after configuring the encryption key and database migration.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
const key=Buffer.from(process.env.VAULT_ENCRYPTION_KEY||'', 'base64');
if(key.length!==32) throw new Error('VAULT_ENCRYPTION_KEY must decode to 32 bytes');
const db=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const seal=value=>{const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);const bytes=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return ['v1',iv.toString('base64'),cipher.getAuthTag().toString('base64'),bytes.toString('base64')].join(':');};
const {data:config,error}=await db.from('system_config').select('*').eq('id','main').maybeSingle();
if(error) throw error;
for (const [index,note] of (config?.passwordNotes||[]).entries()) {
 const hash=createHash('sha256').update('legacy-vault:'+String(note.id||index)+':'+note.label+':'+note.account).digest('hex').slice(0,32);
 const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}`;
 const {data:existing,error:readError}=await db.from('password_vault').select('id,value').eq('id',id).maybeSingle();
 if(readError) throw readError;
 if(existing) {
  let value=existing.value||'';
  if(value.startsWith('v1:')) {const [,iv,tag,ciphertext]=value.split(':');const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64'));decipher.setAuthTag(Buffer.from(tag,'base64'));value=Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64')),decipher.final()]).toString('utf8');}
  if(value!==(note.password||note.value||'')) throw new Error('Legacy credential conflicts with an existing migrated entry. Resolve before clearing legacy settings.');
 }
 if(!existing) { const {error}=await db.rpc('server_save_credential',{record:{id,label:note.label,account:note.account,value:seal(note.password||note.value||'')},actor:null}); if(error) throw error; }
}
// Compare-and-set prevents clearing concurrent legacy edits.
if(config?.passwordNotes?.length){const {error}=await db.from('system_config').update({passwordNotes:[]}).eq('id','main').eq('updated_at',config.updated_at).select('id');if(error) throw error;}
for(let offset=0;;offset+=500){
 const {data,error}=await db.from('password_vault').select('id,value').order('id').range(offset,offset+499);if(error) throw error;
 for(const entry of data||[]) if(entry.value && !entry.value.startsWith('v1:')) {const {error}=await db.from('password_vault').update({value:seal(entry.value)}).eq('id',entry.id).eq('value',entry.value);if(error) throw error;}
 if(!data||data.length<500) break;
}
console.log('Legacy credentials migrated; no plaintext values logged.');
