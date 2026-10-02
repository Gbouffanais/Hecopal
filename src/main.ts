import {bootstrapApplication} from '@angular/platform-browser';
import {Component,ChangeDetectorRef,inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {createClient,SupabaseClient} from '@supabase/supabase-js';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.html'})
class App implements OnInit{
 cdr=inject(ChangeDetectorRef);config:any={};client?:SupabaseClient;token='';user:any=null;tab='catalog';products:any[]=[];reservations:any[]=[];workspace:any={lots:[],products:[],invoices:[],audit:[]};notice='';error='';busy=false;grade='Todas';email='';password='';selected:any=null;kg=1;pickup=this.today();form:any={};file='';fileName='';
 today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
 filtroRefrigerador='Todos';
 get refrigerators():string[]{return [...new Set<string>(this.workspace.lots.map((l:any)=>l.fridge))]}
 get shownLots(){return this.workspace.lots.filter((l:any)=>this.filtroRefrigerador==='Todos'||l.fridge===this.filtroRefrigerador)}
 get staff(){return ['admin','employee'].includes(this.user?.role)}
 get shown(){return this.products.filter(p=>this.grade==='Todas'||p.grade===this.grade)}
 get available(){return this.products.reduce((n,p)=>n+p.available,0)}
 get stock(){return this.workspace.lots.reduce((n:number,l:any)=>n+l.kg,0)}
 get committed(){return this.workspace.lots.reduce((n:number,l:any)=>n+l.reserved,0)}
 get ready(){return this.workspace.lots.filter((l:any)=>l.stage==='Lista para venta').reduce((n:number,l:any)=>n+l.kg-l.reserved,0)}
 money(n:number){return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n)}
 label(id:string){const p=this.workspace.products.find((p:any)=>p.id===id);return p?p.name+' · '+p.grade:id}
 async request(path:string,body?:any){if(this.client){const {data}=await this.client.auth.getSession();this.token=data.session?.access_token||''}const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Bearer '+this.token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error);return data}
 async run(fn:()=>Promise<void>){if(this.busy)return;this.busy=true;this.error='';this.notice='';try{await fn()}catch(e:any){this.error=e.message||'No se pudo completar.'}finally{this.busy=false;this.cdr.markForCheck()}}
 async ngOnInit(){await this.run(async()=>{this.config=await this.request('config');if(!this.config.demo){this.client=createClient(this.config.supabaseUrl,this.config.supabaseKey,{auth:{flowType:'pkce'}});const {data,error}=await this.client.auth.getSession();if(error){this.tab='profile';throw Error('No se pudo completar el inicio de sesión. Inténtalo nuevamente.')}if(data.session){this.token=data.session.access_token;this.user=await this.request('me')}}await this.refresh()})}
 async refresh(){this.products=await this.request('catalog');if(this.user){this.reservations=await this.request('reservations');if(this.staff){this.workspace=await this.request('workspace');this.workspace.lots.sort((a:any,b:any)=>b.entered.localeCompare(a.entered))}}}
 demo(role:string){this.run(async()=>{const data=await this.request('demo-session',{role});this.token=data.token;this.user=await this.request('me');this.tab=role==='user'?'catalog':'inventory';await this.refresh()})}

 googleLogin(){this.run(async()=>{if(!this.client||!this.config.googleEnabled)throw Error('El acceso con Google estará disponible próximamente.');const {error}=await this.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/',queryParams:{prompt:'select_account'}}});if(error)throw error})}
 login(){this.run(async()=>{const {data,error}=await this.client!.auth.signInWithPassword({email:this.email,password:this.password});if(error)throw error;this.token=data.session.access_token;this.password='';this.user=await this.request('me');this.tab='catalog';await this.refresh()})}
 signup(){this.run(async()=>{const {error}=await this.client!.auth.signUp({email:this.email,password:this.password});if(error)throw error;this.notice='Cuenta solicitada. Revisa tu correo para confirmar y luego inicia sesión.'})}
 logout(){this.run(async()=>{if(this.client)await this.client.auth.signOut();this.token='';this.user=null;this.workspace={lots:[],products:[],invoices:[],audit:[]};this.reservations=[];this.tab='catalog'})}
 choose(p:any){if(!this.user){this.tab='profile';return}this.selected=p;this.kg=1;this.pickup=this.today()}
 reserve(){this.run(async()=>{await this.request('actions/reserve',{productId:this.selected.id,kg:this.kg,pickup:this.pickup});this.selected=null;await this.refresh();this.tab='reservations';this.notice='Reserva guardada. Paga al retirar en el puesto.'})}
 action(kind:string,body:any){this.run(async()=>{await this.request('actions/'+kind,body);await this.refresh();this.form={};this.file='';this.fileName='';this.notice='Cambio guardado.'})}
 price(p:any){const value=prompt('Nuevo precio por kilo (CLP)',p.price);if(value!==null)this.action('price',{id:p.id,price:Number(value)})}
 editLot(l:any){const kg=prompt('Kilos totales restantes',l.kg);if(kg===null)return;const ready=prompt('Fecha estimada de venta (AAAA-MM-DD)',l.ready);if(ready===null)return;const stage=prompt('Estado: Lista para venta, En maduración o Refrigerada',l.stage);if(stage===null)return;const reason=prompt('Motivo de la corrección');if(reason)this.action('lot-edit',{id:l.id,kg:Number(kg),ready,stage,reason})}
 voidInvoice(i:any){const reason=prompt('Motivo de anulación (se conserva el original)');if(reason)this.action('invoice-void',{id:i.id,reason})}
 saveInvoice(){this.action('invoice',Object.assign({},this.form,{file:this.file}))}
 async attach(event:Event){const file=(event.target as HTMLInputElement).files?.[0];this.file='';this.fileName='';if(!file)return;if(file.size>5000000){this.error='Máximo 5 MB.';return}const reader=new FileReader();reader.onload=()=>{this.file=String(reader.result).split(',')[1];this.fileName=file.name;this.cdr.markForCheck()};reader.readAsDataURL(file)}
 download(i:any){this.run(async()=>{const response=await fetch('/api/invoices/'+i.id+'/file',{headers:{Authorization:'Bearer '+this.token}});if(!response.ok)throw Error('No se pudo descargar el original.');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download='factura-'+i.number+(i.mime==='application/pdf'?'.pdf':i.mime==='image/png'?'.png':'.jpg');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)})}
}
bootstrapApplication(App).catch(console.error);




