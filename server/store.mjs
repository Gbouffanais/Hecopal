import {readFileSync} from 'node:fs';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import pg from 'pg';
import {seed} from './domain.mjs';
export class DemoStore{
 constructor(file){this.file=file;this.queue=Promise.resolve()}
 async read(){try{return JSON.parse(await readFile(this.file,'utf8'))}catch(e){if(e.code==='ENOENT')return seed();throw e}}
 async account(u){return u}
 transaction(fn){const task=this.queue.then(async()=>{const s=await this.read(),result=await fn(s);await mkdir(dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(s));await rename(this.file+'.tmp',this.file);return result});this.queue=task.catch(()=>{});return task}
}
export class SupabaseStore{
 constructor(url){const connection=new URL(url);for(const option of ['sslmode','sslrootcert','sslcert','sslkey'])connection.searchParams.delete(option);const ssl={rejectUnauthorized:true};if(process.env.DATABASE_SSL_CA)ssl.ca=readFileSync(process.env.DATABASE_SSL_CA,'utf8');this.pool=new pg.Pool({connectionString:connection.toString(),ssl,max:5,connectionTimeoutMillis:10000})}
 async read(){const {rows}=await this.pool.query('select value from hecopal.state where id=1');if(!rows[0])throw Error('Ejecuta database/schema.sql');return rows[0].value}
 async account(u){const {rows}=await this.pool.query("insert into hecopal.accounts(id,name) values($1,$2) on conflict(id) do update set name=excluded.name returning id,name,role",[u.id,u.email]);return rows[0]}
 async transaction(fn){const c=await this.pool.connect();try{await c.query('begin');const {rows}=await c.query('select value from hecopal.state where id=1 for update');if(!rows[0])throw Error('Ejecuta database/schema.sql');const s=rows[0].value,result=await fn(s);await c.query('update hecopal.state set value=$1 where id=1',[JSON.stringify(s)]);await c.query('commit');return result}catch(e){await c.query('rollback');throw e}finally{c.release()}}
}


