import {randomUUID} from 'node:crypto';
export class Fault extends Error{constructor(message,status=400){super(message);this.status=status}}
export const staff=u=>['admin','employee'].includes(u?.role);
const need=(ok,msg,status=400)=>{if(!ok)throw new Fault(msg,status)};
const num=(v,max=100000)=>{const n=Number(v);need(Number.isFinite(n)&&n>0&&n<=max&&Math.abs(n*100-Math.round(n*100))<1e-6,'Cantidad inválida. Usa hasta dos decimales.');return n};
const txt=v=>{need(typeof v==='string'&&v.trim().length>0&&v.length<500,'Completa el texto.');return v.trim()};
const dt=v=>{need(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Fecha inválida.');return v};
export const stages=['Lista para venta','En maduración','Refrigerada'];
export function seed(){return {products:['Primera','Segunda','Tercera'].map((grade,i)=>({id:'hass-'+(i+1),name:'Palta Hass',grade,price:3500-i*700,description:['Selección pareja para presentar y vender por unidad.','Variedad de tamaño y apariencia para el consumo diario.','Selección económica para preparaciones. Revisar condición del lote.'][i],active:true})),lots:[180,240,95].map((kg,i)=>({id:'lote-'+i,productId:'hass-'+(i+1),kg,reserved:0,fridge:'Refrigerador '+(i===1?2:1),entered:'2026-10-01',ready:'2026-10-0'+(i+4),stage:i===1?'En maduración':'Lista para venta'})),reservations:[],invoices:[],audit:[]}}
export function catalog(s){return s.products.filter(p=>p.active).map(p=>({...p,available:s.lots.filter(l=>l.productId===p.id&&l.stage===stages[0]).reduce((n,l)=>n+(Math.round(l.kg*100)-Math.round(l.reserved*100))/100,0)}))}
export function mutate(s,u,kind,b){
 need(u,'Inicia sesión.',401);if(kind!=='reserve')need(staff(u),'No tienes permiso.',403);
 const log=(action,details)=>s.audit.unshift({id:randomUUID(),at:new Date().toISOString(),actor:u.id,name:u.name,action,details:structuredClone(details)});
 const admin=()=>need(u.role==='admin','Sólo el administrador puede realizar esta operación.',403);
 const find=(arr,id)=>{const x=arr.find(x=>x.id===id);need(x,'Registro no encontrado.',404);return x};
 if(kind==='reserve'){
 const kg=num(b.kg),pickup=dt(b.pickup),p=find(s.products,b.productId);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 need(pickup>=today,'El retiro debe ser hoy o después.');need(p.active,'Producto no disponible.');
 const lots=s.lots.filter(l=>l.productId===p.id&&l.stage===stages[0]).sort((a,b)=>a.entered.localeCompare(b.entered)||a.id.localeCompare(b.id));
 need(lots.reduce((n,l)=>n+Math.round(l.kg*100)-Math.round(l.reserved*100),0)>=Math.round(kg*100),'No hay suficientes kilos disponibles.',409);
 let pending=Math.round(kg*100);const allocations=[];for(const l of lots){const take=Math.min(pending,Math.round(l.kg*100)-Math.round(l.reserved*100));if(take>0){l.reserved=(Math.round(l.reserved*100)+take)/100;pending-=take;allocations.push({lotId:l.id,kg:take/100})}}
 const r={id:randomUUID(),userId:u.id,customer:u.name,productId:p.id,product:p.name,grade:p.grade,kg,price:p.price,total:Math.round(kg*p.price),pickup,status:'Pendiente de retiro',allocations};s.reservations.unshift(r);log('Reserva creada',{id:r.id,kg});return r;
 }
 if(kind==='price'){const p=find(s.products,b.id),price=num(b.price);need(Number.isInteger(price),'Precio en pesos enteros.');const before=p.price;p.price=price;log('Precio actualizado',{id:p.id,before,after:price});return p}
 if(kind==='lot'){find(s.products,b.productId);const entered=dt(b.entered),ready=dt(b.ready);need(ready>=entered,'La fecha estimada debe ser posterior al ingreso.');need(stages.includes(b.stage),'Estado inválido.');const l={id:randomUUID(),productId:b.productId,fridge:txt(b.fridge),kg:num(b.kg),reserved:0,entered,ready,stage:b.stage};s.lots.unshift(l);log('Ingreso de lote',l);return l}
 if(kind==='lot-edit'){admin();const l=find(s.lots,b.id),kg=num(b.kg),ready=dt(b.ready),reason=txt(b.reason);need(kg>=l.reserved,'No puedes reducir los kilos reservados.');need(ready>=l.entered&&stages.includes(b.stage),'Fecha o estado inválido.');const before={...l};Object.assign(l,{kg,ready,stage:b.stage});log('Corrección de lote',{before,after:{...l},reason});return l}
 if(kind==='product'){admin();need(['Primera','Segunda','Tercera'].includes(b.grade),'Selección inválida.');const price=num(b.price);need(Number.isInteger(price),'Precio en pesos enteros.');const p={id:randomUUID(),name:txt(b.name),description:txt(b.description),grade:b.grade,price,active:true};s.products.push(p);log('Producto creado',p);return p}
 if(kind==='archive'){admin();const p=find(s.products,b.id);p.active=false;log('Producto retirado del catálogo',{id:p.id});return p}
 if(kind==='pickup'){const r=find(s.reservations,b.id);need(r.status==='Pendiente de retiro','Reserva ya procesada.',409);need(['Retirada y pagada','Cancelada'].includes(b.status),'Estado inválido.');for(const a of r.allocations){const l=find(s.lots,a.lotId);l.reserved=(Math.round(l.reserved*100)-Math.round(a.kg*100))/100;if(b.status==='Retirada y pagada')l.kg=(Math.round(l.kg*100)-Math.round(a.kg*100))/100}r.status=b.status;log('Reserva procesada',{id:r.id,status:r.status});return r}
 if(kind==='invoice'){
 const number=txt(b.number),supplier=txt(b.supplier),issued=dt(b.issued),total=num(b.total,1000000000);
 need(!s.invoices.some(i=>i.number===number&&i.supplier.toLowerCase()===supplier.toLowerCase()),'Factura ya registrada.',409);
 need(typeof b.file==='string'&&b.file.length>0&&b.file.length<7000000,'Adjunta el original (máximo 5 MB).');const f=Buffer.from(b.file,'base64');let mime;
 if(f.subarray(0,5).toString()==='%PDF-')mime='application/pdf';else if(f.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';else if(f[0]===255&&f[1]===216&&f[2]===255)mime='image/jpeg';need(mime,'Archivo PDF, PNG o JPG requerido.');
 const i={id:randomUUID(),number,supplier,issued,total,file:f.toString('base64'),mime,createdBy:u.id,at:new Date().toISOString(),status:'Registrada'};s.invoices.unshift(i);log('Factura registrada',{id:i.id,number,supplier,total});return {...i,file:undefined};
 }
 if(kind==='invoice-void'){admin();const i=find(s.invoices,b.id);need(i.status!=='Anulada','Ya está anulada.',409);const reason=txt(b.reason);i.status='Anulada';log('Factura anulada',{id:i.id,reason});return {...i,file:undefined}}
 throw new Fault('Operación desconocida.',404)
}


