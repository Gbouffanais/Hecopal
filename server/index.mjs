import express from 'express';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {DemoStore,SupabaseStore} from './store.mjs';
import {Fault,catalog,mutate,staff} from './domain.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
export function createApp({store=new DemoStore(join(root,'data/demo.json')),demo=true,url='',key=''}={}){
 const app=express(),sessions=new Map(),auth=demo?null:createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 app.disable('x-powered-by');app.use(express.json({limit:'8mb'}));
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');if(req.method!=='GET'&&req.headers.origin){try{const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host&&!['localhost','127.0.0.1'].includes(origin.hostname))throw Error()}catch{return res.status(403).json({error:'Origen no permitido.'})}}next()});
 app.get('/api/config',(req,res)=>res.json({demo,supabaseUrl:url,supabaseKey:key}));
 app.post('/api/demo-session',(req,res)=>{if(!demo)throw new Fault('Demo desactivada.',404);const role=req.body.role;if(!['user','employee','admin'].includes(role))throw new Fault('Perfil inválido.');const token=randomUUID();sessions.set(token,{id:'demo-'+role,name:{user:'Cliente de ejemplo',employee:'Empleado de ejemplo',admin:'Administrador de ejemplo'}[role],role});res.json({token})});
 app.use('/api',async(req,res,next)=>{try{const token=req.headers.authorization?.replace(/^Bearer /,'');if(token){if(demo)req.user=sessions.get(token);else{const {data,error}=await auth.auth.getUser(token);if(error||!data.user)throw new Fault('Sesión inválida.',401);req.user=await store.account(data.user)}if(!req.user)throw new Fault('Sesión inválida.',401)}next()}catch(e){next(e)}});
 app.get('/api/catalog',async(req,res)=>res.json(catalog(await store.read())));
 app.get('/api/me',(req,res)=>{if(!req.user)throw new Fault('Inicia sesión.',401);res.json(req.user)});
 app.get('/api/reservations',async(req,res)=>{if(!req.user)throw new Fault('Inicia sesión.',401);const s=await store.read();res.json(s.reservations.filter(r=>staff(req.user)||r.userId===req.user.id))});
 app.get('/api/workspace',async(req,res)=>{if(!staff(req.user))throw new Fault('Acceso sólo para el equipo.',403);const s=await store.read();res.json({...s,invoices:s.invoices.map(({file,...i})=>i),audit:req.user.role==='admin'?s.audit:[]})});
 app.get('/api/invoices/:id/file',async(req,res)=>{if(!staff(req.user))throw new Fault('Acceso sólo para el equipo.',403);const i=(await store.read()).invoices.find(i=>i.id===req.params.id);if(!i)throw new Fault('Factura no encontrada.',404);res.setHeader('Content-Type',i.mime);res.setHeader('Content-Disposition','attachment; filename="factura-'+i.id+'.'+(i.mime==='application/pdf'?'pdf':i.mime==='image/png'?'png':'jpg')+'"');res.send(Buffer.from(i.file,'base64'))});
 app.post('/api/actions/:kind',async(req,res)=>res.json(await store.transaction(s=>mutate(s,req.user,req.params.kind,req.body))));
 app.use('/api',(req,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
 app.use(express.static(join(root,'dist/hecopal/browser')));
 app.get('/{*path}',(req,res)=>res.sendFile(join(root,'dist/hecopal/browser/index.html')));
 app.use((e,req,res,next)=>{if(!(e instanceof Fault))console.error(e.message);res.status(e.status||500).json({error:e instanceof Fault?e.message:'No se pudo completar la operación.'})});return app;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const configured=[process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,process.env.DATABASE_URL].filter(Boolean).length;if(configured!==0&&configured!==3)throw Error('Configura las tres variables de Supabase o deja todas vacías.');const demo=configured===0;if(demo&&process.env.NODE_ENV==='production')throw Error('Demo no permitida en producción.');
 createApp({demo,store:demo?new DemoStore(join(root,'data/demo.json')):new SupabaseStore(process.env.DATABASE_URL),url:process.env.SUPABASE_URL||'',key:process.env.SUPABASE_PUBLISHABLE_KEY||''}).listen(Number(process.env.PORT||3000),demo?'127.0.0.1':'0.0.0.0',()=>console.log('Hecopal http://localhost:'+(process.env.PORT||3000)+(demo?' — demo local':' — Supabase')));
}
