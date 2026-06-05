// ===================== SHARED API =====================
const API = 'https://mathquest-api.energy-gaurav.workers.dev';

async function apiGet(path){
  try{ const r=await fetch(API+path); return await r.json(); }
  catch(e){ return null; }
}
async function apiPost(path, data){
  try{ const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); return await r.json(); }
  catch(e){ return null; }
}
async function apiDelete(path){
  try{ const r=await fetch(API+path,{method:'DELETE'}); return await r.json(); }
  catch(e){ return null; }
}