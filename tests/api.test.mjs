import { spawn } from 'node:child_process';

import assert from 'node:assert/strict';

const port=3137;

const child=spawn(process.execPath,['dist/server.cjs'],{env:{...process.env,NODE_ENV:'production',PORT:String(port),GOOGLE_SERVICE_ACCOUNT_JSON:'',SUPABASE_URL:'',VITE_SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:'pipe'});

let output=''; child.stderr.on('data', chunk => { output += String(chunk); });
try {

 await new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(new Error('Server startup timeout: '+output)),60000); child.stdout.on('data',chunk=>{if(String(chunk).includes('Server running')) {clearTimeout(timer);resolve();}}); child.on('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));}); });

 for(const [method,path] of [['GET','drive/files'],['GET','drive/quota'],['POST','drive/upload'],['DELETE','drive/files/example'],['PATCH','drive/files/example'],['GET','vault'],['POST','vault/example/reveal']]) {

  const response=await fetch(`http://localhost:${port}/api/${path}`,{method});

  assert.equal(response.status,401,method+' '+path);

 }

 const invalid=await fetch(`http://localhost:${port}/api/drive/files`,{headers:{Authorization:'Bearer fake'}});

 assert.equal(invalid.status,503);

 console.log('PASS all Drive/vault routes reject anonymous requests; missing configuration fails closed');

} finally { child.kill(); }

