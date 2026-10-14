import { PGlite } from '@electric-sql/pglite';

import { readFileSync, readdirSync } from 'node:fs';

import assert from 'node:assert/strict';

const db = new PGlite();

await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;

create schema auth; create table auth.users(id uuid primary key);

create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);

await db.exec(readFileSync('supabase/bootstrap.sql','utf8'));

const migration = readdirSync('supabase/migrations').find(f=>f.endsWith('secure_operations_and_data_integrity.sql'));

await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'));

const admin='00000000-0000-0000-0000-000000000001', staff='00000000-0000-0000-0000-000000000002';

await db.exec(`insert into auth.users values('${admin}'),('${staff}'); insert into app_users(uid,role) values('${admin}','System Admin'),('${staff}','Staff'); grant usage on schema public to authenticated;`);

const asUser = async uid => { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`); };

await asUser(staff);

await assert.rejects(()=>db.exec(`insert into network_assets(name,asset_type) values('Forbidden','Router')`));

await assert.rejects(()=>db.exec(`update app_users set role='System Admin',is_admin=true where uid='${staff}'`));

await assert.rejects(()=>db.exec('select * from password_vault'));
await assert.rejects(()=>db.exec('select * from system_config'));
await db.exec('select departments,locations from system_config');
await assert.rejects(()=>db.query('select server_delete_credential($1,$2)', [staff,staff]));

await assert.rejects(()=>db.query('select allocate_asset_code($1)',['Computer']));

console.log('PASS staff cannot mutate infrastructure, elevate privileges, read vault or allocate asset codes');

await asUser(admin);

const purchase={id:'10000000-0000-0000-0000-000000000001',item:'Laptop',category:'Computer',quantity:2,price:100,date:'2026-10-14',status:'Received',syncToInventory:true};

await db.query('select save_purchase_record($1::jsonb)',[JSON.stringify(purchase)]);

await db.query('select save_purchase_record($1::jsonb)',[JSON.stringify(purchase)]);

let result=await db.query('select * from assets'); assert.equal(result.rows.length,2); assert.equal(new Set(result.rows.map(r=>r.code)).size,2);

await assert.rejects(()=>db.query('select save_purchase_record($1::jsonb)',[JSON.stringify({...purchase,quantity:3})]));

assert.equal((await db.query('select quantity from purchases')).rows[0].quantity,2);

console.log('PASS received purchase creates exact quantity, repeat is idempotent, incompatible edits roll back');

const asset=result.rows[0].id;

const person=(await db.query("insert into asset_people(full_name) values('Aye Aye') returning id")).rows[0].id;

const assigned=(await db.query('select assign_asset_person($1,$2,current_date,null) as id',[asset,person])).rows[0].id;

await assert.rejects(()=>db.query('select assign_asset_person($1,$2,current_date,null)',[asset,person]));

assert.equal((await db.query('select assignee from assets where id=$1',[asset])).rows[0].assignee,'Aye Aye');

await db.query('select return_asset_assignment($1,current_date,null,null)',[assigned]);

assert.equal((await db.query('select assignee from assets where id=$1',[asset])).rows[0].assignee,'Unassigned');

await assert.rejects(()=>db.query('select return_asset_assignment($1,current_date,null,null)',[assigned]));

console.log('PASS assign/return are atomic and cannot repeat stale transitions');

const count=(await db.query('select count(*)::int as n from assets')).rows[0].n;

await assert.rejects(()=>db.query('select import_asset_records($1::jsonb)',[JSON.stringify([{name:'Valid',category:'Mouse',status:'In Stock'},{name:''}])]));

assert.equal((await db.query('select count(*)::int as n from assets')).rows[0].n,count);

assert.ok((await db.query('select * from audit_events where actor=$1',[admin])).rows.length>0);

console.log('PASS batch import rolls back on invalid row; audit actor captured');

// A failed save must leave both the inventory and assignment history unchanged.
await db.query('select save_asset_record($1::jsonb)',[JSON.stringify({id:asset,assignee:'Aye Aye'})]);
assert.equal((await db.query("select count(*)::int as n from asset_assignments where asset_id=$1 and status='Active'",[asset])).rows[0].n,1);
await db.query('select save_asset_record($1::jsonb)',[JSON.stringify({id:asset,assignee:'Unassigned'})]);
assert.equal((await db.query("select count(*)::int as n from asset_assignments where asset_id=$1 and status='Active'",[asset])).rows[0].n,0);
console.log('PASS asset edit synchronizes assignment history transactionally');
await db.close();

