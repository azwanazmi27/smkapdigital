import dashboardHtml from "../../dashboard-pbd/dashboard-pbd.html?raw";
import { portalActor } from "../../server-auth";
import { inlineJson, pbdAccess, PBD_STORAGE_KEY, readPbdSnapshot } from "../../lib/dashboard-pbd";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" };

function messagePage(title: string, text: string, status: number) {
  const html = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard PBD · ${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;font-family:system-ui,sans-serif;background:#141317;color:#f4f2f0;text-align:center}main{max-width:420px}h1{font-size:20px;margin:0 0 8px}p{margin:0;color:#a8a3a6;line-height:1.5}</style></head><body><main><h1>${title}</h1><p>${text}</p></main></body></html>`;
  return new Response(html, { status, headers: { ...noStore, "Content-Type": "text/html; charset=utf-8" } });
}

// Ayat asal app menyatakan data hanya dalam pelayar. Dalam portal, data dikongsi melalui pelayan sekolah.
const wording: [string, string][] = [
  ["Semua data diproses dalam pelayar ini sahaja. Tiada fail dihantar ke mana-mana pelayan, dan nombor MyKid/IC tidak disimpan", "Data disimpan dalam Portal SMKAP Digital dan hanya dibuka oleh warga sekolah yang log masuk. Nombor MyKid/IC tidak disimpan"],
  ["'disimpan dalam pelayar ini sahaja'", "'disimpan dalam Portal SMKAP Digital'"],
  ["Semua fail diproses dalam pelayar ini. Tiada data dihantar ke internet.", "Fail Excel dibaca dalam pelayar, kemudian hasilnya disimpan dalam Portal SMKAP Digital supaya semua guru melihat data yang sama. Hanya warga sekolah yang log masuk boleh membukanya."],
  ["Data kekal dalam pelayar ini sehingga dipadam.", "Data kekal dalam portal sehingga dipadam."],
  ["'Guna komputer dan pelayar yang sama', 'Data hanya kelihatan dalam pelayar dan komputer tempat ia diimport. Jangan guna mod Incognito/InPrivate.'", "'Data dikongsi dalam portal', 'Data yang diimport kelihatan kepada semua guru yang membuka Dashboard PBD dalam portal, pada mana-mana peranti.'"],
  ["'Data disimpan dalam komputer ini sahaja', 'Tiada data dihantar ke internet. Data kekal walaupun Chrome ditutup atau komputer dimatikan.'", "'Data disimpan dalam portal sekolah', 'Data kekal dalam Portal SMKAP Digital dan boleh dibuka daripada mana-mana peranti selepas log masuk.'"],
  // Mesej alu-aluan dan panduan pemasangan untuk versi fail tunggal.
  ["'Simpan fail ini di folder tetap', 'Contohnya Documents → Dashboard PBD. Sentiasa buka fail dari folder yang sama dengan Chrome atau Edge.'", "'Buka melalui Portal SMKAP Digital', 'Guru & Staf → Pentaksiran dan Peperiksaan → Arus Perdana → Dashboard PBD. Tiada fail perlu disimpan.'"],
  ["'Jangan padam data pelayar / jangan guna Incognito', 'Memadam \"Cookies and site data\" atau mod Incognito akan memadam data dashboard.'", "'Satu data untuk seluruh sekolah', 'Semua guru melihat data yang sama. Hanya pentadbir yang diberi akses Dashboard PBD boleh import atau padam data.'"],
  ["Tiada pemasangan perisian. Dashboard ialah satu fail.", "Tiada pemasangan. Dashboard dibuka terus dalam Portal SMKAP Digital."],
  ["'Simpan fail di tempat tetap', 'Pindahkan fail dashboard dari Downloads/WhatsApp ke folder tetap, contohnya <b>Documents → Dashboard PBD</b>. Selepas itu sentiasa buka fail dari folder yang sama.'", "'Log masuk ke Portal SMKAP Digital', 'Guna akaun DELIMa (<b>@moe-dl.edu.my</b>) seperti biasa.'"],
  ["'Buka dengan Google Chrome atau Microsoft Edge', 'Klik dua kali pada fail. Jika terbuka dalam pelayar lain: klik kanan pada fail → <b>Open with / Buka dengan</b> → Google Chrome.'", "'Buka modul Dashboard PBD', '<b>Guru & Staf → Pentaksiran dan Peperiksaan → Arus Perdana → Dashboard PBD</b>, atau cari \"PBD\" di halaman utama.'"],
];

// Jambatan storan: app asal membaca/menulis localStorage["dashboardPBD_v1"] secara segerak.
// Kunci itu dipintas supaya data datang daripada portal dan setiap perubahan dihantar semula.
const bridge = String.raw`(function(){
var B=window.__PBD_PORTAL__||{},KEY=B.key,mem=B.data,version=B.version||"",canEdit=!!B.canEdit;
var synced=mem,timer=0,inflight=false,again=false,conflict=false,pill=null,hideTimer=0;
var ls=null;try{ls=window.localStorage;}catch(e){}
window.addEventListener("message",function(e){if(e.origin===location.origin&&e.data&&e.data.type==="SMKAP_IDENTITY")window.__SMKAP_IDENTITY=e.data.user;});
function strip(v){var p=window.PRESET;return v&&p&&p.logo&&v.indexOf(p.logo)>=0?v.split(p.logo).join(""):v;}
var P=Storage.prototype,g=P.getItem,s=P.setItem,r=P.removeItem;
function own(st,k){return k===KEY&&ls&&st===ls;}
var UIKEY=KEY+"_portal_ui";
function uiFlags(){try{return JSON.parse(g.call(ls,UIKEY)||"{}")||{};}catch(e){return {};}}
function withFlags(v){var f=uiFlags();if(!f.welcomed&&!f.tourDone)return v;try{var o=v?JSON.parse(v):{sets:[]};if(f.welcomed)o.welcomed=true;if(f.tourDone)o.tourDone=true;return JSON.stringify(o);}catch(e){return v;}}
function keepFlags(v){try{var o=JSON.parse(v),f=uiFlags(),n={welcomed:!!(o.welcomed||f.welcomed),tourDone:!!(o.tourDone||f.tourDone)};if(n.welcomed!==!!f.welcomed||n.tourDone!==!!f.tourDone)s.call(ls,UIKEY,JSON.stringify(n));}catch(e){}}
P.getItem=function(k){return own(this,k)?withFlags(mem):g.apply(this,arguments);};
P.setItem=function(k,v){if(!own(this,k))return s.apply(this,arguments);mem=String(v);keepFlags(mem);changed();};
P.removeItem=function(k){if(!own(this,k))return r.apply(this,arguments);mem=null;changed();};
function ui(){if(pill||!document.body)return pill;pill=document.createElement("div");pill.setAttribute("role","status");pill.setAttribute("aria-live","polite");pill.style.cssText="position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:8px;align-items:center;max-width:calc(100vw - 24px);padding:8px 12px;border-radius:999px;background:rgba(20,19,23,.9);color:#f4f2f0;font:500 12.5px/1.3 Outfit,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:opacity .25s";document.body.appendChild(pill);return pill;}
function show(text,keep,actions){var el=ui();if(!el)return;clearTimeout(hideTimer);el.textContent=text;el.style.opacity="1";(actions||[]).forEach(function(a){var b=document.createElement("button");b.type="button";b.textContent=a[0];b.style.cssText="border:0;border-radius:999px;padding:5px 10px;background:#f4f2f0;color:#141317;font:600 12px Outfit,system-ui,sans-serif;cursor:pointer";b.onclick=a[1];el.appendChild(b);});if(!keep)hideTimer=setTimeout(function(){el.style.opacity="0";},2600);}
function changed(){if(strip(mem)===strip(synced))return;if(!canEdit){show("Mod lihat sahaja · perubahan anda tidak disimpan ke portal",true);return;}if(conflict)return;clearTimeout(timer);timer=setTimeout(flush,1200);}
function flush(force){timer=0;if(inflight){again=true;return;}var body=strip(mem);if(!force&&body===strip(synced))return;inflight=true;show("Menyimpan ke portal…",true);
fetch("/api/dashboard-pbd/data",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({baseVersion:force?"*":version,data:body})}).then(function(res){return res.json().catch(function(){return {};}).then(function(j){
if(res.ok){version=j.version||version;synced=body;show("✓ Disimpan dalam portal");return;}
if(res.status===409){conflict=true;show("Data telah dikemas kini oleh "+(j.updatedBy||"pengguna lain")+".",true,[["Muat semula",function(){location.reload();}],["Simpan versi saya",function(){conflict=false;flush(true);}]]);return;}
if(res.status===403){canEdit=false;show(j.error||"Anda hanya boleh melihat Dashboard PBD.",true);return;}
if(res.status===401){show("Sesi tamat. Log masuk semula ke portal untuk menyimpan.",true);return;}
throw new Error(j.error||"Gagal");});}).catch(function(e){show("Belum disimpan: "+(e&&e.message?e.message:"semak sambungan")+" · cuba semula…",true);clearTimeout(timer);timer=setTimeout(flush,10000);}).then(function(){inflight=false;if(again&&!conflict){again=false;flush();}});}
window.addEventListener("beforeunload",function(e){if(canEdit&&!conflict&&(timer||inflight)){e.preventDefault();e.returnValue="";}});
document.addEventListener("DOMContentLoaded",function(){if(!canEdit)show("Mod lihat sahaja · hubungi pentadbir untuk akses import data",false);});
})();`;

export async function GET(request: Request) {
  try {
    const actor = await portalActor(request);
    if (!actor) return messagePage("Sila log masuk", "Buka Dashboard PBD melalui Portal SMKAP Digital selepas log masuk dengan akaun DELIMa.", 401);
    const access = await pbdAccess(actor);
    if (!access.canView) return messagePage("Akses tidak dibenarkan", "Akaun anda tidak mempunyai akses ke Dashboard PBD.", 403);
    const snapshot = await readPbdSnapshot();
    const boot = `<script>window.__PBD_PORTAL__=${inlineJson({ key: PBD_STORAGE_KEY, data: snapshot.data, version: snapshot.version, updatedAt: snapshot.updatedAt, updatedBy: snapshot.updatedBy, canEdit: access.canEdit, user: { name: actor.name, email: actor.email } })};</script><script>${bridge}</script>`;
    let html = dashboardHtml;
    for (const [from, to] of wording) html = html.split(from).join(to);
    const marker = '<meta charset="utf-8">';
    html = html.includes(marker) ? html.replace(marker, `${marker}\n${boot}`) : html.replace(/<head[^>]*>/i, (head) => `${head}\n${boot}`);
    return new Response(html, { headers: { ...noStore, "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "SAMEORIGIN" } });
  } catch (error) {
    console.error("Dashboard PBD page", error);
    return messagePage("Dashboard PBD belum dapat dibuka", "Sila cuba semula sebentar lagi.", 500);
  }
}
