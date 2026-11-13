import dashboardHtml from "../../dashboard-pbd/dashboard-pbd.html?raw";
import { portalActor } from "../../server-auth";
import { inlineJson, pbdAccess, PBD_STORAGE_KEY, readPbdSnapshot } from "../../lib/dashboard-pbd";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" };

// Halaman ringkas (log masuk / tiada akses) dalam warna teal portal, sama seperti Dashboard SPM.
function messagePage(title: string, text: string, status: number) {
  const html = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard PBD · ${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;font-family:system-ui,sans-serif;color:#edf7f5;background:#082c39;text-align:center}a{color:#78d7cd;font-weight:700}p{color:#9bb8bb;max-width:460px}</style></head><body><main><h1>${title}</h1><p>${text}</p><a href="/" target="_top">Kembali ke portal</a></main></body></html>`;
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
  ["'Jangan padam data pelayar / jangan guna Incognito', 'Memadam \"Cookies and site data\" atau mod Incognito akan memadam data dashboard.'", "'Satu data untuk seluruh sekolah', 'Semua guru melihat data yang sama. Hanya warga yang diberi akses edit boleh import atau padam data.'"],
  ["Tiada pemasangan perisian. Dashboard ialah satu fail.", "Tiada pemasangan. Dashboard dibuka terus dalam Portal SMKAP Digital."],
  ["'Simpan fail di tempat tetap', 'Pindahkan fail dashboard dari Downloads/WhatsApp ke folder tetap, contohnya <b>Documents → Dashboard PBD</b>. Selepas itu sentiasa buka fail dari folder yang sama.'", "'Log masuk ke Portal SMKAP Digital', 'Guna akaun DELIMa (<b>@moe-dl.edu.my</b>) seperti biasa.'"],
  ["'Buka dengan Google Chrome atau Microsoft Edge', 'Klik dua kali pada fail. Jika terbuka dalam pelayar lain: klik kanan pada fail → <b>Open with / Buka dengan</b> → Google Chrome.'", "'Buka modul Dashboard PBD', '<b>Guru & Staf → Pentaksiran dan Peperiksaan → Arus Perdana → Dashboard PBD</b>, atau cari \"PBD\" di halaman utama.'"],
];

// Jambatan storan: app asal membaca/menulis localStorage["dashboardPBD_v1"] secara segerak.
// Kunci itu dipintas supaya data datang daripada portal dan setiap perubahan dihantar semula.
// Seperti Dashboard SPM: warna tema, mod cerah/gelap, alu-aluan dan lawatan ialah pilihan peribadi (pelayar ini sahaja),
// jadi ia dibuang daripada data yang dihantar ke portal.
const bridge = String.raw`(function(){
var B=window.__PBD_PORTAL__||{},KEY=B.key,version=B.version||"",canEdit=!!B.canEdit;
var timer=0,inflight=false,again=false,conflict=false,pill=null,hideTimer=0,sedia=false;
// Simpanan automatik semasa app dimuatkan (pratetap, pembersihan data) hanya menyusun semula data yang sama: diserap, bukan dihantar.
window.__PBD_SEDIA=function(){sedia=true;};
var ls=null;try{ls=window.localStorage;}catch(e){}
window.addEventListener("message",function(e){if(e.origin===location.origin&&e.data&&e.data.type==="SMKAP_IDENTITY")window.__SMKAP_IDENTITY=e.data.user;});
var P=Storage.prototype,g=P.getItem,s=P.setItem,r=P.removeItem;
function own(st,k){return k===KEY&&ls&&st===ls;}
var UIKEY=KEY+"_portal_ui";
function pilihan(){try{return JSON.parse(g.call(ls,UIKEY)||"{}")||{};}catch(e){return {};}}
window.__PBD_PILIHAN=pilihan;
function baca(v){try{var o=JSON.parse(v);return o&&typeof o==="object"?o:null;}catch(e){return null;}}
function peribadi(v){var o=v&&baca(v);if(!o)return v;var f=pilihan();o.settings=o.settings||{};o.settings.tema=f.tema||"smkap";o.settings.gelap=f.gelap==="0"?"0":"";if(f.welcomed)o.welcomed=true;if(f.tourDone)o.tourDone=true;return JSON.stringify(o);}
// Satu kali parse: catat pilihan peribadi, kemudian pulangkan bentuk data untuk portal (tanpa pilihan peribadi dan logo pratetap).
function bentukPortal(v,catat){var o=v&&baca(v);if(!o)return v;var st=o.settings||{};
if(catat){var f=pilihan(),n={tema:st.tema||f.tema||"smkap",gelap:st.gelap==="0"?"0":"",welcomed:!!(o.welcomed||f.welcomed),tourDone:!!(o.tourDone||f.tourDone)};if(n.tema!==f.tema||n.gelap!==(f.gelap||"")||n.welcomed!==!!f.welcomed||n.tourDone!==!!f.tourDone){try{s.call(ls,UIKEY,JSON.stringify(n));}catch(e){}}}
delete st.tema;delete st.gelap;var p=window.PRESET;if(p&&p.logo&&st.logo===p.logo)delete st.logo;delete o.welcomed;delete o.tourDone;return JSON.stringify(o);}
var mem=B.data,synced=bentukPortal(B.data,false),hantar=synced;
P.getItem=function(k){return own(this,k)?peribadi(mem):g.apply(this,arguments);};
P.setItem=function(k,v){if(!own(this,k))return s.apply(this,arguments);mem=String(v);hantar=bentukPortal(mem,sedia);changed();};
P.removeItem=function(k){if(!own(this,k))return r.apply(this,arguments);mem=null;hantar='{"sets":[]}';changed();};
document.documentElement.setAttribute("data-palet",(pilihan().tema||"smkap")==="smkap"?"smkap":"");
// Dalam bingkai portal di telefon, position:fixed dalam iframe ikut bergerak semasa skrol. Seperti Dashboard SPM, kandungan
// menatal dalam .main dan bar menu menjadi baris biasa di bawahnya (lihat html.terbenam dalam gaya portal).
var TERBENAM=(function(){try{return window.self!==window.top;}catch(e){return true;}})();
if(TERBENAM)document.documentElement.classList.add("terbenam");
function penatal(){if(!TERBENAM)return null;var m=document.querySelector(".main");return m&&/(auto|scroll)/.test(getComputedStyle(m).overflowY)?m:null;}
window.__PBD_PENATAL=penatal;
["gesturestart","gesturechange","gestureend"].forEach(function(n){document.addEventListener(n,function(e){e.preventDefault();},{passive:false});});
document.addEventListener("touchmove",function(e){if(e.touches&&e.touches.length>1)e.preventDefault();},{passive:false});
var asalSkrol=window.scrollTo;
window.scrollTo=function(a,b){var m=penatal();if(m){if(a&&typeof a==="object")m.scrollTo(a);else m.scrollTop=b||0;return;}return asalSkrol.apply(window,arguments);};
function ui(){if(pill||!document.body)return pill;pill=document.createElement("div");pill.id="pbdPill";pill.setAttribute("role","status");pill.setAttribute("aria-live","polite");pill.style.cssText="position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;gap:8px;align-items:center;max-width:calc(100vw - 24px);padding:8px 12px;border-radius:999px;background:rgba(6,27,37,.92);color:#edf7f5;font:500 12.5px/1.3 Outfit,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:opacity .25s";document.body.appendChild(pill);return pill;}
function show(text,keep,actions){var el=ui();if(!el)return;clearTimeout(hideTimer);el.textContent=text;el.style.opacity="1";(actions||[]).forEach(function(a){var b=document.createElement("button");b.type="button";b.textContent=a[0];b.style.cssText="border:0;border-radius:999px;padding:5px 10px;background:#78d7cd;color:#062a2e;font:600 12px Outfit,system-ui,sans-serif;cursor:pointer";b.onclick=a[1];el.appendChild(b);});if(!keep)hideTimer=setTimeout(function(){el.style.opacity="0";},2600);}
function changed(){if(!sedia){synced=hantar;return;}if(hantar===synced)return;if(!canEdit){show("Lihat sahaja · perubahan anda tidak disimpan ke portal",false);return;}if(conflict)return;clearTimeout(timer);timer=setTimeout(flush,1200);}
function flush(force){timer=0;if(inflight){again=true;return;}var body=hantar;if(!force&&body===synced)return;inflight=true;show("Menyimpan ke portal…",true);
fetch("/api/dashboard-pbd/data",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({baseVersion:force?"*":version,data:body})}).then(function(res){return res.json().catch(function(){return {};}).then(function(j){
if(res.ok){version=j.version||version;synced=body;show("✓ Disimpan dalam portal");return;}
if(res.status===409){conflict=true;show("Data telah dikemas kini oleh "+(j.updatedBy||"pengguna lain")+".",true,[["Muat semula",function(){location.reload();}],["Simpan versi saya",function(){conflict=false;flush(true);}]]);return;}
if(res.status===403){canEdit=false;show(j.error||"Anda hanya boleh melihat Dashboard PBD.",true);return;}
if(res.status===401){show("Sesi tamat. Log masuk semula ke portal untuk menyimpan.",true);return;}
throw new Error(j.error||"Gagal");});}).catch(function(e){show("Belum disimpan: "+(e&&e.message?e.message:"semak sambungan")+" · cuba semula…",true);clearTimeout(timer);timer=setTimeout(flush,10000);}).then(function(){inflight=false;if(again&&!conflict){again=false;flush();}});}
window.__PBD_PAPAR=show;
window.addEventListener("beforeunload",function(e){if(canEdit&&!conflict&&(timer||inflight)){e.preventDefault();e.returnValue="";}});
})();`;

// Gaya edisi portal, diletakkan selepas gaya asal app: tema smkap Dashboard SPM (teal gelap portal + emas logo) dan skrol dalam bingkai.
const portalStyle = `<style id="pbd-portal">
:root[data-palet="smkap"]{--hero-1:rgba(120,215,205,.72);--hero-2:rgba(40,160,165,.24);--bg:#061b25;--bg-glow-1:rgba(38,150,155,.40);--bg-glow-2:rgba(232,194,90,.12);--bg-glow-3:rgba(110,210,215,.16);--rail:rgba(3,20,28,.80);--glass:rgba(150,225,228,.065);--glass-2:rgba(150,225,228,.10);--glass-border:rgba(133,201,204,.20);--text:#edf7f5;--muted:#9bb8bb;--accent-ink:#062a2e}
:root[data-theme="light"][data-palet="smkap"]{--bg:#e2f0ef;--bg-glow-1:rgba(40,150,150,.24);--bg-glow-2:rgba(212,170,50,.20);--bg-glow-3:rgba(120,200,205,.26);--rail:rgba(6,40,48,.92);--glass:rgba(255,255,255,.6);--glass-2:rgba(255,255,255,.75);--glass-border:rgba(255,255,255,.8);--text:#10272b;--muted:#4f6b6e;--accent:#0e7c80;--accent-ink:#fff}
:root[data-palet="smkap"] .hero .ring{border-color:rgba(120,215,205,.3)}
:root[data-palet="smkap"] .hero::after{background:radial-gradient(circle at 40% 40%,var(--hero-1),var(--hero-2) 45%,transparent 70%)}
/* Tiada zum (cubit atau ketuk dua kali), sama seperti modul lain dalam portal. Skrol menegak dan mendatar kekal. */
html,body,*{touch-action:pan-x pan-y}
.swatch[data-tema="smkap"]{background:linear-gradient(135deg,#082c39 50%,#78d7cd 50%)!important}
@media (max-width:860px){
  html.terbenam,html.terbenam body,html.terbenam #root{height:100%;overflow:hidden}
  html.terbenam .app{display:flex;flex-direction:column;height:100%;min-height:0;padding:8px;gap:8px}
  html.terbenam .main{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
  html.terbenam .main>*{flex-shrink:0}
  html.terbenam .side{position:relative;left:auto;right:auto;bottom:auto;top:auto;order:2;flex:none}
}
@media (max-width:860px){#pbdPill{bottom:auto!important;top:10px!important;left:50%!important;transform:translateX(-50%)}}
@media print{
  html.terbenam,html.terbenam body,html.terbenam #root{height:auto;overflow:visible}
  html.terbenam .app{display:block;height:auto}
  html.terbenam .main{overflow:visible}
}
</style>`;

// Dijalankan selepas skrip app: tema peribadi, kekalkan skrol, kunci lihat sahaja dan pengurus akses (seperti Dashboard SPM).
const afterApp = String.raw`(function(){
var B=window.__PBD_PORTAL__||{},canEdit=!!B.canEdit,canManage=!!B.canManage;
var penatal=window.__PBD_PENATAL||function(){return null;},pilihan=window.__PBD_PILIHAN||function(){return {};};
if(typeof DB==="undefined"||typeof window.render!=="function"||typeof window.applyTheme!=="function")return;
try{if(!TEMA.smkap){var lain=Object.assign({},TEMA);Object.keys(lain).forEach(function(k){delete TEMA[k];});TEMA.smkap="#78d7cd";Object.assign(TEMA,lain);}}catch(e){}
var f=pilihan();DB.settings.tema=TEMA[f.tema]?f.tema:"smkap";DB.settings.gelap=f.gelap==="0"?"0":"";
var asalTema=window.applyTheme;
window.applyTheme=function(){var t=DB.settings.tema;document.documentElement.setAttribute("data-palet",t==="smkap"?"smkap":(t||""));return asalTema.apply(this,arguments);};
var BOLEH={print:1,slipSemua:1,theme:1,openSide:1,closeSide:1,csv:1,tour:1,welcomeOk:1,welcomePanduan:1,closeModal:1};
var TUTUP='[data-go="import"],[data-go="tetapan"],[data-del],[data-isiguru],[data-samaguru],[data-buangalias],[data-tema],.drop,#drop';
function kunci(akar){if(canEdit||!akar)return;
 akar.querySelectorAll("[data-act]").forEach(function(b){if(!BOLEH[b.dataset.act])b.style.display="none";});
 akar.querySelectorAll(TUTUP).forEach(function(b){b.style.display="none";});
 akar.querySelectorAll("[data-gk],[data-gs],[data-alias],#renLama,#renBaru").forEach(function(el){el.disabled=true;});}
function notaTema(){if(PAPARAN!=="tetapan")return;document.querySelectorAll("#view label").forEach(function(l){if(l.textContent==="Warna aksen"){l.textContent="Warna tema";var row=l.parentNode;if(row&&!row.querySelector(".pbd-nota"))row.insertAdjacentHTML("beforeend",'<p class="hint mt mb0 pbd-nota">Tema <b>smkap</b>: teal gelap seperti portal SMKAP Digital. Warna tema dan mod cerah/gelap ialah pilihan anda sendiri; paparan guru lain tidak berubah.</p>');}});}
var asalRender=window.render;
window.render=function(){
 if(!canEdit&&(ST.view==="import"||ST.view==="tetapan"))ST.view=DB.sets.length?"ringkasan":"panduan";
 var m=penatal(),y=m?m.scrollTop:null;
 var hasil=asalRender.apply(this,arguments);
 if(y!=null){var n=penatal();if(n)n.scrollTop=y;}
 kunci(document.getElementById("root"));notaTema();pasangAkses();
 return hasil;};
if(!canEdit){
 document.addEventListener("click",function(e){var t=e.target&&e.target.closest?e.target.closest("[data-act],[data-go],[data-del],[data-isiguru],[data-samaguru],[data-buangalias],[data-tema]"):null;if(!t)return;
  var ok=t.dataset.act?!!BOLEH[t.dataset.act]:t.dataset.go?(t.dataset.go!=="import"&&t.dataset.go!=="tetapan"):false;
  if(!ok){e.preventDefault();e.stopImmediatePropagation();}},true);
 ["dragover","drop"].forEach(function(n){document.addEventListener(n,function(e){e.preventDefault();e.stopImmediatePropagation();},true);});
 var tunda=0;new MutationObserver(function(){if(tunda)return;tunda=requestAnimationFrame(function(){tunda=0;document.querySelectorAll("body > :not(#root)").forEach(kunci);});}).observe(document.body,{childList:true,subtree:true});
}
/* pengurus akses: Super Admin dan Admin yang diberi modul Dashboard PBD (tab Akses Admin portal) */
var LBL={edit:"Boleh edit",view:"Lihat sahaja",none:"Tiada akses"},SENARAI=null,cari="";
function h(x){return String(x==null?"":x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function pasangAkses(){if(!canManage||PAPARAN!=="tetapan"||document.getElementById("pbdAkses"))return;var grid=document.querySelector("#view .grid");if(!grid)return;
 grid.insertAdjacentHTML("beforeend",'<div class="card" id="pbdAkses" style="grid-column:1/-1"><h3>👥 Akses warga <span class="chip" style="margin-left:6px;font-size:11px">Pentadbir sahaja</span></h3><p class="hint">Tetapkan siapa boleh mengubah data (import, padam, nama guru, tetapan) dan siapa lihat sahaja. Super Admin dan Admin yang diberi modul Dashboard PBD (tab Akses Admin portal) sentiasa boleh edit dan mengurus akses.</p><div id="pbdAksesIsi"><p class="hint mb0">Memuatkan senarai warga…</p></div></div>');
 if(SENARAI)lukis();muat();}
function muat(){fetch("/api/dashboard-pbd/akses",{credentials:"same-origin",cache:"no-store"}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||("HTTP "+r.status));SENARAI=d;lukis();});}).catch(function(e){var el=document.getElementById("pbdAksesIsi");if(el)el.innerHTML='<p class="hint mb0" style="color:var(--bad)">Senarai akses tidak dapat dimuatkan: '+h(e.message)+'</p>';});}
function lukis(){var el=document.getElementById("pbdAksesIsi"),d=SENARAI;if(!el||!d)return;
 el.innerHTML='<div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap"><div class="field" style="min-width:210px"><label>Warga lain (lalai)</label><select data-pbdlalai="1"><option value="view"'+(d.lalai==="view"?" selected":"")+'>Lihat sahaja</option><option value="none"'+(d.lalai==="none"?" selected":"")+'>Tiada akses</option></select></div><div class="field" style="flex:1;min-width:190px"><label>Cari warga</label><input type="text" id="pbdAksesCari" value="'+h(cari)+'" placeholder="Nama atau jawatan" autocomplete="off"></div></div><p class="hint mt mb0" id="pbdAksesBil"></p><div class="table-wrap mt"><table><thead><tr><th>Nama</th><th>Jawatan</th><th>Akses Dashboard PBD</th></tr></thead><tbody id="pbdAksesJadual"></tbody></table></div>';
 jadual();}
function jadual(){var el=document.getElementById("pbdAksesJadual"),d=SENARAI;if(!el||!d)return;
 var bil=function(t){return d.warga.filter(function(w){return !w.urus&&(w.tahap||d.lalai)===t;}).length;},b=document.getElementById("pbdAksesBil");
 if(b)b.textContent=bil("edit")+" boleh edit · "+bil("view")+" lihat sahaja · "+bil("none")+" tiada akses · "+d.warga.filter(function(w){return w.urus;}).length+" pentadbir";
 var q=cari.trim().toUpperCase(),w=d.warga.filter(function(x){return !q||(x.nama+" "+x.jawatan).toUpperCase().indexOf(q)>=0;});
 el.innerHTML=w.map(function(x){return '<tr><td>'+h(x.nama)+'</td><td>'+h(x.jawatan)+'</td><td>'+(x.urus?'<span class="chip ok">Pentadbir · boleh edit</span>':'<select data-pbdakses="'+h(x.id)+'" data-nama="'+h(x.nama)+'" aria-label="Akses '+h(x.nama)+'"><option value=""'+(!x.tahap?" selected":"")+'>Ikut lalai ('+LBL[d.lalai]+')</option>'+["edit","view","none"].map(function(t){return '<option value="'+t+'"'+(x.tahap===t?" selected":"")+'>'+LBL[t]+'</option>';}).join("")+'</select>')+'</td></tr>';}).join("")||'<tr><td colspan="3" class="muted">Tiada warga sepadan.</td></tr>';}
function tukar(badan,mesej){fetch("/api/dashboard-pbd/akses",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(badan)}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||("HTTP "+r.status));SENARAI=d;if(badan.lalai)lukis();else jadual();if(typeof toast==="function")toast(mesej,"ok");});}).catch(function(e){if(typeof toast==="function")toast("Akses tidak dapat ditukar: "+e.message,"err");lukis();});}
document.addEventListener("change",function(e){var t=e.target;if(!t||!t.dataset)return;
 if(t.dataset.pbdakses!==undefined){tukar({userId:t.dataset.pbdakses,tahap:t.value||null},"Akses "+(t.dataset.nama||"warga")+" dikemas kini.");}
 else if(t.dataset.pbdlalai){tukar({lalai:t.value},"Akses lalai dikemas kini.");}});
document.addEventListener("input",function(e){if(e.target&&e.target.id==="pbdAksesCari"){cari=e.target.value;jadual();}});
applyTheme();render();
if(window.__PBD_SEDIA)window.__PBD_SEDIA();
if(!canEdit&&window.__PBD_PAPAR)window.__PBD_PAPAR("Lihat sahaja · hubungi pentadbir Dashboard PBD untuk akses edit",false);
})();`;

export async function GET(request: Request) {
  try {
    const actor = await portalActor(request);
    if (!actor) return messagePage("Sila log masuk", "Dashboard PBD hanya untuk warga SMK Agama Pahang yang log masuk ke portal SMKAP Digital.", 401);
    const access = await pbdAccess(actor);
    if (!access.canView) return messagePage("Tiada akses", "Akaun anda belum dibenarkan membuka Dashboard PBD. Hubungi pentadbir portal SMKAP Digital.", 403);
    const snapshot = await readPbdSnapshot();
    const boot = `<script>window.__PBD_PORTAL__=${inlineJson({ key: PBD_STORAGE_KEY, data: snapshot.data, version: snapshot.version, updatedAt: snapshot.updatedAt, updatedBy: snapshot.updatedBy, canEdit: access.canEdit, canManage: access.canManage, user: { name: actor.name, email: actor.email } })};</script><script>${bridge}</script>`;
    let html = dashboardHtml;
    for (const [from, to] of wording) html = html.split(from).join(to);
    html = html.replace(/<meta name="viewport"[^>]*>/i, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">');
    const marker = '<meta charset="utf-8">';
    html = html.includes(marker) ? html.replace(marker, `${marker}\n${boot}`) : html.replace(/<head[^>]*>/i, (head) => `${head}\n${boot}`);
    // Gaya portal selepas gaya asal (</head> pertama), skrip selepas skrip app (</body> terakhir).
    const headEnd = html.indexOf("</head>");
    if (headEnd >= 0) html = html.slice(0, headEnd) + portalStyle + html.slice(headEnd);
    const bodyEnd = html.lastIndexOf("</body>");
    const after = `<script>${afterApp}</script>`;
    html = bodyEnd >= 0 ? html.slice(0, bodyEnd) + after + html.slice(bodyEnd) : html + after;
    return new Response(html, { headers: { ...noStore, "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("Dashboard PBD page", error);
    return messagePage("Dashboard PBD belum dapat dibuka", "Sila cuba semula sebentar lagi.", 500);
  }
}
