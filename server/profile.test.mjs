import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DemoStore} from './store.mjs';
import {createApp} from './index.mjs';
test('perfil propio persiste y no permite cambiar permisos o identidad',async()=>{
const dir=await mkdtemp(join(tmpdir(),'hecopal-profile-')),store=new DemoStore(join(dir,'state.json')),server=createApp({store}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const api=(path,token,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
try{
const data={name:'Carolina Pérez',phone:'+56 9 1234 5678',company:'Almacén',preferred_grade:'Primera'};
assert.equal((await api('me',null,data)).status,401);
const {token}=await(await api('demo-session',null,{role:'user'})).json();
for(const extra of [{role:'admin'},{id:'demo-admin'},{email:'otro@ejemplo.cl'}])assert.equal((await api('me',token,{...data,...extra})).status,400);
assert.equal((await api('me',token,{...data,name:''})).status,400);
assert.equal((await api('me',token,{...data,phone:'mal'})).status,400);
assert.equal((await api('me',token,data)).status,200);
const {token:second}=await(await api('demo-session',null,{role:'user'})).json();
const profile=await(await api('me',second)).json();
assert.equal(profile.name,data.name);assert.equal(profile.phone,data.phone);assert.equal(profile.role,'user');
const {token:admin}=await(await api('demo-session',null,{role:'admin'})).json();
assert.notEqual((await(await api('me',admin)).json()).name,data.name);
}finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}
});

