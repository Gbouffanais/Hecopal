import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
test('Google OAuth usa PKCE y regresa a la aplicación sin pedir acceso offline',async()=>{
 const cache=new Map();
 const client=createClient('https://example.supabase.co','publishable-example',{auth:{flowType:'pkce',autoRefreshToken:false,detectSessionInUrl:false,persistSession:true,storage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.delete(k)}}});
 const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:'http://localhost:3000/',skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
 assert.equal(error,null);
 const url=new URL(data.url);assert.equal(url.pathname,'/auth/v1/authorize');
 assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('redirect_to'),'http://localhost:3000/');
 assert.equal(url.searchParams.get('code_challenge_method'),'s256');assert.ok(url.searchParams.get('code_challenge'));assert.equal(url.searchParams.get('access_type'),null);
 assert.ok([...cache.keys()].some(k=>k.includes('code-verifier')));
});


