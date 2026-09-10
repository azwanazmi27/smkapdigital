"use client";
import {ProfileCard,StaffExpertiseList} from "./profile-card";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { Bell, BookOpen, BookOpenText, BriefcaseBusiness, Building2, CalendarDays, CalendarPlus, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, ClipboardList, Clock3, ExternalLink, FilePlus2, FileText, Folder, GraduationCap, HandCoins, HeartHandshake, Landmark, Mail, Map, MapPin, Monitor, MoonStar, Network, Palette, Phone, Presentation, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Trophy, UserRound, Users, Video, X } from "lucide-react";
import { oprCategoryGroups, oprCategoryValues, oprFolderTree, type OprFolderNode } from "./opr-categories";
import {achievementCategory} from './achievement-mapping';
import {isPrimaryReport} from './report-kind';
import { SkasCentre } from "./skas-centre";
import {monitoringCategory,monitoringTopics} from './monitoring-mapping';
import { ManagementCentre } from "./management-centre";
import { FolderOpen } from "lucide-react";
import { EPanitiaCentre } from "./epanitia-centre";

type PdfDocument = InstanceType<(typeof import("jspdf"))["jsPDF"]>;

// jsPDF is only needed once a teacher opens a PDF preview or saves a report.
// Keeping it out of the opening bundle makes the first visit much lighter on phones.
async function loadJsPdf() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

type Folder = "ibubapa" | "warga" | "tentang" | "schoolprofile" | "orgchart" | "announcements" | "calendar" | "directory" | "pengunjung" | "ekunjung" | "ekeberadaan" | "etempahan" | "achievement" | "epemantauan" | "skas" | "pengurusan" | "epanitia" | "oprhub" | "oprgenerator" | "oprduty" | "admin" | null;
type SubItem = { icon: LucideIcon; title: string; text: string; badge?: string; href?: string; folder?: Folder };
type OprReport = { id: string; name: string; category: string; createdAt: string; updatedAt: string; viewUrl: string; previewUrl: string; downloadUrl: string };

let oprMemoryCache: OprReport[] | null = null;
let oprRequest: Promise<OprReport[]> | null = null;

function fetchOprIndex(refresh = false) {
  if (!refresh && oprMemoryCache) return Promise.resolve(oprMemoryCache);
  if (!refresh && oprRequest) return oprRequest;
  const request = fetch(`/api/drive${refresh ? "?refresh=1" : ""}`, { cache: "no-store" }).then(async (response) => {
    const data = await response.json() as { files?: OprReport[]; error?: string };
    if (!response.ok || !data.files) throw new Error(data.error || "Senarai OPR tidak tersedia");
    oprMemoryCache = data.files;
    return data.files;
  }).finally(() => { oprRequest = null; });
  if (!refresh) oprRequest = request;
  return request;
}

function resizeAutoGrowTextarea(field: HTMLTextAreaElement) {
  if (field.dataset.autogrow === "off") return;
  field.style.height = "auto";
  field.style.height = `${Math.max(field.scrollHeight + 2, 48)}px`;
}

function rememberOprReport(report: OprReport) {
  oprMemoryCache = [report, ...(oprMemoryCache || []).filter((item) => item.id !== report.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent<OprReport>("smkap:opr-updated",{detail:report}));
}

function DrivePdfPreview({ fileId, title }: { fileId: string; title: string }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [source,setSource]=useState("");
  const [attempt,setAttempt]=useState(0);
  const previewUrl = `/api/drive?file=${encodeURIComponent(fileId)}`;
  useEffect(() => {
    const controller=new AbortController();let objectUrl="";let cancelled=false;
    const timeout=window.setTimeout(()=>controller.abort(),18_000);
    setLoading(true);setFailed(false);setSource("");
    void fetch(previewUrl,{cache:"force-cache",signal:controller.signal}).then(async(response)=>{
      if(!response.ok)throw new Error("PDF tidak tersedia");
      const blob=await response.blob();
      if(!blob.size||(!blob.type.includes("pdf")&&!response.headers.get("content-type")?.includes("pdf")))throw new Error("Respons bukan PDF");
      if(cancelled)return;objectUrl=URL.createObjectURL(blob);setSource(objectUrl);setLoading(false);
    }).catch(()=>{if(!cancelled){setLoading(false);setFailed(true);}}).finally(()=>window.clearTimeout(timeout));
    return()=>{cancelled=true;controller.abort();window.clearTimeout(timeout);if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[fileId,attempt]);
  return <div className={`drive-pdf-frame drive-pdf-frame-safe${loading ? " is-loading" : ""}`} aria-busy={loading}>
    {loading && <div className="pdf-opening-state" role="status" aria-live="polite"><i aria-hidden="true"/><span><strong>Membuka pratonton PDF</strong><small>Sila tunggu sebentar…</small></span></div>}
    {failed ? <div className="pdf-preview-fallback"><strong>Pratonton belum dapat dibuka pada peranti ini.</strong><button onClick={()=>setAttempt((value)=>value+1)}>Cuba semula</button><a href={`${previewUrl}&download=1`}>Muat turun PDF untuk dibuka</a></div> : source ? <iframe src={source} title={title} loading="eager"/> : null}
  </div>;
}

function GlassIcon({ icon: Icon, size = "md" }: { icon: LucideIcon; size?: "sm" | "md" | "lg" }) {
  return <span className={`glass-icon glass-icon-${size}`}><Icon aria-hidden="true" /></span>;
}

const folders = [
  { id: "tentang", no: "01", icon: Building2, title: "Tentang Sekolah", text: "Profil & maklumat sekolah" },
  { id: "warga", no: "02", icon: Users, title: "Guru & Staf", text: "Urusan guru dan kakitangan" },
  { id: "ibubapa", no: "03", icon: HeartHandshake, title: "Ibu Bapa / Penjaga", text: "Maklumat dan urusan anak" },
  { id: "pengunjung", no: "04", icon: MapPin, title: "Pelawat", text: "Daftar lawatan & panduan" },
] as const;

const folderContent: Record<Exclude<Folder, null | "admin" | "oprgenerator" | "oprduty" | "ekunjung" | "directory" | "schoolprofile" | "orgchart" | "announcements" | "calendar" | "skas" | "pengurusan" | "epanitia" | "ekeberadaan" | "etempahan" | "achievement" | "epemantauan">, { title: string; intro: string; items: SubItem[] }> = {
  ibubapa: {
    title: "Ibu Bapa / Penjaga",
    intro: "Maklumat penting sekolah yang mudah dicapai oleh ibu bapa dan penjaga.",
    items: [
      { icon: Bell, title: "Hebahan sekolah", text: "Pengumuman dan makluman terkini", folder: "announcements" },
      { icon: CalendarDays, title: "Takwim sekolah", text: "Tarikh dan aktiviti penting", folder: "calendar" },
      { icon: Phone, title: "Hubungi sekolah", text: "09-4523901 · cra8001@moe.edu.my", href: "mailto:cra8001@moe.edu.my" },
    ],
  },
  warga: {
    title: "Guru & Staf",
    intro: "Semua urusan kerja guru dan kakitangan dihimpunkan di sini.",
    items: [
      { icon: FileText, title: "Pusat OPR", text: "Cipta dan semak laporan mengikut bidang", folder: "oprhub" },
      { icon: Search, title: "e-Pemantauan", text: "Rekod pemerhatian dan hasilkan OPR", folder: "epemantauan" },
      { icon: CircleCheck, title: "E-Keberadaan & Relief", text: "Lapor tidak hadir, kemudian urus relief", folder: "ekeberadaan" },
      { icon: CalendarRange, title: "E-Tempahan", text: "Tempahan bilik dan kemudahan sekolah", folder: "etempahan" },
      { icon: Trophy, title: "Arkib Kejayaan", text: "Simpan sijil dan rekod pencapaian", folder: "achievement" },
    ],
  },
  tentang: {
    title: "Tentang Sekolah",
    intro: "Kenali organisasi, warga dan hala tuju SMK Agama Pahang.",
    items: [
      { icon: Landmark, title: "Profil sekolah", text: "Maklumat dan hala tuju SMKAP", folder: "schoolprofile" },
      { icon: Network, title: "Carta organisasi", text: "Struktur pengurusan sekolah", folder: "orgchart" },
      { icon: UserRound, title: "Senarai guru", text: "Nama, jawatan dan gred SSPA", folder: "directory" },
    ],
  },
  pengunjung: {
    title: "Pelawat",
    intro: "Daftar kehadiran dan dapatkan panduan sebelum berurusan di sekolah.",
    items: [
      { icon: ClipboardList, title: "E-Kunjung", text: "Imbas dan daftar masuk", folder: "ekunjung" },
      { icon: Map, title: "Panduan ke sekolah", text: "Jalan Sekolah Agama, 26700 Muadzam Shah", href: "https://www.google.com/maps/search/?api=1&query=SMK+Agama+Pahang%2C+Jalan+Sekolah+Agama%2C+26700+Muadzam+Shah%2C+Pahang" },
      { icon: Phone, title: "Hubungi pejabat", text: "09-4523901 · cra8001@moe.edu.my", href: "tel:+6094523901" },
    ],
  },
  oprhub: {
    title: "Pusat OPR",
    intro: "Cipta satu OPR, kemudian semak laporan yang difailkan mengikut bidang berkaitan.",
    items: [
      { icon: FilePlus2, title: "Cipta OPR baharu", text: "Penjana OPR rasmi dalam portal", folder: "oprgenerator" },
      { icon: BriefcaseBusiness, title: "Pengurusan", text: "Laporan pengurusan" },
      { icon: BookOpen, title: "Kurikulum", text: "Laporan akademik" },
      { icon: Users, title: "Hal Ehwal Murid", text: "Laporan HEM" },
      { icon: Trophy, title: "Kokurikulum", text: "Laporan aktiviti" },
      { icon: GraduationCap, title: "Tingkatan Enam", text: "Kurikulum, HEM & Kokurikulum" },
      { icon: ClipboardList, title: "Laporan Guru Bertugas", text: "Dashboard, laporan harian dan mingguan", folder: "oprduty" },
      { icon: Presentation, title: "Laporan Perhimpunan", text: "Laporan perhimpunan mingguan" },
      { icon: Folder, title: "Lain-lain", text: "Laporan kategori tambahan" },
    ],
  },
};

export function LandingPortal() {
  const publicContent=usePublicContent();
  const [open, setOpen] = useState<Folder>(null);
  const [toast, setToast] = useState("");
  const [opening, setOpening] = useState("");
  const [attendanceSplash,setAttendanceSplash]=useState(false);
  const [identity,setIdentity]=useState<PortalIdentity|null>(null);
  const [identityChecked,setIdentityChecked]=useState(false);
  const [pendingStaffOpen,setPendingStaffOpen]=useState(false);
  const [oprCategoryGroup,setOprCategoryGroup]=useState("");
  const [authOpen,setAuthOpen]=useState(false);
  const [welcome,setWelcome]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [staffAnnouncements,setStaffAnnouncements]=useState<Array<{id:string;title:string;body:string;publishedAt:string;endsAt:string;imageDataUrl?:string}>>([]);
  const [staffAnnouncementOpen,setStaffAnnouncementOpen]=useState(false);
  const [pushNotice,setPushNotice]=useState<{id:string;title:string;body:string;createdAt:string}|null>(null);
  const [authError,setAuthError]=useState("");
  const [pushState,setPushState]=useState<"idle"|"loading"|"enabled"|"blocked"|"unsupported">("idle");
  const folderModalRef=useRef<HTMLElement|null>(null);
  const overlayActive=Boolean(open||authOpen||welcome||profileOpen||staffAnnouncementOpen||pushNotice);
  const requestedModule=()=>{const value=new URLSearchParams(window.location.search).get("module");const allowed:Folder[]=["warga","oprhub","oprgenerator","oprduty","ekeberadaan","etempahan","achievement","epemantauan","skas","pengurusan","epanitia"];return allowed.includes(value as Folder)?value as Folder:null;};
  const requestedNotificationId=()=>new URLSearchParams(window.location.search).get("notification")||"";
  const openRequestedNotification=async()=>{const id=requestedNotificationId();if(!id)return;const response=await fetch(`/api/push?view=notification&id=${encodeURIComponent(id)}`,{cache:"no-store"}),data=await response.json();if(response.ok&&data.notification)setPushNotice(data.notification);};
  const loadStaffAnnouncements=async()=>{try{const response=await fetch("/api/portal-content?view=staff",{cache:"no-store"}),data=await response.json();if(response.ok)setStaffAnnouncements(data.announcements||[]);}catch{}}
  const loadIdentity=async(showWelcome=false)=>{const response=await fetch("/api/admin-users?resource=me",{cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error||"Log masuk tidak berjaya.");setIdentity(data.me);setIdentityChecked(true);setAuthOpen(false);void loadStaffAnnouncements();const target=requestedModule();if(target)setOpen(target);else if(showWelcome&&!requestedNotificationId())setOpen("warga");if(showWelcome&&!requestedNotificationId())setWelcome(true);await openRequestedNotification();};
  const establishSession=async(credential:string)=>{const response=await fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential})}),data=await response.json();if(!response.ok)throw new Error(data.error||"Log masuk tidak berjaya.");if(data.me)setIdentity(data.me);setIdentityChecked(true);setAuthOpen(false);await loadIdentity(true);};
  useEffect(() => {
    document.documentElement.classList.add("portal-ready");
    void loadIdentity(false).catch(()=>{setIdentity(null);setIdentityChecked(true);if(requestedModule()||requestedNotificationId())setAuthOpen(true);});
    return () => document.documentElement.classList.remove("portal-ready");
  }, []);
  useEffect(()=>{
    if(!overlayActive)return;
    const scrollY=window.scrollY;
    const html=document.documentElement;
    const body=document.body;
    const previous={
      htmlOverflow:html.style.overflow,
      htmlOverscroll:html.style.overscrollBehavior,
      bodyOverflow:body.style.overflow,
      bodyOverscroll:body.style.overscrollBehavior,
      bodyPosition:body.style.position,
      bodyTop:body.style.top,
      bodyWidth:body.style.width,
    };
    html.style.overflow="hidden";
    html.style.overscrollBehavior="none";
    body.style.overflow="hidden";
    body.style.overscrollBehavior="none";
    body.style.position="fixed";
    body.style.top=`-${scrollY}px`;
    body.style.width="100%";
    return()=>{
      html.style.overflow=previous.htmlOverflow;
      html.style.overscrollBehavior=previous.htmlOverscroll;
      body.style.overflow=previous.bodyOverflow;
      body.style.overscrollBehavior=previous.bodyOverscroll;
      body.style.position=previous.bodyPosition;
      body.style.top=previous.bodyTop;
      body.style.width=previous.bodyWidth;
      window.scrollTo(0,scrollY);
    };
  },[overlayActive]);
  useEffect(()=>{if(!identityChecked||!pendingStaffOpen)return;setPendingStaffOpen(false);if(identity)setOpen("warga");else setAuthOpen(true);},[identityChecked,pendingStaffOpen,identity]);
  useEffect(()=>{
    if(!open)return;
    const resetModalPosition=()=>{
      const modal=folderModalRef.current;
      if(!modal)return;
      modal.scrollTop=0;
      modal.scrollLeft=0;
    };
    resetModalPosition();
    const firstFrame=requestAnimationFrame(()=>{
      resetModalPosition();
      requestAnimationFrame(resetModalPosition);
    });
    return()=>cancelAnimationFrame(firstFrame);
  },[open]);
  useEffect(() => {
    const resizeAll = () => document.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(resizeAutoGrowTextarea);
    const resizeTarget = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) resizeAutoGrowTextarea(event.target);
    };
    const observer = new MutationObserver((changes) => {
      if (changes.some((change) => change.addedNodes.length > 0)) requestAnimationFrame(resizeAll);
    });
    document.addEventListener("input", resizeTarget);
    document.addEventListener("focusin", resizeTarget);
    window.addEventListener("resize", resizeAll);
    observer.observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(resizeAll);
    return () => {
      document.removeEventListener("input", resizeTarget);
      document.removeEventListener("focusin", resizeTarget);
      window.removeEventListener("resize", resizeAll);
      observer.disconnect();
    };
  }, []);
  useEffect(()=>{if(!authOpen)return;let cancelled=false;const start=async()=>{try{setAuthError("");const config=await fetch("/api/admin-users?resource=config").then(r=>r.json());if(!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')){const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;document.head.appendChild(script);}for(let i=0;i<50&&!window.google;i++)await new Promise(r=>setTimeout(r,100));if(cancelled||!window.google)throw new Error();window.google.accounts.id.initialize({client_id:config.clientId,callback:({credential})=>{void establishSession(credential).catch(error=>setAuthError(error instanceof Error?error.message:"Log masuk tidak berjaya."));}});const element=document.getElementById("google-staff-signin");if(element){element.innerHTML="";window.google.accounts.id.renderButton(element,{theme:"outline",size:"large",text:"continue_with",shape:"pill",width:300});}}catch{setAuthError("Butang Google tidak dapat disediakan sekarang.");}};void start();return()=>{cancelled=true};},[authOpen]);
  const unreadStaffAnnouncements=()=>staffAnnouncements.filter(item=>localStorage.getItem(`smkap_announcement_read_${item.id}`)!=="1");
  const finishOpening=()=>window.setTimeout(()=>setOpening(""),360);
  const openFolder=(folder:typeof folders[number])=>{
    setOpening(folder.title);
    if(folder.id==="warga"&&!identityChecked){setPendingStaffOpen(true);finishOpening();return;}
    if(folder.id==="warga"&&!identity){setAuthOpen(true);finishOpening();return;}
    setOpen(folder.id);finishOpening();
  };
  const openSubmodule=(folder:Folder,title:string)=>{if(folder==="ekeberadaan"){setAttendanceSplash(true);setOpen(folder);window.setTimeout(()=>setAttendanceSplash(false),1800);return;}setOpening(title);setOpen(folder);finishOpening();};
  const closeStaffAnnouncement=(readId?:string)=>{if(readId)localStorage.setItem(`smkap_announcement_read_${readId}`,"1");setStaffAnnouncementOpen(false);};
  const updatePhoto=async(file?:File)=>{if(!file||!identity)return;const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(Error("Gambar tidak dapat dibaca"));reader.readAsDataURL(file);});const response=await fetch("/api/admin-users?resource=profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({photoBase64:base64,mimeType:file.type})}),data=await response.json();if(!response.ok)throw new Error(data.error);await loadIdentity(false);notify("Gambar profil berjaya dikemas kini");};
  const updateProfile=async(profile:{name:string;position:string;grade:string})=>{const response=await fetch("/api/admin-users?resource=profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(profile)}),data=await response.json();if(!response.ok)throw new Error(data.error||"Profil tidak dapat dikemas kini.");setIdentity(current=>current?{...current,...profile}:current);notify("Profil berjaya dikemas kini");};
  const logout=()=>{void fetch("/api/session",{method:"DELETE"});window.google?.accounts.id.disableAutoSelect?.();setIdentity(null);setIdentityChecked(true);setWelcome(false);setProfileOpen(false);setAuthOpen(false);setOpen(null);notify("Anda telah log keluar");};
  const enableNotifications=async()=>{try{if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){setPushState("unsupported");throw new Error("Peranti atau pelayar ini belum menyokong notifikasi portal.");}setPushState("loading");const permission=await Notification.requestPermission();if(permission!=="granted"){setPushState("blocked");throw new Error("Notifikasi belum dibenarkan pada peranti ini.");}const configResponse=await fetch("/api/push?view=config",{cache:"no-store"}),config=await configResponse.json() as{publicKey?:string;error?:string};if(!configResponse.ok||!config.publicKey)throw new Error(config.error||"Tetapan notifikasi belum tersedia.");const registration=await navigator.serviceWorker.ready,existing=await registration.pushManager.getSubscription();const decode=(value:string)=>{const normalized=(value+"=".repeat((4-value.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"),raw=atob(normalized);return Uint8Array.from(raw,char=>char.charCodeAt(0));};const subscription=existing||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});const response=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"subscribe",...subscription.toJSON()})}),data=await response.json() as{error?:string};if(!response.ok)throw new Error(data.error||"Peranti tidak dapat didaftarkan.");setPushState("enabled");notify("Notifikasi SMKAP telah diaktifkan pada peranti ini");}catch(error){setPushState(current=>current==="blocked"||current==="unsupported"?current:"idle");notify(error instanceof Error?error.message:"Notifikasi tidak dapat diaktifkan");}};
  const currentFolderContent=open&&folderContent[open as keyof typeof folderContent];
  const currentItems=currentFolderContent?.items.map(item=>item) || [];
  if(open==="warga")currentItems.push({icon:FolderOpen,title:"PENGURUSAN SEKOLAH",text:"Fail pengurusan, kurikulum, HEM, kokurikulum dan Tingkatan Enam",folder:"pengurusan"});
  if(open==="warga"&&identity){
    currentItems.push({icon:BookOpenText,title:"e-Panitia",text:"Satu rekod dokumen untuk semua kegunaan panitia",folder:"epanitia"});
    currentItems.push({icon:ShieldCheck,title:"Pusat SK@S",text:"Dashboard evidens dan pematuhan sekolah",folder:"skas"});
  }
  if(open==="ibubapa"){
    currentItems.splice(2,0,
      {icon:ShoppingBag,title:"Koperasi SMKAP",text:"Beli tiket bas dan barangan koperasi dalam talian",href:publicContent?.settings.parent_coop_url||"https://koperasismkap.kiah.store/"},
      {icon:HandCoins,title:"Sumbangan PIBG",text:"Salurkan sumbangan PIBG secara dalam talian",href:publicContent?.settings.parent_pibg_url||"https://app.herepay.org/pibgsmkapahang"}
    );
  }

  const closeCurrentView = () => {
    if (open === "oprgenerator" || open === "oprduty") return setOpen("oprhub");
    if (open === "oprhub") return setOpen("warga");
    if (open === "ekunjung") return setOpen("pengunjung");
    if (open === "etempahan") return setOpen("warga");
    if (open === "ekeberadaan") return setOpen("warga");
    if (open === "achievement") return setOpen("warga");
    if (open === "epemantauan") return setOpen("warga");
    if ((open === "skas" || open === "pengurusan" || open === "epanitia")) return setOpen("warga");
    if (open === "directory") return setOpen("tentang");
    if (open === "schoolprofile" || open === "orgchart") return setOpen("tentang");
    if (open === "announcements" || open === "calendar") return setOpen("ibubapa");
    setOpen(null);
  };

  const closeViewLabel = open === "oprgenerator" || open === "oprduty"
    ? "Kembali ke Pusat OPR"
    : open === "oprhub" || open === "etempahan" || open === "ekeberadaan" || open === "achievement" || open === "epemantauan" || (open === "skas" || open === "pengurusan" || open === "epanitia")
      ? "Kembali ke Guru & Staf"
      : open === "ekunjung"
        ? "Kembali ke Pelawat"
        : open === "directory" || open === "schoolprofile" || open === "orgchart"
          ? "Kembali ke Tentang Sekolah"
          : open === "announcements" || open === "calendar"
            ? "Kembali ke Ibu Bapa / Penjaga"
            : "Tutup dan kembali ke Portal Utama";

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  return <main className="landing-shell">
    <div className="landing-noise" aria-hidden="true"></div>
    <header className="landing-header">
      <div className="official-logo portal-brand"><span className="school-crest"><img src="/logo-smkap.png" alt="Logo rasmi SMK Agama Pahang" /></span><i className="brand-divider" aria-hidden="true"/><img className="digital-mark" src="/smkap-digital.png" alt="Ikon SMKAP Digital"/><div className="digital-copy"><strong><span>SMKAP</span> <em>Digital</em></strong><small>SMK Agama Pahang</small><b>Berilmu • Bertakwa</b></div></div>
      <div className="portal-label"><i></i><span>PORTAL RASMI</span><b>2026</b></div>
      {identity&&<button className="signed-user-chip" onClick={()=>setProfileOpen(true)} aria-label={`Buka profil ${identity.name}`}><IdentityAvatar user={identity}/><span><small>PROFIL SAYA</small><strong>{identity.name}</strong></span></button>}
      <button className="admin-entry admin-gear-entry" onClick={() => setOpen("admin")} aria-label="Buka pusat pentadbir" title="Pusat pentadbir"><span><Settings aria-hidden="true" /></span></button>
    </header>

    <section className="landing-main">
      <div className="landing-intro">
        <div className="intro-label"><i></i> PORTAL SEHENTI WARGA SMKAP</div>
        <h1>Urusan sekolah,<br/><em>lebih mudah.</em></h1>
        <p>Semua urusan sekolah dalam satu tempat.</p>
      </div>

      <div className="folder-area">
        <div className="folder-heading"><span><i></i> PILIH URUSAN</span><strong>Apa urusan anda hari ini?</strong></div>
        <div className="folder-grid">
          {folders.map((folder) => { const FolderIcon = folder.icon; return <button key={folder.id} className="folder-card" onClick={() => openFolder(folder)} aria-label={`${folder.title}: ${folder.text}`}>
            <div className="folder-icon"><FolderIcon aria-hidden="true" /></div>
            <div className="folder-copy"><span className="folder-no">{folder.no}</span><h2>{folder.title}</h2><p>{folder.text}</p></div>
            <ChevronRight className="folder-chevron" aria-hidden="true" />
          </button>; })}
        </div>
        <p className="safe-note"><ShieldCheck aria-hidden="true" /> Selamat digunakan · Gunakan akaun sekolah apabila diminta.</p>
      </div>
    </section>

    <footer className="landing-footer"><p>Portal ini disediakan untuk urusan rasmi warga SMK Agama Pahang.</p><span>© 2026 SMK Agama Pahang · Dibangunkan oleh BangWan</span><nav aria-label="Dasar dan hubungan sekolah"><button onClick={() => notify("Penafian: Maklumat dalam portal ini disediakan untuk rujukan dan urusan rasmi sekolah.")}>Penafian</button><button onClick={() => notify("Privasi: Data peribadi digunakan hanya bagi urusan sekolah, keselamatan dan perkhidmatan yang dibenarkan.")}>Privasi</button><a href="tel:+6094523901" aria-label="Hubungi sekolah di 09-4523901">Hubungi Sekolah: 09-4523901</a></nav></footer>

    {open && <div className="folder-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeCurrentView()}>
      <section ref={folderModalRef} className={`folder-modal ${open === "oprgenerator" || open === "oprduty" || open === "oprhub" || open === "etempahan" || open === "ekeberadaan" || open === "achievement" || open === "epemantauan" || (open === "skas" || open === "pengurusan" || open === "epanitia") ? "generator-modal" : ""} ${open === "orgchart" ? "org-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="folder-title">
        <button className="portal-home-button" onClick={() => setOpen(null)} aria-label="Kembali ke Portal Utama"><ChevronLeft aria-hidden="true" /> Portal Utama</button>
        <button className="folder-close" onClick={closeCurrentView} aria-label={closeViewLabel} title={closeViewLabel}><X aria-hidden="true" /></button>
        {identity&&open!=="admin"&&open!=="ekeberadaan"&&<div className="module-user-strip"><IdentityAvatar user={identity}/><div><small>WARGA SEKOLAH</small><strong>{identity.name}</strong><span>{identity.email} · {identity.position||"Warga SMKAP"}</span></div>{identity.grade&&<b>{identity.grade}</b>}</div>}
          {open === "admin" ? <AdminPanel notify={notify} /> : open === "schoolprofile" ? <SchoolProfile/> : open === "orgchart" ? <OrganizationChart/> : open === "announcements" ? <PublicAnnouncements/> : open === "calendar" ? <SchoolCalendar/> : open === "directory" ? <TeacherDirectory notify={notify}/> : open === "ekunjung" ? <VisitorForm notify={notify} close={() => setOpen("pengunjung")} /> : open === "ekeberadaan" ? <ReliefIntegratedApp user={identity} /> : open === "etempahan" ? <BookingCentre notify={notify} close={() => setOpen("warga")} user={identity} initialTab={new URLSearchParams(window.location.search).get("tab")==="form"?"form":"dashboard"} /> : open === "achievement" ? <AchievementArchive notify={notify} /> : open === "epemantauan" ? <MonitoringCentre notify={notify} user={identity} /> : open === "pengurusan" ? <ManagementCentre notify={notify} user={identity} initialFolder={new URLSearchParams(window.location.search).get("folder")||""} openSkas={()=>setOpen("skas")} /> : open === "epanitia" ? <EPanitiaCentre notify={notify} user={identity} openOpr={()=>{setOprCategoryGroup("Kurikulum");setOpen("oprgenerator")}} /> : open === "skas" ? <SkasCentre notify={notify} user={identity} /> : open === "oprduty" ? <OprDutyCentre notify={notify} user={identity} /> : open === "oprgenerator" ? <OprGenerator notify={notify} close={() => setOpen("oprhub")} user={identity} initialCategoryGroup={oprCategoryGroup} /> : open === "oprhub" ? <OprDashboard create={(group) => {setOprCategoryGroup(group);openSubmodule("oprgenerator","Cipta OPR baharu");}} openDuty={() => openSubmodule("oprduty","Laporan Guru Bertugas")} notify={notify} user={identity} /> : <>
          <span className="modal-overline">PILIH SUBMODUL</span>
          <h2 id="folder-title">{currentFolderContent?.title}</h2>
          <p>{currentFolderContent?.intro}</p>
          {open==="warga"&&staffAnnouncements.length>0&&<button className="staff-announcement-entry" onClick={()=>setStaffAnnouncementOpen(true)}><Bell aria-hidden="true"/><span><strong>Pengumuman Guru & Staf</strong><small>Buka semula makluman aktif</small></span>{unreadStaffAnnouncements().length>0&&<b>{unreadStaffAnnouncements().length} baharu</b>}<ChevronRight aria-hidden="true"/></button>}
          <div className="submodule-grid">{currentItems.map((item) => {
            const inside = <><GlassIcon icon={item.icon} /> <div><strong>{item.title}</strong><small>{item.text}</small></div>{item.badge && <b>{item.badge}</b>}<i>{item.href ? <ExternalLink aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</i></>;
            if (item.href) return <a key={item.title} href={item.href} target="_blank" rel="noreferrer">{inside}</a>;
            return <button key={item.title} onClick={() => item.folder ? openSubmodule(item.folder,item.title) : notify(`${item.title} dipilih`)}>{inside}</button>;
          })}</div>
        </>}
      </section>
    </div>}
    {authOpen&&<div className="staff-auth-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setAuthOpen(false)}><section className="staff-auth-card" role="dialog" aria-modal="true"><button onClick={()=>setAuthOpen(false)} aria-label="Tutup">×</button><GlassIcon icon={ShieldCheck} size="lg"/><span>AKSES WARGA SEKOLAH</span><h2>Log masuk dengan ID DELIMa</h2><p>Gunakan akaun <b>@moe-dl.edu.my</b> yang didaftarkan oleh sekolah.</p><div id="google-staff-signin"></div>{authError&&<small>{authError}</small>}</section></div>}
    {welcome&&identity&&<LoginWelcome user={identity} pushState={pushState} enableNotifications={enableNotifications} close={()=>{setWelcome(false);if(unreadStaffAnnouncements().length)window.setTimeout(()=>setStaffAnnouncementOpen(true),180)}}/>}
    {staffAnnouncementOpen&&staffAnnouncements.length>0&&<StaffAnnouncementPopup items={staffAnnouncements} close={closeStaffAnnouncement}/>} 
    {pushNotice&&<PushNoticePopup item={pushNotice} close={()=>{setPushNotice(null);const url=new URL(window.location.href);url.searchParams.delete("notification");history.replaceState({},"",`${url.pathname}${url.search}${url.hash}`);}}/>}
    {profileOpen&&identity&&<ProfileCard user={identity} close={()=>setProfileOpen(false)} save={updateProfile} updatePhoto={updatePhoto} logout={logout} notify={notify} pushState={pushState} enableNotifications={enableNotifications}/>} 
    {attendanceSplash&&<div className="attendance-splash" role="status" aria-live="polite"><img src="/ekeberadaan-loading.jpg" alt="SMKAP Digital e-Keberadaan"/><div className="attendance-splash-shade" aria-hidden="true"/><div className="attendance-splash-status"><i aria-hidden="true"/><span>Memuatkan e-Keberadaan…</span></div></div>}
    {opening&&<div className="portal-opening" role="status" aria-live="polite"><div><i aria-hidden="true"/><span><strong>Membuka {opening}</strong><small>Sila tunggu sebentar…</small></span></div></div>}
    {toast && <div className="landing-toast" role="status"><span>✓</span>{toast}</div>}
  </main>;
}

type PortalIdentity={id:string;email:string;name:string;position:string;grade:string;role:string;avatarDataUrl?:string};
function IdentityAvatar({user}:{user:PortalIdentity}){return <span className="identity-avatar">{user.avatarDataUrl?<img src={user.avatarDataUrl} alt=""/>:<b>{user.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("")}</b>}</span>}

function LoginWelcome({user,close,pushState,enableNotifications}:{user:PortalIdentity;close:()=>void;pushState:string;enableNotifications:()=>Promise<void>}){
  const [closing,setClosing]=useState(false);
  const dismiss=()=>{if(closing)return;setClosing(true);window.setTimeout(close,250)};
  return <div className={`welcome-backdrop ${closing?"is-closing":""}`} onMouseDown={event=>event.target===event.currentTarget&&dismiss()}><section className="login-welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-name"><button className="login-welcome-close" onClick={dismiss} aria-label="Tutup">×</button><div className="login-welcome-photo">{user.avatarDataUrl?<img src={user.avatarDataUrl} alt="Gambar profil pengguna"/>:<span>{user.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("")}</span>}</div><p className="login-welcome-kicker">SELAMAT DATANG</p><h2 id="welcome-name">{user.name}</h2><p className="login-welcome-position">{user.position||"Warga SMKAP"}</p><p className="login-welcome-message">{user.email}</p><button className="welcome-push-button" disabled={pushState==="loading"||pushState==="enabled"} onClick={()=>void enableNotifications()}><Bell aria-hidden="true"/>{pushState==="enabled"?"Notifikasi telah aktif":pushState==="loading"?"Mengaktifkan…":"Aktifkan notifikasi"}</button><button className="login-welcome-cta" onClick={dismiss}><span>TERUSKAN KE PORTAL</span><b aria-hidden="true">→</b></button></section></div>;
}

function StaffAnnouncementPopup({items,close}:{items:Array<{id:string;title:string;body:string;publishedAt:string;endsAt:string;imageDataUrl?:string}>;close:(readId?:string)=>void}){
  const [index,setIndex]=useState(0),item=items[index];
  return <div className="staff-announcement-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}><section className="staff-announcement-card" role="dialog" aria-modal="true" aria-labelledby="staff-announcement-title"><button className="login-welcome-close" onClick={()=>close()} aria-label="Tutup">×</button><GlassIcon icon={Bell} size="lg"/><span className="modal-overline">PENGUMUMAN GURU & STAF</span>{item.imageDataUrl&&<img className="staff-announcement-image" src={item.imageDataUrl} alt={`Gambar pengumuman ${item.title}`}/>}<h2 id="staff-announcement-title">{item.title}</h2><p>{item.body}</p><small>{new Date(`${item.publishedAt}T12:00:00`).toLocaleDateString("ms-MY",{day:"numeric",month:"long",year:"numeric"})} – {new Date(`${item.endsAt||item.publishedAt}T12:00:00`).toLocaleDateString("ms-MY",{day:"numeric",month:"long",year:"numeric"})}</small>{items.length>1&&<div className="staff-announcement-pages"><button disabled={index===0} onClick={()=>setIndex(current=>current-1)}>‹ Sebelum</button><b>{index+1} / {items.length}</b><button disabled={index===items.length-1} onClick={()=>setIndex(current=>current+1)}>Seterusnya ›</button></div>}<button className="staff-announcement-done" onClick={()=>close(item.id)}>Saya sudah baca</button></section></div>;
}

function PushNoticePopup({item,close}:{item:{id:string;title:string;body:string;createdAt:string};close:()=>void}){
  return <div className="push-notice-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}><section className="push-notice-card" role="dialog" aria-modal="true" aria-labelledby="push-notice-title"><button className="login-welcome-close" onClick={close} aria-label="Tutup">×</button><GlassIcon icon={Bell} size="lg"/><span className="modal-overline">MAKLUMAN SMKAP</span><h2 id="push-notice-title">{item.title}</h2><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString("ms-MY",{day:"numeric",month:"long",year:"numeric",hour:"numeric",minute:"2-digit"})}</small><button className="staff-announcement-done" onClick={close}>Tutup notifikasi</button></section></div>;
}



type DirectoryUser={id:string;name:string;position:string;grade:string};
function TeacherDirectory({notify}:{notify:(message:string)=>void}){
  const [users,setUsers]=useState<DirectoryUser[]>([]),[search,setSearch]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{fetch("/api/admin-users?resource=directory",{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setUsers(data.users||[]);}).catch(()=>notify("Senarai guru tidak dapat dibaca sekarang")).finally(()=>setLoading(false));},[]);
  const visible=users.filter(user=>`${user.name} ${user.position} ${user.grade}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="teacher-directory"><span className="modal-overline">DIREKTORI WARGA</span><h2 id="folder-title">Senarai guru</h2><p>Direktori Guru SMK Agama Pahang</p><label className="directory-search"><Search aria-hidden="true"/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Cari nama, jawatan atau gred"/></label><div className="directory-summary"><strong>{loading?"…":visible.length}</strong><span>{search?"padanan ditemui":"guru dan pentadbir berdaftar"}</span></div><div className="directory-list">{loading?<p className="directory-empty">Sedang memuatkan senarai guru…</p>:visible.length?visible.map(user=><article key={user.id}><span>{user.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("")}</span><div><strong>{user.name}</strong><small>{user.position||"Warga SMKAP"}</small></div><b>{user.grade||"Gred belum ditetapkan"}</b></article>):<p className="directory-empty">Tiada nama yang sepadan.</p>}</div></div>;
}
type PublicContent={settings:Record<string,string>;announcements:Array<{id:string;title:string;body:string;audience:string;publishedAt:string;imageDataUrl?:string}>;events:Array<{id:string;title:string;eventDate:string;endDate:string;category:string;details:string}>;leaders:Array<{id:string;name:string;position:string;grade:string;orgOrder?:number;imageDataUrl?:string}>};
let publicContentCache:PublicContent|null=null;
let publicContentRequest:Promise<PublicContent>|null=null;
let publicContentFetchedAt=0;
const emptyPublicContent:PublicContent={settings:{},announcements:[],events:[],leaders:[]};
function fetchPublicContent(force=false){
  if(!force&&publicContentCache&&Date.now()-publicContentFetchedAt<300_000)return Promise.resolve(publicContentCache);
  if(!force&&publicContentRequest)return publicContentRequest;
  publicContentRequest=fetch("/api/portal-content").then(async response=>{if(!response.ok)throw new Error("Kandungan portal tidak dapat dibaca");return response.json() as Promise<PublicContent>;}).then(data=>{publicContentCache=data;publicContentFetchedAt=Date.now();return data;}).finally(()=>{publicContentRequest=null;});
  return publicContentRequest;
}
function invalidatePublicContent(){publicContentCache=null;publicContentFetchedAt=0;}
function usePublicContent(){const [data,setData]=useState<PublicContent|null>(publicContentCache);useEffect(()=>{let active=true;void fetchPublicContent().then(value=>{if(active)setData(value);}).catch(()=>{if(active)setData(emptyPublicContent);});return()=>{active=false};},[]);return data;}
function SchoolProfile(){
  const data=usePublicContent(),s=data?.settings||{},phone=s.school_phone||"09-4523901",email=s.school_email||"cra8001@moe.edu.my";
  const facts=[
    {icon:Building2,label:"Kod sekolah",value:s.school_code||"CRA8001"},
    {icon:CalendarDays,label:"Ditubuhkan",value:s.school_founded||"26 Februari 1996"},
    {icon:GraduationCap,label:"Kategori",value:s.school_type||"Sekolah Kluster Kecemerlangan"},
    {icon:ShieldCheck,label:"Gred",value:s.school_grade||"Gred A"},
  ];
  return <div className="school-info-view school-profile-redesign">
    <figure className="school-profile-hero"><img src="/kampus-smkap-panorama.jpeg" alt="Bangunan SMK Agama Pahang"/><figcaption><img src="/logo-smkap.png" alt="Logo SMK Agama Pahang"/><div><span>TENTANG SEKOLAH</span><strong>{s.school_name||"Sekolah Menengah Kebangsaan Agama Pahang"}</strong><small>{s.school_motto||"Berilmu, Bertakwa"}</small></div></figcaption></figure>
    <p className="school-lead">Institusi pendidikan menengah kebangsaan agama di Muadzam Shah yang menggabungkan kecemerlangan ilmu, penghayatan agama dan pembentukan sahsiah.</p>
    <section className="school-details-section"><header><span>MAKLUMAT SEKOLAH</span><h2 id="folder-title">Identiti rasmi</h2></header><div className="school-facts">{facts.map(({icon:Icon,label,value})=><article key={label}><Icon aria-hidden="true"/><div><small>{label}</small><strong>{value}</strong></div></article>)}</div><div className="school-wide-facts"><article><MapPin aria-hidden="true"/><div><small>Alamat</small><strong>{s.school_address||"SMK Agama Pahang, 26700 Muadzam Shah, Pahang"}</strong></div></article><article><Phone aria-hidden="true"/><div><small>Telefon</small><a href={`tel:${phone.replace(/[^\d+]/g,"")}`}>{phone}</a></div><Mail aria-hidden="true"/><div><small>E-mel</small><a href={`mailto:${email}`}>{email}</a></div></article></div></section>
    <section className="school-history"><span>SEJARAH RINGKAS</span><div><time><b>1996</b><small>26 Februari</small></time><p>{s.school_history}</p></div></section>
    <section className="school-direction"><header><span>HALA TUJU</span><h2>Visi &amp; Misi</h2></header><article><span>VISI</span><strong>{s.school_vision}</strong></article><i aria-hidden="true"/><article><span>MISI</span><strong>{s.school_mission}</strong></article></section>
    <blockquote className="school-motto"><img src="/logo-smkap.png" alt=""/><div><span>COGAN KATA</span><strong>{s.school_motto||"Berilmu, Bertakwa"}</strong></div></blockquote>
    <small className="school-source-note"><b>Penafian dan Dasar Privasi:</b> Maklumat portal disediakan untuk rujukan rasmi sekolah. Data peribadi dilindungi dan hanya digunakan bagi urusan yang dibenarkan.</small>
  </div>
}
function OrganizationChart(){
  const data=usePublicContent(),[expanded,setExpanded]=useState<Record<number,boolean>>({1:true,2:false});
  useEffect(()=>{if(window.matchMedia("(min-width: 900px)").matches)setExpanded({1:true,2:true})},[]);
  const rank=(position:string)=>position.toLowerCase().includes("pengetua")&&!position.toLowerCase().includes("penolong")?0:position.toLowerCase().includes("penolong kanan")?1:2;
  const order=(position:string)=>{const p=position.toLowerCase();return ["pentadbiran","hal ehwal murid","kokurikulum","tingkatan enam","bahasa","sains & matematik","kemanusiaan","teknik & vokasional","pendidikan islam"].findIndex(term=>p.includes(term))};
  const leaders=[...(data?.leaders||[])].sort((a,b)=>(a.orgOrder??999)-(b.orgOrder??999)||rank(a.position)-rank(b.position)||(order(a.position)<0?99:order(a.position))-(order(b.position)<0?99:order(b.position))||a.position.localeCompare(b.position));
  const card=(person:typeof leaders[number],root=false)=><article key={person.id} className={`org-person ${root?"org-person-root":""}`}>{person.imageDataUrl?<img src={person.imageDataUrl} alt={`Gambar ${person.name}`}/>:<span>{person.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("")}</span>}<div><strong>{person.name}</strong><small>{person.position}</small>{person.grade&&<b>{person.grade}</b>}</div></article>;
  const root=leaders.filter(person=>rank(person.position)===0),sections=[{level:1,title:"Barisan Penolong Kanan"},{level:2,title:"Guru Kanan Mata Pelajaran"}];
  if(!data)return <div className="org-view org-redesign"><span className="modal-overline">STRUKTUR KEPIMPINAN</span><h2 id="folder-title">Carta Organisasi</h2><div className="org-skeleton"><i/><span/><span/></div></div>;
  return <div className="org-view org-redesign"><header className="org-intro"><span className="modal-overline">STRUKTUR KEPIMPINAN</span><h2 id="folder-title">Carta Organisasi</h2></header><div className="org-tree-new">{root.length?<section className="org-root"><h3>Pengetua</h3>{root.map(person=>card(person,true))}</section>:<p className="org-empty">Maklumat Pengetua belum dilengkapkan oleh Admin.</p>}<i className="org-connector" aria-hidden="true"/>{sections.map(({level,title})=>{const members=leaders.filter(person=>rank(person.position)===level);if(!members.length)return null;const open=expanded[level];return <section key={level} className={`org-branch ${open?"is-open":""}`}><button className="org-branch-toggle" onClick={()=>setExpanded(current=>({...current,[level]:!current[level]}))} aria-expanded={open}><span><small>ARAS {level+1}</small><strong>{title}</strong></span><b>{members.length} pegawai</b><ChevronDown aria-hidden="true"/></button><div className="org-branch-content">{members.map(person=>card(person))}</div></section>})}</div></div>
}
function PublicAnnouncements(){const data=usePublicContent();return <div className="public-list-view"><span className="modal-overline">HEBAHAN SEKOLAH</span><h2 id="folder-title">Pengumuman terkini</h2><p>Makluman rasmi yang diterbitkan oleh pihak sekolah.</p><div>{data?.announcements.length?data.announcements.map(item=><article key={item.id}><span>{new Date(`${item.publishedAt}T12:00:00`).toLocaleDateString("ms-MY",{day:"2-digit",month:"short"})}</span><div>{item.imageDataUrl&&<img className="public-announcement-image" src={item.imageDataUrl} alt={`Gambar pengumuman ${item.title}`}/>}<small>{item.audience}</small><strong>{item.title}</strong><p>{item.body}</p></div></article>):<p className="directory-empty">Belum ada pengumuman diterbitkan.</p>}</div></div>}
function SchoolCalendar(){const data=usePublicContent();return <div className="public-list-view calendar-view"><span className="modal-overline">TAKWIM SEKOLAH</span><h2 id="folder-title">Aktiviti dan tarikh penting</h2><p>Semak program sekolah, akademik, HEM dan kokurikulum.</p><div>{data?.events.length?data.events.map(item=><article key={item.id}><span>{new Date(`${item.eventDate}T12:00:00`).toLocaleDateString("ms-MY",{day:"2-digit",month:"short"})}</span><div><small>{item.category}{item.endDate!==item.eventDate?` · hingga ${new Date(`${item.endDate}T12:00:00`).toLocaleDateString("ms-MY",{day:"2-digit",month:"short"})}`:""}</small><strong>{item.title}</strong>{item.details&&<p>{item.details}</p>}</div></article>):<p className="directory-empty">Takwim belum dikemas kini.</p>}</div></div>}
function ReliefIntegratedApp({user}:{user:PortalIdentity|null}) {
  const [ready, setReady] = useState(false);
  return <div className="relief-integrated-shell">
    {!ready && <div className="relief-integrated-loading"><i></i><strong>Menyediakan E‑Keberadaan & Sistem Relief lengkap…</strong><small>Guru · Tingkatan 6 · Rumusan · Admin · Relief</small></div>}
    <iframe className={ready ? "ready" : ""} src="/ekeberadaan-app/standalone.html" title="E-Keberadaan dan Sistem Relief SMKAP" onLoad={(event) => {event.currentTarget.contentWindow?.postMessage({type:"SMKAP_IDENTITY",user},window.location.origin);window.setTimeout(() => setReady(true), 300)}} allow="clipboard-write; fullscreen" />
  </div>;
}


const monitoringClasses: Record<string, string[]> = {
  "Tingkatan 1": ["1IS · Ibnu Sina", "1AB · Al Biruni", "1AK · Al Khawarizmi", "1AT · At Tusi", "1IK · Ibnu Khaldun"],
  "Tingkatan 2": ["2IS · Ibnu Sina", "2AB · Al Biruni", "2AK · Al Khawarizmi", "2AT · At Tusi", "2IK · Ibnu Khaldun"],
  "Tingkatan 3": ["3IS · Ibnu Sina", "3AB · Al Biruni", "3AK · Al Khawarizmi", "3AT · At Tusi", "3IK · Ibnu Khaldun"],
  "Tingkatan 4": ["4AB · Al Biruni", "4AK · Al Khawarizmi", "4AT · At Tusi", "4IK · Ibnu Khaldun"],
  "Tingkatan 5": ["5AB · Al Biruni", "5AK · Al Khawarizmi", "5AT · At Tusi", "5IK · Ibnu Khaldun"],
  "Tingkatan 6": ["6AN", "6AZ", "6 AS Sayuti", "6 AS Sufi"],
};
const monitoringFacilities = ["Pusat Sumber Sekolah", "Pusat Akses", "Bilik Gerakan", "Bilik KKQ", "Bilik Media", "Bilik Seni", "Bengkel RBT", "Makmal Sibaweh", "Makmal Komputer 1", "Makmal Komputer 2", "Makmal Sains", "Dewan Al Farabi", "Surau As-Syafie", "Kantin", "Dewan Makan", "Aspura", "Aspuri"];

function MonitoringCentre({ notify, user }: { notify: (message:string)=>void; user:PortalIdentity|null }) {
  const today=new Date().toISOString().slice(0,10);
  const [tab,setTab]=useState<"dashboard"|"form"|"preview">("dashboard");
  const [reports,setReports]=useState<OprReport[]>(()=>oprMemoryCache?.filter(item=>item.category===monitoringCategory)||[]);
  const [loading,setLoading]=useState(!oprMemoryCache),[saving,setSaving]=useState(false),[rendering,setRendering]=useState(false),[enhancing,setEnhancing]=useState(false);
  const [photos,setPhotos]=useState<File[]>([]),[previewUrl,setPreviewUrl]=useState(""),[pdfBase64,setPdfBase64]=useState(""),[selected,setSelected]=useState<OprReport|null>(null);
  const [form,setForm]=useState({title:"",monitoringFocus:"",date:today,time:"",locationType:"Kelas",formLevel:"",className:"",facility:"",otherLocation:"",notes:"",action:"",preparedBy:user?.name||"",preparedRole:user?.position||"",verifier:"Wan Harun Bin Wan Ali",verifierRole:"Pengetua"});
  const location=form.locationType==="Kelas"?form.className:form.locationType==="Kemudahan sekolah"?form.facility:form.otherLocation;
  const setField=(key:keyof typeof form,value:string)=>setForm(current=>({...current,[key]:value}));
  const clean=(value:string)=>value.normalize("NFKD").replace(/[^a-zA-Z0-9 &().-]/g,"").replace(/\s+/g," ").trim().slice(0,80)||"Tidak dinyatakan";
  const dataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  const base64=async(blob:Blob)=>(await dataUrl(blob)).split(",")[1]||"";
  const meta=(report:OprReport)=>{const base=report.name.replace(/\.pdf$/i,"");const fields=["TEMPAT","PEMANTAU","MASA"];const read=(key:string)=>{const from=base.indexOf(`__${key}__`);if(from<0)return"";const start=from+key.length+4;const end=fields.map(field=>base.indexOf(`__${field}__`,start)).filter(value=>value>=0).sort((a,b)=>a-b)[0]??base.length;return base.slice(start,end).replace(/[_-]+$/g,"").trim();};const marker=base.indexOf("__TEMPAT__");const lead=(marker>=0?base.slice(0,marker):base).match(/^(\d{4}-\d{2}-\d{2})-E-PEMANTAUAN-(.*)$/);return {date:lead?.[1]||report.updatedAt.slice(0,10),title:lead?.[2]||base,location:read("TEMPAT"),preparedBy:read("PEMANTAU"),time:read("MASA")};};
  const load=async(refresh=false)=>{setLoading(true);try{const all=await fetchOprIndex(refresh);setReports(all.filter(item=>item.category===monitoringCategory));}catch{notify("Rekod e-Pemantauan tidak dapat dibaca sekarang");}finally{setLoading(false);}};
  useEffect(()=>{void load(false);},[]);
  useEffect(()=>{if(user)setForm(current=>({...current,preparedBy:current.preparedBy||user.name,preparedRole:current.preparedRole||user.position}));},[user]);
  useEffect(()=>{setForm(current=>{const uppercase=(value:string)=>value.toLocaleUpperCase("ms-MY");const next={...current,preparedBy:uppercase(current.preparedBy),preparedRole:uppercase(current.preparedRole),verifier:uppercase(current.verifier),verifierRole:uppercase(current.verifierRole)};return next.preparedBy===current.preparedBy&&next.preparedRole===current.preparedRole&&next.verifier===current.verifier&&next.verifierRole===current.verifierRole?current:next;});},[form.preparedBy,form.preparedRole,form.verifier,form.verifierRole]);
  const compressPhoto=async(file:File)=>{if(file.size<=3_000_000)return file;const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const url=URL.createObjectURL(file),element=new Image();element.onload=()=>{URL.revokeObjectURL(url);resolve(element);};element.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Gambar tidak dapat dibaca"));};element.src=url;}),limit=1920,ratio=Math.min(1,limit/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));const context=canvas.getContext("2d");if(!context)throw new Error("Gambar tidak dapat dimampatkan");context.drawImage(image,0,0,canvas.width,canvas.height);let quality=.86,blob:Blob|null=null;while(quality>=.42){blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));if(blob&&blob.size<=2_750_000)break;quality-=.08;}if(!blob||blob.size>3_000_000)throw new Error("Gambar masih terlalu besar selepas dimampatkan");return new File([blob],`${file.name.replace(/\.[^.]+$/,"")}.jpg`,{type:"image/jpeg"});};
  const preparePhotos=async(files:File[])=>{try{const compressed=await Promise.all(files.slice(0,2).map(compressPhoto));setPhotos(compressed);notify(files.some((file,index)=>file.size!==compressed[index].size)?"Gambar besar telah dimampatkan untuk PDF":"Gambar dipilih");}catch(error){notify(error instanceof Error?error.message:"Gambar tidak dapat diproses");}};
  useEffect(()=>{if(tab!=="form")return;const input=document.querySelector<HTMLInputElement>(".monitoring-form input[type=file][multiple]");const intercept=(event:Event)=>{event.stopPropagation();event.stopImmediatePropagation();const files=Array.from((event.currentTarget as HTMLInputElement).files||[]);if(files.length>2)notify("Maksimum 2 gambar sahaja");void preparePhotos(files);};input?.addEventListener("change",intercept,true);return()=>input?.removeEventListener("change",intercept,true);},[tab]);
  const enhance=async()=>{if(!form.notes.trim())return notify("Masukkan catatan pemantauan dahulu");setEnhancing(true);try{const response=await fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:form.notes,title:form.title||"Pemantauan sekolah",category:monitoringCategory,objective:"",outcome:form.action})}),result=await response.json() as {details?:string;outcome?:string;error?:string};if(!response.ok||!result.details)throw new Error(result.error||"Gemini tidak dapat memproses catatan");setForm(current=>({...current,notes:result.details||current.notes,action:result.outcome||current.action}));notify("Catatan pemantauan telah dikemaskan oleh Gemini AI");}catch(error){notify(error instanceof Error?error.message:"Gemini tidak dapat digunakan sekarang");}finally{setEnhancing(false);}};
  const complete=Boolean(form.title&&form.date&&location&&form.notes&&form.preparedBy&&form.preparedRole);
  const makePdf=async()=>{const jsPDF=await loadJsPdf();const pdf=new jsPDF({unit:"mm",format:"a4",compress:true});const navy=[20,55,83] as const,accent=[46,133,176] as const,pale=[234,247,253] as const,x=12,w=186;pdf.setProperties({title:form.title,subject:"e-Pemantauan SMKAP",author:form.preparedBy});pdf.setFillColor(205,233,247);pdf.rect(0,0,210,37,"F");pdf.setFillColor(241,250,254);pdf.roundedRect(4,4,202,29,6,6,"F");try{pdf.addImage(await dataUrl(await (await fetch("/logo-smkap.png")).blob()),"PNG",9,9,59,15,undefined,"FAST");}catch{}pdf.setTextColor(...navy);pdf.setFont("helvetica","bold");pdf.setFontSize(15);pdf.text("SMK AGAMA PAHANG",73,14);pdf.setFontSize(8);pdf.setFont("helvetica","normal");pdf.text("E-PEMANTAUAN · ONE PAGE REPORT",73,21);pdf.text(`RUJUKAN: EP/${form.date.replace(/-/g,"")}`,198,12,{align:"right"});pdf.setFont("helvetica","bold");pdf.setFontSize(15);const titleLines=pdf.splitTextToSize(form.title.toUpperCase(),w);pdf.text(titleLines.slice(0,2),x,47);const titleY=47+Math.min(2,titleLines.length)*6;const day=new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${form.date}T12:00:00`));const cells=[["TARIKH",form.date],["HARI",day],["MASA",form.time||"-"],["TEMPAT",location],["PEMANTAU",form.preparedBy]];cells.forEach(([label,value],i)=>{const bx=x+i*37.6;pdf.setFillColor(...pale);pdf.roundedRect(bx,titleY+2,35.5,17,2,2,"F");pdf.setTextColor(...accent);pdf.setFontSize(6.5);pdf.setFont("helvetica","bold");pdf.text(label,bx+3,titleY+7);pdf.setTextColor(...navy);pdf.setFontSize(7.8);pdf.text(pdf.splitTextToSize(value,29).slice(0,2),bx+3,titleY+12);});const section=(label:string,value:string,y:number,h:number)=>{pdf.setFillColor(255,255,255);pdf.setDrawColor(210,222,230);pdf.roundedRect(x,y,w,h,2,2,"FD");pdf.setFillColor(...accent);pdf.roundedRect(x,y,w,8,2,2,"F");pdf.setTextColor(255,255,255);pdf.setFont("helvetica","bold");pdf.setFontSize(7);pdf.text(label,x+3,y+5.3);pdf.setTextColor(52,64,74);pdf.setFont("helvetica","normal");pdf.setFontSize(8.3);pdf.text(pdf.splitTextToSize(value||"Belum dinyatakan.",w-7).slice(0,Math.floor((h-12)/4.2)),x+3,y+14,{lineHeightFactor:1.25});};const top=titleY+23;section("LAPORAN PEMANTAUAN",form.notes,top,42);section("CATATAN / TINDAKAN SUSULAN",form.action,top+46,28);const photoY=top+79;pdf.setTextColor(...navy);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.text("DOKUMENTASI PEMANTAUAN",x,photoY);pdf.setFillColor(...pale);pdf.setDrawColor(210,222,230);pdf.roundedRect(x,photoY+3,w,68,2,2,"FD");for(let i=0;i<photos.length;i++){const source=await dataUrl(photos[i]),cellW=photos.length===1?174:84,px=x+3+i*(photos.length===1?0:90),py=photoY+6,props=pdf.getImageProperties(source),ratio=Math.min(cellW/props.width,60/props.height),iw=props.width*ratio,ih=props.height*ratio;pdf.addImage(source,photos[i].type==="image/png"?"PNG":"JPEG",px+(cellW-iw)/2,py+(60-ih)/2,iw,ih,undefined,"FAST");}if(!photos.length){pdf.setTextColor(100,120,130);pdf.setFont("helvetica","italic");pdf.text("Tiada gambar dilampirkan.",105,photoY+37,{align:"center"});}const signY=photoY+78;[["DISEDIAKAN OLEH",form.preparedBy,form.preparedRole],["DISAHKAN OLEH",form.verifier,form.verifierRole]].forEach(([label,name,role],i)=>{const sx=x+i*96;pdf.setDrawColor(210,222,230);pdf.roundedRect(sx,signY,90,23,2,2,"S");pdf.setTextColor(...accent);pdf.setFont("helvetica","bold");pdf.setFontSize(6.5);pdf.text(label,sx+4,signY+6);pdf.setTextColor(...navy);pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(name,82).slice(0,2),sx+4,signY+12);pdf.setFont("helvetica","normal");pdf.setFontSize(7);pdf.text(pdf.splitTextToSize(role,82).slice(0,2),sx+4,signY+19);});pdf.setFillColor(...accent);pdf.rect(0,289,210,8,"F");pdf.setTextColor(255,255,255);pdf.setFontSize(6.5);pdf.text("Portal Rasmi SMK Agama Pahang | Dokumen dijana secara digital",12,294);pdf.text("SMKAP",198,294,{align:"right"});const blob=pdf.output("blob");return{url:URL.createObjectURL(blob),base64:await base64(blob)}};
  const preview=async()=>{if(!complete)return notify("Lengkapkan tajuk, tarikh, tempat dan catatan dahulu");setRendering(true);try{const pdf=await makePdf();if(previewUrl)URL.revokeObjectURL(previewUrl);setPreviewUrl(pdf.url);setPdfBase64(pdf.base64);setTab("preview");}catch{notify("Pratonton PDF tidak dapat dijana");}finally{setRendering(false);}};
  const save=async()=>{if(!pdfBase64)return notify("Sila jana pratonton PDF dahulu");setSaving(true);try{const name=`${form.date}-E-PEMANTAUAN-${clean(form.title)}__TEMPAT__${clean(location)}__PEMANTAU__${clean(form.preparedBy)}__MASA__${clean(form.time||"-")}.pdf`;const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:monitoringCategory,metadata:{title:form.title,programDate:form.date,monitoringFocus:form.monitoringFocus,monitoringNotes:form.notes,monitoringAction:form.action},files:[{name,mimeType:"application/pdf",base64:pdfBase64}]})}),data=await response.json() as {files?:OprReport[];error?:string};if(!response.ok||!data.files?.[0])throw new Error(data.error||"PDF tidak dapat dihantar");rememberOprReport(data.files[0]);setReports(current=>[data.files![0],...current]);setTab("dashboard");setPhotos([]);setPdfBase64("");notify("OPR pemantauan berjaya disimpan ke Google Drive");}catch(error){notify(error instanceof Error?error.message:"PDF tidak dapat dihantar ke Google Drive");}finally{setSaving(false);}};
  if(selected){const item=meta(selected);return <div className="monitoring-shell"><div className="monitoring-preview"><button className="module-preview-close" onClick={()=>setSelected(null)} aria-label="Tutup pratonton">×</button><span className="modal-overline">PDF E-PEMANTAUAN · GOOGLE DRIVE SEKOLAH</span><h2>{item.title}</h2><p>{item.date} · {item.location} · {item.preparedBy}</p><DrivePdfPreview fileId={selected.id} title={item.title}/><a href={`/api/drive?file=${encodeURIComponent(selected.id)}&download=1`}>Muat turun PDF</a></div></div>}
  return <div className="monitoring-shell"><header className="monitoring-head"><div><span className="modal-overline">E-PEMANTAUAN SMKAP</span><h2 id="folder-title">Pemantauan sekolah</h2><p>Catat pemerhatian dan hasilkan OPR di lokasi dengan pantas.</p></div>{tab!=="dashboard"&&<button onClick={()=>setTab("dashboard")}>Kembali ke dashboard</button>}</header>{tab==="dashboard"&&<><section className="monitoring-start"><div><GlassIcon icon={Search} size="lg"/><div><strong>Buat Pemantauan Baharu</strong><span>Tekan di sini untuk mula merekod.</span></div></div><button onClick={()=>setTab("form")}>＋ Mula pemantauan</button></section><div className="achievement-kpis"><article><span>JUMLAH PEMANTAUAN</span><strong>{reports.length}</strong><small>Rekod sepanjang masa</small></article><article><span>BULAN INI</span><strong>{reports.filter(r=>r.updatedAt.slice(0,7)===today.slice(0,7)).length}</strong><small>Pemantauan direkodkan bulan ini</small></article><article><span>STATUS</span><strong className="word">Sedia</strong><small>Semua PDF difailkan di Drive</small></article></div><section className="achievement-list"><div><span className="modal-overline">REKOD TERKINI</span><h3>{reports.length} rekod e-Pemantauan</h3></div>{loading&&!reports.length?<p className="achievement-empty">Membaca rekod daripada Google Drive…</p>:reports.length?<div className="achievement-grid">{reports.slice(0,12).map(report=>{const item=meta(report);return <button key={report.id} onClick={()=>setSelected(report)}><span className="achievement-file"><Search/></span><div><small>E-PEMANTAUAN</small><strong>{item.title}</strong><p>{item.location}</p><em>{item.preparedBy||"Tidak dinyatakan"} | {item.date}</em></div><ChevronRight/></button>})}</div>:<p className="achievement-empty">Belum ada rekod pemantauan. Tekan “Mula pemantauan” untuk mencipta rekod pertama.</p>}</section></>}{tab==="form"&&<form className="monitoring-form" onSubmit={(e)=>{e.preventDefault();void preview();}}><div className="generator-steps"><b>1</b><span>Detail</span><i></i><b>2</b><span>Gambar</span><i></i><b>3</b><span>Preview</span><i></i><b>4</b><span>Simpan</span></div><section><span>01</span><div><h3>Rekod pemantauan baharu</h3><p>Isi maklumat penting sahaja sebelum memilih gambar.</p></div><div className="monitoring-grid"><label>Tajuk pemantauan *<input value={form.title} onChange={e=>setField("title",e.target.value)} placeholder="Contoh: Pemantauan Kelas" required/></label><label>Tarikh *<input type="date" value={form.date} onChange={e=>setField("date",e.target.value)} required/></label><label>Masa<input type="time" value={form.time} onChange={e=>setField("time",e.target.value)}/></label><label>Perkara dipantau *<select value={form.monitoringFocus} onChange={e=>setField("monitoringFocus",e.target.value)} required><option value="">Pilih perkara dipantau</option>{monitoringTopics.map(topic=><option key={topic.id} value={topic.id}>{topic.label}</option>)}<option value="review">Lain-lain / perlukan semakan</option></select></label><label>Jenis tempat<select value={form.locationType} onChange={e=>{setField("locationType",e.target.value);setField("className","");setField("facility","");}}><option>Kelas</option><option>Kemudahan sekolah</option><option>Lokasi lain</option></select></label>{form.locationType==="Kelas"&&<><label>Tingkatan<select value={form.formLevel} onChange={e=>{setField("formLevel",e.target.value);setField("className","");}} required><option value="">Pilih tingkatan</option>{Object.keys(monitoringClasses).map(level=><option key={level}>{level}</option>)}</select></label><label>Nama kelas<select value={form.className} onChange={e=>setField("className",e.target.value)} disabled={!form.formLevel} required><option value="">{form.formLevel?"Pilih nama kelas":"Pilih tingkatan dahulu"}</option>{(monitoringClasses[form.formLevel]||[]).map(item=><option key={item}>{item}</option>)}</select></label></>}{form.locationType==="Kemudahan sekolah"&&<label className="monitoring-wide">Pilih tempat<select value={form.facility} onChange={e=>setField("facility",e.target.value)} required><option value="">Pilih kemudahan</option>{monitoringFacilities.map(item=><option key={item}>{item}</option>)}</select></label>}{form.locationType==="Lokasi lain"&&<label className="monitoring-wide">Tulis tempat sendiri<input value={form.otherLocation} onChange={e=>setField("otherLocation",e.target.value)} placeholder="Contoh: Laluan utama sekolah" required/></label>}<label className="monitoring-wide">Catatan pemantauan *<textarea rows={5} value={form.notes} onChange={e=>setField("notes",e.target.value)} placeholder="Catat pemerhatian sebenar di lokasi…" required/></label><button type="button" className="generator-ai" onClick={()=>void enhance()} disabled={enhancing}><span>✦</span><span>{enhancing?"Gemini sedang mengemas…":"Kemaskan catatan dengan Gemini AI"}<small>AI mengekalkan fakta asal dan menyusun catatan dengan lebih kemas</small></span></button><label className="monitoring-wide">Catatan / tindakan susulan<textarea rows={3} value={form.action} onChange={e=>setField("action",e.target.value)} placeholder="Tindakan segera atau cadangan susulan jika ada"/></label></div></section><section><span>02</span><div><h3>Dokumentasi pemantauan</h3><p>Pilih maksimum 2 gambar. Gambar akan dimasukkan ke dalam PDF.</p></div><label className="photo-drop">Gambar pemantauan<input type="file" accept="image/jpeg,image/png" multiple onChange={e=>{const chosen=Array.from(e.target.files||[]).slice(0,2);if((e.target.files?.length||0)>2)notify("Maksimum 2 gambar sahaja");if(chosen.some(file=>file.size>3_000_000))return notify("Setiap gambar mesti 3 MB atau kurang");setPhotos(chosen);}}/><span>＋ Pilih gambar daripada peranti</span><small>{photos.length?`${photos.length} daripada 2 gambar dipilih`:"Maksimum 2 gambar · JPG atau PNG · pilihan"}</small></label>{photos.length>0&&<div className="photo-preview-strip">{photos.map((file,index)=><div key={file.name+index}><img src={URL.createObjectURL(file)} alt={`Gambar pemantauan ${index+1}`}/><button type="button" onClick={()=>setPhotos(current=>current.filter((_,i)=>i!==index))}>×</button></div>)}</div>}</section><section><span>03</span><div><h3>Pengesahan laporan</h3><p>Nama anda diisi automatik daripada akaun DELIMa dan masih boleh dikemas kini.</p></div><div className="monitoring-grid"><label>Disediakan oleh *<input value={form.preparedBy} onChange={e=>setField("preparedBy",e.target.value)} required/></label><label>Jawatan *<input value={form.preparedRole} onChange={e=>setField("preparedRole",e.target.value)} required/></label><label>Disahkan oleh<input value={form.verifier} onChange={e=>setField("verifier",e.target.value)}/></label><label>Jawatan pengesah<input value={form.verifierRole} onChange={e=>setField("verifierRole",e.target.value)}/></label></div></section><button className="monitoring-primary" disabled={!complete||rendering}>{rendering?"Menyediakan pratonton…":"Seterusnya: Pratonton OPR"}</button></form>}{tab==="preview"&&<section className="monitoring-preview"><span className="modal-overline">PRATONTON OPR</span><h2>{form.title}</h2><p>Semak kandungan sebelum disimpan ke Google Drive.</p><iframe src={previewUrl} title="Pratonton OPR pemantauan"/><div><button onClick={()=>setTab("form")}>Kembali edit</button><button className="monitoring-primary" onClick={()=>void save()} disabled={saving}>{saving?"Sedang menyimpan…":"Sahkan & Simpan ke Google Drive"}</button></div></section>}</div>
}


const achievementLevels = ["Sekolah", "Daerah", "Negeri", "Kebangsaan", "Antarabangsa"];
const achievementFields = ["Akademik", "Kokurikulum", "Sukan", "Inovasi", "Sahsiah", "Lain-lain"];

type AchievementBundleItem = {
  page: number;
  blob: Blob;
  recipient: string;
  achievement: string;
  confidence: number;
  status: "reading" | "review" | "saved" | "error";
  error?: string;
};

function AchievementArchive({ notify }: { notify: (message: string) => void }) {
  const today = new Date().toISOString().slice(0,10);
  const [tab,setTab] = useState<"dashboard"|"upload">("dashboard");
  const [reports,setReports] = useState<OprReport[]>(()=>oprMemoryCache?.filter((item)=>item.category===achievementCategory)||[]);
  const [loading,setLoading] = useState(!oprMemoryCache);
  const [saving,setSaving] = useState(false);
  const [search,setSearch] = useState("");
  const [levelFilter,setLevelFilter] = useState("Semua peringkat");
  const [selected,setSelected] = useState<OprReport|null>(null);
  const [archiveUser,setArchiveUser] = useState<PortalIdentity|null>(null);
  const [deleteTarget,setDeleteTarget] = useState<OprReport|null>(null);
  const [deleting,setDeleting] = useState(false);
  const [bundling,setBundling] = useState(false);
  const [files,setFiles] = useState<File[]>([]);
  const [uploadMode,setUploadMode] = useState<"single"|"bundle">("single");
  const [bundleItems,setBundleItems] = useState<AchievementBundleItem[]>([]);
  const [readingBundle,setReadingBundle] = useState(false);
  const [readProgress,setReadProgress] = useState({done:0,total:0});
  const [saveProgress,setSaveProgress] = useState({done:0,total:0});
  const [form,setForm] = useState({title:"",date:today,venue:"",level:"Daerah",field:"Kokurikulum",unitCategory:"",achievement:"",uploadedBy:""});
  const isArchiveAdmin=archiveUser?.role==="admin"||archiveUser?.role==="super_admin";
  const removeArchiveReport=async()=>{if(!deleteTarget)return;setDeleting(true);try{const response=await fetch(`/api/drive?id=${encodeURIComponent(deleteTarget.id)}`,{method:"DELETE"}),data=await response.json() as{error?:string};if(!response.ok)throw new Error(data.error||"Laporan tidak dapat dipadam");setReports(current=>current.filter(item=>item.id!==deleteTarget.id));if(oprMemoryCache)oprMemoryCache=oprMemoryCache.filter(item=>item.id!==deleteTarget.id);setSelected(current=>current?.id===deleteTarget.id?null:current);setDeleteTarget(null);notify("Laporan berjaya dipadam daripada Google Drive");}catch(error){notify(error instanceof Error?error.message:"Laporan tidak dapat dipadam");}finally{setDeleting(false);}};
  const downloadArchiveBundle=async()=>{if(!reports.length)return notify("Tiada laporan untuk dimuat turun");setBundling(true);try{const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"bundle",ids:reports.map(item=>item.id)})});if(!response.ok){const data=await response.json() as{error?:string};throw new Error(data.error||"Bundle tidak dapat disediakan");}const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="Arkib-Kejayaan-SMKAP.zip";link.click();URL.revokeObjectURL(url);notify("Bundle Arkib Kejayaan berjaya dimuat turun");}catch(error){notify(error instanceof Error?error.message:"Bundle tidak dapat dimuat turun");}finally{setBundling(false);}};
  const clean=(value:string)=>value.normalize("NFKD").replace(/[^a-zA-Z0-9 &().-]/g,"").replace(/\s+/g," ").trim().slice(0,70)||"Tidak dinyatakan";
  const meta=(report:OprReport)=>{const base=report.name.replace(/\.(pdf|png|jpe?g)$/i,"");const fields=["TEMPAT","PERINGKAT","BIDANG","PENCAPAIAN","PENYEDIA"];const read=(key:string)=>{const start=base.indexOf(`__${key}__`);if(start<0)return"";const valueStart=start+key.length+4;const next=fields.map(field=>base.indexOf(`__${field}__`,valueStart)).filter(index=>index>=0).sort((a,b)=>a-b)[0]??base.length;return base.slice(valueStart,next).replace(/[_-]+$/g,"").trim();};const marker=base.indexOf("__TEMPAT__"),lead=(marker>=0?base.slice(0,marker):base).match(/^(\d{4}-\d{2}-\d{2})-ARKIB-(.*)$/);return{date:lead?.[1]||report.updatedAt.slice(0,10),title:(lead?.[2]||base).trim(),venue:read("TEMPAT"),level:read("PERINGKAT"),field:read("BIDANG"),achievement:read("PENCAPAIAN"),uploadedBy:read("PENYEDIA")};};
  const load=async(refresh=false)=>{setLoading(true);try{const all=await fetchOprIndex(refresh);setReports(all.filter((item)=>item.category===achievementCategory));}catch{notify("Arkib kejayaan tidak dapat dibaca sekarang");}finally{setLoading(false);}};
  useEffect(()=>{void load(false);void fetch("/api/admin-users?resource=me",{cache:"no-store"}).then(async response=>{const data=await response.json() as{me?:PortalIdentity};if(response.ok&&data.me){setArchiveUser(data.me);setForm(current=>({...current,uploadedBy:current.uploadedBy||data.me!.name}));}}).catch(()=>{});},[]);
  if(selected){const item=meta(selected);return <div className="achievement-shell"><div className="achievement-preview"><button className="module-preview-close" onClick={()=>setSelected(null)} aria-label="Tutup pratonton">×</button><span className="modal-overline">PDF SEBENAR · GOOGLE DRIVE SEKOLAH</span><h2>{item.title}</h2><p>{new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${item.date}T12:00:00`))} · {item.level}</p><div className="achievement-document"><DrivePdfPreview fileId={selected.id} title={`Sijil ${item.title}`}/></div><div className="achievement-preview-meta"><span><small>Pencapaian</small><strong>{item.achievement}</strong></span><span><small>Tempat</small><strong>{item.venue}</strong></span><span><small>Bidang</small><strong>{item.field}</strong></span><span><small>Dimuat naik oleh</small><strong>{item.uploadedBy}</strong></span></div><div className="achievement-preview-actions"><a href={`https://drive.google.com/uc?export=download&id=${encodeURIComponent(selected.id)}`}>Muat turun fail</a>{isArchiveAdmin&&<button onClick={()=>setDeleteTarget(selected)}>Padam laporan</button>}{isArchiveAdmin&&<button onClick={()=>void downloadArchiveBundle()} disabled={bundling}>{bundling?"Menyediakan ZIP…":"Muat turun semua Arkib"}</button>}</div></div>{deleteTarget&&<div className="achievement-confirm" role="alertdialog" aria-modal="true"><section><span>PADAM LAPORAN</span><h3>Padam “{meta(deleteTarget).title}”?</h3><p>Fail akan dipindahkan ke tong sampah Google Drive dan tidak lagi muncul dalam dashboard.</p><div><button onClick={()=>setDeleteTarget(null)} disabled={deleting}>Batal</button><button onClick={()=>void removeArchiveReport()} disabled={deleting}>{deleting?"Sedang memadam…":"Ya, padam laporan"}</button></div></section></div>}</div>}
  const visible=reports.filter((report)=>{const item=meta(report);const haystack=Object.values(item).join(" ").toLowerCase();return haystack.includes(search.toLowerCase())&&(levelFilter==="Semua peringkat"||item.level===levelFilter);});
  const thisYear=reports.filter((report)=>meta(report).date.startsWith(String(new Date().getFullYear()))).length;
  const levelCounts=achievementLevels.map((level)=>({level,count:reports.filter((report)=>meta(report).level===level).length})).sort((a,b)=>b.count-a.count);
  const fileBase64=async(blob:Blob)=>await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  const imageAsPdf=async(source:File)=>{const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(source);});const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error("Gambar tidak dapat dibaca"));image.src=dataUrl;});const landscape=dimensions.width>dimensions.height;const jsPDF=await loadJsPdf();const pdf=new jsPDF({orientation:landscape?"landscape":"portrait",unit:"mm",format:"a4",compress:true});const pageWidth=pdf.internal.pageSize.getWidth();const pageHeight=pdf.internal.pageSize.getHeight();const margin=8;const ratio=Math.min((pageWidth-margin*2)/dimensions.width,(pageHeight-margin*2)/dimensions.height);const width=dimensions.width*ratio;const height=dimensions.height*ratio;pdf.addImage(dataUrl,source.type==="image/png"?"PNG":"JPEG",(pageWidth-width)/2,(pageHeight-height)/2,width,height,undefined,"FAST");return pdf.output("blob");};
  const updateBundleItem=(page:number,patch:Partial<AchievementBundleItem>)=>setBundleItems(current=>current.map(item=>item.page===page?{...item,...patch}:item));
  const prepareBundle=async(source:File)=>{
    if(source.type!=="application/pdf"&&!source.name.toLowerCase().endsWith(".pdf"))return notify("PDF bundle diperlukan");
    if(source.size>30_000_000)return notify("PDF bundle mesti 30 MB atau kurang");
    setReadingBundle(true);setReadProgress({done:0,total:0});setBundleItems([]);setFiles([source]);
    try{
      const {PDFDocument}=await import("pdf-lib");
      const original=await PDFDocument.load(await source.arrayBuffer());
      const total=original.getPageCount();
      if(total<2)throw new Error("PDF ini hanya satu halaman. Pilih ‘Fail biasa’ untuk memuat naik.");
      if(total>40)throw new Error("Maksimum 40 halaman bagi satu PDF bundle.");
      const pages:AchievementBundleItem[]=[];
      for(let index=0;index<total;index+=1){
        const pagePdf=await PDFDocument.create();
        const [copied]=await pagePdf.copyPages(original,[index]);
        pagePdf.addPage(copied);
        const bytes=await pagePdf.save({useObjectStreams:true});
        const blob=new Blob([bytes],{type:"application/pdf"});
        pages.push({page:index+1,blob,recipient:"",achievement:"",confidence:0,status:blob.size>6_000_000?"error":"review",error:blob.size>6_000_000?"Halaman ini melebihi 6 MB":""});
      }
      setBundleItems(pages);setReadProgress({done:total,total});
      notify(`${total} halaman berjaya dipecahkan. Isi nama penerima sebelum simpan.`);
    }catch(error){setFiles([]);setBundleItems([]);notify(error instanceof Error?error.message:"PDF bundle tidak dapat diproses");}
    finally{setReadingBundle(false);}
  };
  const readBundleWithAi=async()=>{
    if(!isArchiveAdmin)return notify("Fungsi AI hanya tersedia untuk pentadbir");
    const readable=bundleItems.filter(item=>item.blob.size<=6_000_000&&item.status!=="saved"&&(!item.recipient.trim()||!item.achievement.trim()));
    if(!readable.length)return notify("Semua halaman sudah mempunyai nama dan pencapaian");
    setReadingBundle(true);setReadProgress({done:0,total:readable.length});
    let cursor=0,completed=0,sharedApplied=false;
    const readNext=async()=>{
      while(cursor<readable.length){
        const page=readable[cursor++];updateBundleItem(page.page,{status:"reading",error:""});
        try{
          const response=await fetch("/api/achievement-ocr",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({page:page.page,base64:await fileBase64(page.blob)})});
          const data=await response.json() as {recipient?:string;title?:string;date?:string;venue?:string;level?:string;achievement?:string;confidence?:number;error?:string};
          if(!response.ok)throw new Error(data.error||"Tidak dapat dibaca");
          updateBundleItem(page.page,{recipient:page.recipient||data.recipient||"",achievement:page.achievement||data.achievement||"",confidence:data.confidence||0,status:"review",error:""});
          if(!sharedApplied){sharedApplied=true;setForm(current=>({...current,title:current.title||data.title||"",date:current.date===today?(data.date||current.date):current.date,venue:current.venue||data.venue||"",level:current.level==="Daerah"?(data.level||current.level):current.level,achievement:current.achievement||data.achievement||""}));}
        }catch(error){updateBundleItem(page.page,{status:"error",error:error instanceof Error?error.message:"Tidak dapat dibaca"});}
        completed+=1;setReadProgress({done:completed,total:readable.length});
      }
    };
    try{await Promise.all([readNext(),readNext()]);notify("Bacaan AI selesai. Semak semula nama dan pencapaian.");}
    finally{setReadingBundle(false);}
  };
  const uploadOne=async(blob:Blob,title:string,achievement:string,suffix:string)=>{
    const name=`${form.date}-ARKIB-${clean(title)}${suffix}__TEMPAT__${clean(form.venue)}__PERINGKAT__${clean(form.level)}__BIDANG__${clean(form.field)}__PENCAPAIAN__${clean(achievement)}__PENYEDIA__${clean(form.uploadedBy)}.pdf`;
    const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:achievementCategory,metadata:{title,programDate:form.date,achievementField:form.field,achievementLevel:form.level,achievementResult:achievement,achievementUnit:form.unitCategory},files:[{name,mimeType:"application/pdf",base64:await fileBase64(blob)}]})});
    const data=await response.json() as {error?:string;files?:OprReport[]};
    if(!response.ok||!data.files?.[0])throw new Error(data.error||"Fail tidak dapat disimpan");
    rememberOprReport(data.files[0]);setReports(current=>[data.files![0],...current]);return data.files[0];
  };
  const resetUpload=()=>{setForm({title:"",date:today,venue:"",level:"Daerah",field:"Kokurikulum",unitCategory:"",achievement:"",uploadedBy:archiveUser?.name||""});setFiles([]);setBundleItems([]);setSaveProgress({done:0,total:0});};
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(uploadMode==="bundle"){
      if(!bundleItems.length)return notify("Pilih satu PDF bundle dahulu");
      if(bundleItems.some(item=>item.blob.size>6_000_000))return notify("Ada halaman melebihi 6 MB dan belum boleh disimpan");
      if(bundleItems.some(item=>!item.recipient.trim()||!(item.achievement||form.achievement).trim()))return notify("Lengkapkan nama penerima dan pencapaian bagi setiap halaman");
    }else{
      if(!files.length)return notify("Pilih sekurang-kurangnya satu sijil PDF atau gambar");
      if(files.length>20)return notify("Maksimum 20 fail dalam satu simpanan");
      if(files.some(item=>item.size>6_000_000))return notify("Setiap fail mesti 6 MB atau kurang");
    }
    setSaving(true);let savedThisRun=0;
    try{
      if(uploadMode==="bundle"){
        const pending=bundleItems.filter(item=>item.status!=="saved");setSaveProgress({done:0,total:pending.length});let done=0;
        for(const item of pending){
          const title=`${form.title} — ${item.recipient.trim()}`;
          await uploadOne(item.blob,title,item.achievement||form.achievement,"");
          done+=1;savedThisRun+=1;updateBundleItem(item.page,{status:"saved",error:""});setSaveProgress({done,total:pending.length});
        }
        notify(`${bundleItems.length} sijil berjaya disimpan sebagai rekod berasingan`);
      }else{
        setSaveProgress({done:0,total:files.length});
        for(let index=0;index<files.length;index+=1){const source=files[index],blob=source.type==="application/pdf"?source:await imageAsPdf(source);await uploadOne(blob,form.title,form.achievement,files.length>1?`-${index+1}`:"");savedThisRun+=1;setSaveProgress({done:index+1,total:files.length});}
        notify(`${files.length} fail kejayaan berjaya disimpan ke Google Drive`);
      }
      resetUpload();setTab("dashboard");
    }catch(error){notify(`${savedThisRun} fail telah disimpan. ${error instanceof Error?error.message:"Arkib tidak dapat disimpan"}`);}
    finally{setSaving(false);}
  };
  return <div className="achievement-shell"><div className="achievement-head"><div><span className="modal-overline">ARKIB KEJAYAAN SMKAP</span><h2 id="folder-title">Sijil dan pencapaian sekolah</h2><p>Simpan bukti kejayaan secara tersusun dan mudah dicari semula.</p></div><button onClick={()=>setTab(tab==="dashboard"?"upload":"dashboard")}>{tab==="dashboard"?"＋ Tambah kejayaan":"Kembali ke dashboard"}</button></div>
    {tab==="upload"?<form className="achievement-form" onSubmit={submit}><div className="achievement-form-title"><GlassIcon icon={Trophy} size="lg"/><div><span>REKOD BAHARU</span><h3>Muat naik sijil atau PDF bundle</h3><p>Pilih cara yang sepadan dengan fail cikgu.</p></div></div><div className="achievement-mode" role="group" aria-label="Cara muat naik"><button type="button" disabled={readingBundle||saving} className={uploadMode==="single"?"active":""} onClick={()=>{setUploadMode("single");setBundleItems([]);setFiles([]);}}><FileText/><span><strong>Fail biasa</strong><small>Satu atau beberapa fail berasingan</small></span></button><button type="button" disabled={readingBundle||saving} className={uploadMode==="bundle"?"active":""} onClick={()=>{setUploadMode("bundle");setFiles([]);}}><FileText/><span><strong>PDF bundle ramai sijil</strong><small>Sistem pecahkan setiap halaman secara automatik</small></span></button></div><label className="achievement-upload">{uploadMode==="bundle"?"PDF bundle *":"Fail sijil atau gambar *"}<input key={uploadMode} type="file" disabled={readingBundle||saving} accept={uploadMode==="bundle"?"application/pdf,.pdf":"application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"} multiple={uploadMode==="single"} onChange={(e)=>{const chosen=Array.from(e.target.files||[]);if(uploadMode==="bundle"&&chosen[0])void prepareBundle(chosen[0]);else setFiles(chosen);}} required={!files.length}/><span>{files.length?(uploadMode==="bundle"?files[0].name:`${files.length} fail dipilih`):(uploadMode==="bundle"?"Pilih satu PDF yang mengandungi 2–40 sijil":"Pilih PDF, JPG atau PNG")}</span><small>{uploadMode==="bundle"?"Maksimum 30 MB · satu sijil bagi setiap halaman":"Maksimum 20 fail · 6 MB bagi setiap fail"}</small></label>{readingBundle&&<div className="achievement-progress" role="status"><span><strong>{readProgress.total?"Sedang membaca dengan AI…":"Sedang memecahkan PDF…"}</strong><small>{readProgress.done} daripada {readProgress.total||"…"} halaman</small></span><progress max={readProgress.total||1} value={readProgress.done}/></div>}<div className="achievement-form-grid"><label>Tajuk program / kejayaan *<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Contoh: Kejohanan Catur MSSD Rompin 2026" required/></label><label>Tarikh *<input type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} required/></label><label>Tempat *<input value={form.venue} onChange={(e)=>setForm({...form,venue:e.target.value})} placeholder="Contoh: Dewan Sri Permai" required/></label><label>Peringkat *<select value={form.level} onChange={(e)=>setForm({...form,level:e.target.value})}>{achievementLevels.map((level)=><option key={level}>{level}</option>)}</select></label><label>Bidang *<select value={form.field} onChange={(e)=>setForm({...form,field:e.target.value})}>{achievementFields.map((field)=><option key={field}>{field}</option>)}</select></label><label>Unit berkaitan (jika ada)<input list="archive-units" value={form.unitCategory} onChange={e=>setForm({...form,unitCategory:e.target.value})} placeholder="Contoh: Kelab Catur"/><datalist id="archive-units">{oprCategoryValues.filter(value=>value!=="Lain-lain").map(value=><option key={value} value={value}/>)}</datalist></label><label>{uploadMode==="bundle"?"Pencapaian lalai *":"Pencapaian *"}<input value={form.achievement} onChange={(e)=>setForm({...form,achievement:e.target.value})} placeholder="Contoh: Penyertaan / Johan" required/></label><label>Nama guru yang memuat naik *<input value={form.uploadedBy} onChange={(e)=>setForm({...form,uploadedBy:e.target.value})} required/></label></div>{uploadMode==="bundle"&&bundleItems.length>0&&<section className="achievement-bundle-review"><div><span><strong>Semak {bundleItems.length} sijil</strong><small>{isArchiveAdmin?"Isi secara manual atau gunakan AI jika benar-benar diperlukan.":"Isi nama penerima dan semak pencapaian bagi setiap halaman."}</small></span><div className="achievement-bundle-actions">{isArchiveAdmin&&<button type="button" disabled={readingBundle} onClick={()=>void readBundleWithAi()}><Sparkles/> Baca {bundleItems.filter(item=>!item.recipient.trim()||!item.achievement.trim()).length} halaman kosong dengan AI</button>}<button type="button" onClick={()=>setBundleItems(current=>current.map(item=>({...item,achievement:form.achievement||item.achievement})))}>Guna pencapaian lalai untuk semua</button></div></div><div className="achievement-bundle-list">{bundleItems.map(item=><article key={item.page} className={item.status==="error"?"has-error":""}><b>{item.page}</b><label>Nama penerima<input value={item.recipient} onChange={e=>updateBundleItem(item.page,{recipient:e.target.value,status:"review"})} placeholder={item.status==="reading"?"Sedang dibaca…":"Taip nama penerima"}/></label><label>Pencapaian<input value={item.achievement} onChange={e=>updateBundleItem(item.page,{achievement:e.target.value,status:"review"})} placeholder={form.achievement||"Penyertaan / Johan"}/></label><span className={`bundle-status ${item.status}`}>{item.status==="reading"?"Membaca":item.status==="saved"?"Disimpan":item.status==="error"?"Semak manual":item.confidence>=75?"Bacaan jelas":"Sila semak"}</span>{item.error&&<small>{item.error}</small>}</article>)}</div></section>}<button className="achievement-save" disabled={saving||readingBundle}>{saving?`Menyimpan ${saveProgress.done} daripada ${saveProgress.total}…`:uploadMode==="bundle"?`Simpan ${bundleItems.length||"semua"} sijil ke Arkib`:"Simpan ke Arkib Kejayaan"}</button></form>:<><div className="achievement-kpis"><article><span>JUMLAH REKOD</span><strong>{reports.length}</strong><small>Sijil dan pencapaian</small></article><article><span>TAHUN INI</span><strong>{thisYear}</strong><small>Rekod semasa</small></article><article><span>PERINGKAT UTAMA</span><strong className="word">{levelCounts[0]?.count?levelCounts[0].level:"Belum ada"}</strong><small>{levelCounts[0]?.count||0} rekod</small></article></div><div className="achievement-tools"><label><Search/><input type="search" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari tajuk, tempat atau guru"/></label><select value={levelFilter} onChange={(e)=>setLevelFilter(e.target.value)}><option>Semua peringkat</option>{achievementLevels.map((level)=><option key={level}>{level}</option>)}</select><button onClick={()=>void load(true)} disabled={loading}>{loading?"Menyemak…":"Segarkan"}</button></div><section className="achievement-list"><div><span className="modal-overline">SENARAI KEJAYAAN</span><h3>{visible.length} rekod ditemui</h3></div>{loading&&!reports.length?<p className="achievement-empty">Membaca arkib daripada Google Drive…</p>:visible.length?<div className="achievement-grid">{visible.map((report)=>{const item=meta(report);return <button key={report.id} onClick={()=>setSelected(report)}><span className="achievement-file"><Trophy/></span><div><small>{item.field} · {item.level}</small><strong>{item.title}</strong><p>{item.achievement}</p><em>{item.uploadedBy||"Tidak dinyatakan"} | {item.venue||"Tidak dinyatakan"} | {new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${item.date}T12:00:00`))}</em></div><ChevronRight/></button>})}</div>:<p className="achievement-empty">Belum ada rekod yang sepadan.</p>}</section></>}
  </div>;
}

type Teacher = { id: string; name: string; category: "mainstream" | "form6" };
type Absence = { id: string; teacherId: string; teacherName: string; category: string; absenceDate: string; endDate?: string | null; reason: string; duration: "full" | "days" | "partial"; startTime?: string | null; endTime?: string | null; note?: string; reliefStatus?: string };

function AttendanceCentre({ notify, user }: { notify: (message: string) => void; user: PortalIdentity | null }) {
  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [tab, setTab] = useState<"report" | "list" | "relief" | "admin">("report");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [records, setRecords] = useState<Absence[]>([]);
  const [reasons, setReasons] = useState<string[]>([]);
  const [newReason, setNewReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ category: "mainstream", teacherId: "", absenceDate: today, endDate: today, reason: "", duration: "full", startTime: "", endTime: "", note: "" });
  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/ekeberadaan?resource=all", { cache: "no-store" });
      const data = await response.json() as { teachers?: Teacher[]; records?: Absence[]; reasons?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Data tidak dapat dibaca");
      setTeachers(data.teachers || []); setRecords(data.records || []);
      setReasons(data.reasons || []);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Data tidak dapat dibaca"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);
  const availableTeachers = teachers.filter((teacher) => teacher.category === form.category);
  const selectedTeacher = teachers.find((teacher) => teacher.id === form.teacherId);
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value, ...(field === "category" ? { teacherId: "" } : {}) }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedTeacher) return;
    setSaving(true); setError("");
    try {
      const payload = { id: crypto.randomUUID(), teacherId: selectedTeacher.id, teacherName: selectedTeacher.name, category: form.category, absenceDate: form.absenceDate, endDate: form.duration === "days" ? form.endDate : null, reason: form.reason, duration: form.duration, startTime: form.duration === "partial" ? form.startTime : null, endTime: form.duration === "partial" ? form.endTime : null, note: form.note };
      const response = await fetch("/api/ekeberadaan?resource=absences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Laporan tidak dapat disimpan");
      notify("Ketidakhadiran berjaya dilaporkan kepada sistem relief"); setTab("list"); await loadData();
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Laporan tidak dapat disimpan"); }
    finally { setSaving(false); }
  };
  const saveReason = async (event: React.FormEvent) => {
    event.preventDefault();
    const reason = newReason.trim(); if (!reason) return;
    try {
      const response = await fetch("/api/ekeberadaan?resource=reasons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Sebab tidak dapat ditambah");
      setNewReason(""); await loadData(); notify("Sebab ketidakhadiran telah ditambah");
    } catch (issue) { notify(issue instanceof Error ? issue.message : "Sebab tidak dapat ditambah"); }
  };
  const removeReason = async (reason: string) => {
    if (!isAdmin || !confirm(`Buang pilihan sebab “${reason}”?`)) return;
    try {
      const response = await fetch(`/api/ekeberadaan?resource=reasons&reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Sebab tidak dapat dibuang");
      await loadData(); notify("Sebab ketidakhadiran telah dibuang");
    } catch (issue) { notify(issue instanceof Error ? issue.message : "Sebab tidak dapat dibuang"); }
  };
  const visible = records.filter((record) => `${record.teacherName} ${record.reason}`.toLowerCase().includes(search.toLowerCase()));
  const todayRecords = records.filter((record) => record.absenceDate <= today && (!record.endDate || record.endDate >= today));
  return <div className="attendance-centre">
    <div className="attendance-head"><div><span className="modal-overline">E-KEBERADAAN SMKAP</span><h2 id="folder-title">Kehadiran guru & relief</h2><p>Lapor ketidakhadiran sekali. Maklumat terus tersedia untuk urusan guru relief.</p></div><div className="attendance-live"><i></i><span><b>{todayRecords.length}</b><small>Tidak hadir hari ini</small></span></div></div>
    <nav className={`attendance-tabs ${isAdmin ? "has-admin" : ""}`} aria-label="Bahagian E-Keberadaan"><button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}><FilePlus2 />Lapor tidak hadir</button><button className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}><ClipboardList />Senarai</button><button className={tab === "relief" ? "active" : ""} onClick={() => setTab("relief")}><Sparkles />Relief</button>{isAdmin&&<button className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}><Settings />Pentadbir</button>}</nav>
    {loading && tab !== "report" ? <div className="attendance-state"><i></i><strong>Sedang memuatkan data sebenar...</strong></div> : error && tab !== "report" ? <div className="attendance-error"><strong>Data belum dapat dipaparkan</strong><span>{error}</span><button onClick={() => void loadData()}>Cuba semula</button></div> : tab === "report" ? <form className="attendance-form" onSubmit={submit}>
      <section><div className="attendance-section-title"><span>01</span><div><strong>Siapa yang tidak hadir?</strong><small>Pilih kumpulan dan nama guru.</small></div></div><div className="attendance-choice"><button type="button" className={form.category === "mainstream" ? "active" : ""} onClick={() => setField("category", "mainstream")}><Users />Guru Arus Perdana</button><button type="button" className={form.category === "form6" ? "active" : ""} onClick={() => setField("category", "form6")}><GraduationCap />Guru Tingkatan Enam</button></div><label>Nama guru *<select value={form.teacherId} onChange={(event) => setField("teacherId", event.target.value)} required disabled={loading}><option value="">{loading ? "Sedang memuatkan senarai guru..." : "Pilih nama guru"}</option>{availableTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>{loading && <p className="attendance-inline-loading"><i></i> Senarai guru sedang disediakan. Borang lain boleh diisi dahulu.</p>}</section>
      <section><div className="attendance-section-title"><span>02</span><div><strong>Butiran ketidakhadiran</strong><small>Tarikh dan tempoh diperlukan untuk relief.</small></div></div><div className="attendance-row"><label>Tarikh mula *<input type="date" value={form.absenceDate} onChange={(event) => setField("absenceDate", event.target.value)} required /></label><label>Sebab *<select value={form.reason} onChange={(event) => setField("reason", event.target.value)} required><option value="">Pilih sebab</option>{reasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label></div><div className="attendance-duration"><button type="button" className={form.duration === "full" ? "active" : ""} onClick={() => setField("duration", "full")}>Sehari</button><button type="button" className={form.duration === "days" ? "active" : ""} onClick={() => setField("duration", "days")}>Beberapa hari</button><button type="button" className={form.duration === "partial" ? "active" : ""} onClick={() => setField("duration", "partial")}>Waktu tertentu</button></div>{form.duration === "days" && <label>Tarikh akhir *<input type="date" min={form.absenceDate} value={form.endDate} onChange={(event) => setField("endDate", event.target.value)} required /></label>}{form.duration === "partial" && <div className="attendance-row"><label>Waktu mula *<input type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} required /></label><label>Waktu akhir *<input type="time" value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} required /></label></div>}<label>Catatan <textarea value={form.note} onChange={(event) => setField("note", event.target.value)} placeholder="Maklumat tambahan jika ada" /></label></section>
      {error && <p className="visitor-error">{error}</p>}<div className="attendance-submit"><span><ShieldCheck />Maklumat digunakan untuk urusan rasmi sekolah.</span><button disabled={saving || !selectedTeacher || !form.reason}>{saving ? <><i className="button-spinner"></i>Menyimpan...</> : <>Hantar kepada sistem relief <ChevronRight /></>}</button></div>
    </form> : tab === "admin" ? <section className="attendance-list attendance-reasons-admin"><div className="attendance-list-tools"><div><strong>Kawalan sebab ketidakhadiran</strong><small>Senarai ini dipaparkan terus kepada guru dalam borang laporan.</small></div></div><form className="attendance-reason-form" onSubmit={saveReason}><input value={newReason} onChange={event=>setNewReason(event.target.value)} maxLength={80} placeholder="Contoh: Jerebu"/><button>Tambah sebab</button></form><div className="attendance-records">{reasons.map(reason=><article key={reason}><span className="attendance-avatar">!</span><div><strong>{reason}</strong><small>Pilihan sebab ketidakhadiran</small></div><button className="attendance-delete" onClick={()=>void removeReason(reason)}>Buang</button></article>)}</div></section> : tab === "list" ? <section className="attendance-list"><div className="attendance-list-tools"><div><strong>Rekod ketidakhadiran</strong><small>{records.length} laporan direkodkan</small></div><label><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau sebab" /></label></div><div className="attendance-records">{visible.length?visible.map((record) => <article key={record.id}><span className="attendance-avatar">{record.teacherName.split(" ").slice(0,2).map((word) => word[0]).join("")}</span><div><strong>{record.teacherName}</strong><small>{record.reason} · {new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${record.absenceDate}T12:00:00`))}{record.endDate ? ` – ${new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "short" }).format(new Date(`${record.endDate}T12:00:00`))}` : ""}</small></div><b className={record.reliefStatus === "complete" ? "done" : ""}>{record.reliefStatus === "complete" ? "Selesai" : "Perlu relief"}</b></article>):<p className="attendance-empty">Tiada rekod yang sepadan.</p>}</div></section> : <section className="relief-panel"><div className="relief-hero"><GlassIcon icon={Sparkles} size="lg" /><div><span>URUSAN RELIEF</span><h3>Ketidakhadiran hari ini sudah diselaraskan</h3><p>Guru yang dilaporkan tidak hadir muncul di sini untuk tindakan penyedia jadual relief.</p></div></div><div className="relief-summary"><article><Users /><span><strong>{todayRecords.length}</strong><small>Guru tidak hadir</small></span></article><article><ClipboardList /><span><strong>{todayRecords.filter((record) => record.reliefStatus === "complete").length}</strong><small>Relief selesai</small></span></article><article><Clock3 /><span><strong>{todayRecords.filter((record) => record.reliefStatus !== "complete").length}</strong><small>Menunggu tindakan</small></span></article></div><div className="relief-inbox"><h3>Senarai tindakan hari ini</h3>{todayRecords.length ? todayRecords.map((record) => <article key={record.id}><CircleCheck /><div><strong>{record.teacherName}</strong><small>{record.reason} · {record.category === "form6" ? "Tingkatan Enam" : "Arus Perdana"}</small></div><b>{record.reliefStatus === "complete" ? "Selesai" : "Sediakan relief"}</b></article>) : <p>Tiada ketidakhadiran untuk tindakan relief hari ini.</p>}</div><p className="relief-note">Rekod ketidakhadiran sudah tersedia kepada penyedia relief dalam satu aliran kerja.</p></section>}
  </div>;
}

const oprCategories = [
  ["Pengurusan", "#79d4c5"], ["Kurikulum", "#78b9df"], ["HEM", "#dd8d78"],
  ["Kokurikulum", "#e2ba65"], ["Tingkatan Enam", "#a792d5"],
  ["Lain-lain", "#8ea3aa"],
] as const;

function findFolderNode(path: string) {
  const parts = path.split(" · "); let nodes: readonly OprFolderNode[] = oprFolderTree; let found: OprFolderNode | undefined;
  for (const part of parts) { found = nodes.find((node) => node.name === part); if (!found) return undefined; nodes = found.children || []; }
  return found;
}

function OprDashboard({ create, openDuty, notify, user }: { create: (group:string) => void; openDuty: () => void; notify: (message: string) => void; user: PortalIdentity | null }) {
  const [folderView, setFolderView] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [selected, setSelected] = useState<OprReport | null>(null);
  const [reports, setReports] = useState<OprReport[]>(() => oprMemoryCache || []);
  const [loadingReports, setLoadingReports] = useState(!oprMemoryCache);
  const [refreshingReports, setRefreshingReports] = useState(false);
  const [reportError, setReportError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OprReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createPickerOpen,setCreatePickerOpen]=useState(false);
  const loadReports = async (refresh = false) => {
    refresh ? setRefreshingReports(true) : setLoadingReports(true); setReportError("");
    try {
      setReports(await fetchOprIndex(refresh));
    } catch (error) { setReportError(error instanceof Error ? error.message : "Senarai OPR tidak tersedia"); }
    finally { setLoadingReports(false); setRefreshingReports(false); }
  };
  useEffect(() => { void loadReports(); }, []);
  const reportTitle = (report: OprReport) => report.name.replace(/\.pdf$/i, "").replace(/__(?:TEMPAT|PERINGKAT|BIDANG|PENCAPAIAN|PENYEDIA)__.*/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/^ARKIB-/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const reportPreparer = (report: OprReport) => report.name.replace(/\.pdf$/i, "").match(/__(?:PENYEDIA|PEMANTAU)__(.*?)(?=__[A-Z]+__|$)/i)?.[1]?.trim() || "Nama penyedia tidak direkodkan";
  const reportDate = (report: OprReport) => new Intl.DateTimeFormat("ms-MY", { day: "numeric", month: "long", year: "numeric" }).format(new Date(report.updatedAt));
  const oprReports = reports.filter((report) => isPrimaryReport(report) && !report.category.toLowerCase().includes("arkib kejayaan") && !/^\d{4}-\d{2}-\d{2}-ARKIB-/i.test(report.name));
  const belongsTo = (report: OprReport, category: string) => report.category === category || report.category.startsWith(`${category} · `) || (category === "Pengurusan" && ["Laporan Guru Bertugas","Laporan Perhimpunan"].includes(report.category));
  const categoryCount = (category: string) => oprReports.filter((report) => belongsTo(report, category)).length;
  const visible = oprReports.slice(0, 3);
  const folderReports = oprReports.filter((report) => (folderView === "Semua" || (folderView && belongsTo(report, folderView))) && `${report.name} ${report.category}`.toLowerCase().includes(folderSearch.toLowerCase()));
  const activeFolder = folderView && folderView !== "Semua" ? findFolderNode(folderView) : undefined;
  const openFolder = (name: string) => { setFolderSearch(""); setFolderView(name); };
  const counts = oprCategories.map(([name]) => categoryCount(name));
  const maxCount = Math.max(1, ...counts);
  const mostActiveIndex = counts.indexOf(Math.max(...counts));
  const thisMonth = oprReports.filter((report) => { const date = new Date(report.updatedAt); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); }).length;
  const signInRequired = reportError.toLowerCase().includes("log masuk");
  const canDelete = user?.role === "admin" || user?.role === "super_admin";
  const removeReport = async () => {
    if (!deleteTarget || !canDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/drive?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "OPR tidak dapat dipadam");
      setReports((current) => current.filter((report) => report.id !== deleteTarget.id));
      if (oprMemoryCache) oprMemoryCache = oprMemoryCache.filter((report) => report.id !== deleteTarget.id);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<string>("smkap:opr-removed", { detail: deleteTarget.id }));
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      setDeleteTarget(null);
      notify("OPR berjaya dipindahkan ke tong sampah Google Drive");
    } catch (error) {
      notify(error instanceof Error ? error.message : "OPR tidak dapat dipadam");
    } finally {
      setDeleting(false);
    }
  };
  if (selected) return <article className="saved-opr-preview drive-opr-preview" role="document" aria-label={`Pratonton ${reportTitle(selected)}`}>
    <button className="saved-preview-close" onClick={() => setSelected(null)} aria-label="Tutup pratonton">×</button>
    <header><span>PDF SEBENAR · GOOGLE DRIVE SEKOLAH</span><h2>{reportTitle(selected)}</h2><p>{reportDate(selected)} · {reportPreparer(selected)}</p></header>
    <DrivePdfPreview fileId={selected.id} title={`PDF ${reportTitle(selected)}`} />
    <footer><button onClick={() => setSelected(null)}>Tutup pratonton</button><a href={`https://drive.google.com/file/d/${encodeURIComponent(selected.id)}/view`} target="_blank" rel="noreferrer">Buka PDF</a><a className="print-opr" href={`https://drive.google.com/file/d/${encodeURIComponent(selected.id)}/view`} target="_blank" rel="noreferrer">▣ Buka untuk cetak</a>{canDelete && <button className="opr-delete-action" onClick={() => setDeleteTarget(selected)}>Padam OPR</button>}</footer>
    {deleteTarget && <div className="achievement-confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-opr-title"><section><span>PADAM OPR LENGKAP</span><h3 id="delete-opr-title">Padam “{reportTitle(deleteTarget)}”?</h3><p>Fail akan dipindahkan ke tong sampah Google Drive dan tidak lagi dipaparkan dalam dashboard Pusat OPR.</p><div><button onClick={() => setDeleteTarget(null)} disabled={deleting}>Batal</button><button onClick={() => void removeReport()} disabled={deleting}>{deleting ? "Sedang memadam…" : "Ya, padam OPR"}</button></div></section></div>}
  </article>;
  return <div className="opr-dashboard">
    <div className="opr-dash-head"><div><span className="modal-overline">PUSAT OPR</span><h2 id="folder-title">Dashboard laporan sekolah</h2><p>Pantau, cari dan hasilkan One Page Report dalam satu ruang kerja.</p></div>{signInRequired ? <a className="dash-create" href="/signin-with-chatgpt?return_to=%2F"><b>↗</b><span>Log Masuk Warga Sekolah<small>Gunakan akaun Google/DELIMa yang dibenarkan</small></span></a> : <button className="dash-create" onClick={()=>setCreatePickerOpen(true)}><b>＋</b><span>Buat OPR Baharu<small>Pilih jenis OPR dahulu</small></span></button>}</div>
    {signInRequired && <section className="opr-auth-notice"><ShieldCheck aria-hidden="true"/><div><strong>Log masuk diperlukan</strong><p>Pilih “Continue with Google”, kemudian gunakan akaun Google/DELIMa yang telah didaftarkan oleh sekolah.</p></div><a href="/signin-with-chatgpt?return_to=%2F">Log Masuk Sekarang</a></section>}
    <div className="opr-kpis">
      <article><span>JUMLAH OPR</span><strong>{oprReports.length}</strong><small>Laporan OPR yang telah dijana</small></article>
      <article><span>BULAN INI</span><strong>{thisMonth}</strong><small>Laporan lengkap disimpan</small></article>
      <article><span>PALING AKTIF</span><strong className="word">{oprReports.length ? oprCategories[mostActiveIndex][0] : "Belum ada"}</strong><small>{oprReports.length ? `${counts[mostActiveIndex]} laporan` : "Menunggu OPR pertama"}</small></article>
      <article className="ai-kpi"><span>AI GEMINI</span><strong className="word">Sedia</strong><small>Penulisan pintar OPR</small></article>
    </div>
    <section className="opr-duty-entry"><div><span>LAPORAN GURU BERTUGAS</span><h3>Harian dan rumusan mingguan</h3><p>Isi laporan harian dengan pantas. Sistem menggabungkan hari persekolahan sebenar untuk rumusan mingguan.</p></div>{signInRequired ? <a href="/signin-with-chatgpt?return_to=%2F">Log masuk untuk buka <b>→</b></a> : <button onClick={openDuty}>Buka laporan guru bertugas <b>→</b></button>}</section>
    <section id="opr-folders" className="opr-folder-section"><div className="dash-section-title"><div><span>FOLDER BIDANG</span><h3>Tekan folder untuk membuka subfolder dan laporan</h3></div><button onClick={() => void loadReports(true)} disabled={refreshingReports}>{refreshingReports ? "Menyemak…" : "Segarkan laporan"}</button></div><div className="opr-folder-grid opr-primary-folder-grid">{oprCategories.slice(0,5).map(([name]) => <button key={name} onClick={() => openFolder(name)}><span>▰</span><div><strong>{name}</strong><small>{categoryCount(name)} laporan</small></div></button>)}</div><div className="opr-folder-utilities"><button onClick={() => openFolder("Semua")}><span>▤</span><div><strong>Semua OPR</strong><small>{oprReports.length} laporan</small></div></button>{oprCategories.slice(5).map(([name]) => <button key={name} onClick={() => openFolder(name)}><span>▰</span><div><strong>{name}</strong><small>{categoryCount(name)} laporan</small></div></button>)}</div></section>
    <section id="opr-recent" className="recent-opr"><div className="dash-section-title"><div><span>LAPORAN TERKINI</span><h3>3 laporan terkini</h3><small className="report-help">Tekan nama laporan untuk membuka PDF.</small></div><div className="report-filters"><button onClick={() => openFolder("Semua")}>Lihat semua</button><button onClick={() => openFolder("Semua")}>⌕ Cari</button></div></div>{loadingReports ? <p className="drive-list-state">Membaca OPR daripada Google Drive...</p> : reportError ? <p className="drive-list-state error">{reportError}</p> : <div className="report-list">{visible.length ? visible.map((report) => <button key={report.id} onClick={() => setSelected(report)}><span className="report-file">▤</span><div><strong>{reportTitle(report)}</strong><small>{reportDate(report)} · {reportPreparer(report)}</small></div><b>{report.category}</b><em><i></i>Lengkap</em><span className="report-arrow">›</span></button>) : <p className="empty-report">Belum ada OPR lengkap dalam Google Drive.</p>}</div>}</section>
    <div className="opr-dash-grid summary-only"><section className="opr-chart-card"><div className="dash-section-title"><div><span>RINGKASAN BIDANG</span><h3>Agihan Laporan</h3></div><b>{oprReports.length} OPR</b></div><div className="category-bars">{oprCategories.map(([name,color]) => { const count = categoryCount(name); return <button key={name} onClick={() => openFolder(name)}><span><i style={{backgroundColor:color}}></i>{name}</span><strong>{count}</strong><em><i style={{width:`${Math.max(count ? 4 : 0,(count/maxCount)*100)}%`,backgroundColor:color}}></i></em></button>; })}</div></section></div>
    {folderView && <div className="opr-folder-float-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setFolderView(null)}><section className="opr-folder-float" role="dialog" aria-modal="true" aria-label={`Senarai OPR ${folderView}`}>
      <button className="folder-float-close" onClick={() => setFolderView(null)} aria-label="Tutup senarai folder">×</button>
      <span className="modal-overline">FOLDER BIDANG</span><h3>{folderView === "Semua" ? "Semua OPR" : folderView}</h3><p>{activeFolder?.children?.length ? "Pilih subfolder atau cari laporan dalam folder ini." : "Cari dan pilih laporan untuk membuka pratonton."}</p>
      {activeFolder?.children?.length ? <div className="opr-subfolder-grid">{folderView?.includes(" · ") && <button onClick={() => openFolder(folderView.split(" · ").slice(0,-1).join(" · "))}><span>‹</span><strong>Folder sebelumnya</strong></button>}{activeFolder.children.map((child) => { const childPath=`${folderView} · ${child.name}`; return <button key={child.name} onClick={() => openFolder(childPath)}><span>▰</span><strong>{child.name}</strong><small>{categoryCount(childPath)} laporan</small></button>; })}</div> : folderView?.includes(" · ") ? <button className="opr-folder-back" onClick={() => openFolder(folderView.split(" · ").slice(0,-1).join(" · "))}>‹ Kembali ke folder sebelumnya</button> : null}
      <label className="folder-search"><span>⌕</span><input autoFocus value={folderSearch} onChange={(event) => setFolderSearch(event.target.value)} placeholder="Cari tajuk, unit atau nama penyedia..." /></label>
      <div className="folder-result-count">{folderReports.length} laporan ditemui</div>
      <div className="folder-scroll-list">{folderReports.length ? folderReports.map((report) => <button key={report.id} onClick={() => { setFolderView(null); setSelected(report); }}><span className="report-file">▤</span><div><strong>{reportTitle(report)}</strong><small>{reportDate(report)} · {reportPreparer(report)}</small></div><b>Lengkap</b><i>›</i></button>) : <p>{loadingReports ? "Sedang membaca Google Drive..." : "Tiada OPR lengkap sepadan dengan carian ini."}</p>}</div>
    </section></div>}
    {typeof document!=="undefined"&&createPortal(<>{!signInRequired&&<nav className="opr-floating-nav" aria-label="Tindakan pantas Pusat OPR"><button onClick={()=>document.querySelector('.opr-dashboard')?.scrollIntoView({behavior:'smooth'})}><FileText/><span>Utama</span></button><button onClick={()=>document.getElementById('opr-folders')?.scrollIntoView({behavior:'smooth'})}><Folder/><span>Folder</span></button><button className="create" onClick={()=>setCreatePickerOpen(true)} aria-label="Buat OPR baharu"><FilePlus2/><span>Buat OPR</span></button><button onClick={()=>document.getElementById('opr-recent')?.scrollIntoView({behavior:'smooth'})}><ClipboardList/><span>Terkini</span></button><button onClick={openDuty}><BriefcaseBusiness/><span>Bertugas</span></button></nav>}{createPickerOpen&&<div className="opr-create-picker-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setCreatePickerOpen(false)}><section className="opr-create-picker" role="dialog" aria-modal="true" aria-labelledby="opr-create-title"><button className="folder-float-close" onClick={()=>setCreatePickerOpen(false)} aria-label="Tutup pilihan jenis OPR">×</button><span className="modal-overline">OPR BAHARU</span><h3 id="opr-create-title">Jenis OPR yang hendak dibuat?</h3><p>Pilih bidang dahulu. Senarai unit berkaitan akan dibuka dalam borang.</p><div>{oprCategoryGroups.map(group=><button key={group.label} onClick={()=>create(group.label)}><span>{group.label==="Pengurusan"?"01":group.label==="Kurikulum"?"02":group.label==="HEM"?"03":group.label==="Kokurikulum"?"04":group.label==="Tingkatan Enam"?"05":"06"}</span><strong>{group.label}</strong><small>{group.options.length} pilihan</small><ChevronRight/></button>)}</div><button className="opr-duty-choice" onClick={openDuty}><BriefcaseBusiness/><span><strong>Laporan Guru Bertugas</strong><small>Laporan harian dan rumusan mingguan</small></span><ChevronRight/></button></section></div>}</>,document.body)}
  </div>;
}

type PortalUser={id:string;email:string;name:string;position:string;grade:string;role:string;status:string;showDirectory?:boolean;showOrgChart?:boolean;orgPosition?:string;orgOrder?:number};
type AdminLog={id:string;actorEmail:string;action:string;targetEmail:string;createdAt:string};
type AdminPermission={userId:string;moduleKey:string;enabled:number};
type AdminSchoolYear={schoolYear:number;status:"active"|"draft"|"closed";preparedFrom?:number|null;activationDate?:string|null;closedAt?:string|null};
type PortalAnnouncement={id:string;title:string;body:string;audience:string;publishedAt:string;endsAt:string;imageDataUrl?:string};
type PortalEvent={id:string;title:string;eventDate:string;endDate:string;category:string;details:string};
declare global{interface Window{google?:{accounts:{id:{initialize:(v:{client_id:string;callback:(r:{credential:string})=>void})=>void;renderButton:(e:HTMLElement,v:Record<string,unknown>)=>void;disableAutoSelect:()=>void}}}}}
const orgChartPositions=["Pengetua","Guru Penolong Kanan Pentadbiran","Guru Penolong Kanan Hal Ehwal Murid","Guru Penolong Kanan Kokurikulum","Guru Penolong Kanan Tingkatan Enam","Guru Kanan Mata Pelajaran Bahasa","Guru Kanan Mata Pelajaran Sains & Matematik","Guru Kanan Mata Pelajaran Kemanusiaan","Guru Kanan Mata Pelajaran Teknik & Vokasional","Guru Kanan Mata Pelajaran Pendidikan Islam"];
const orgChartLevel=(position="")=>position.toLowerCase().includes("pengetua")&&!position.toLowerCase().includes("penolong")?0:position.toLowerCase().includes("penolong kanan")?1:2;
const orgChartDefaultOrder=(position="")=>{const index=orgChartPositions.indexOf(position);return index<0?900:index===0?0:index<5?90+index*10:150+index*10};
const blankPortalUser=():PortalUser=>({id:"",email:"",name:"",position:"Guru Akademik Biasa",grade:"",role:"teacher",status:"active",showDirectory:true,showOrgChart:false,orgPosition:"",orgOrder:999});
const pushDestinations=[
  {id:"notification",label:"Buka notifikasi",url:"__notification__"},
  {id:"home",label:"Portal Utama",url:"/"},
  {id:"warga",label:"Guru & Staf",url:"/?module=warga"},
  {id:"opr-create",label:"Buat OPR",url:"/?module=oprgenerator"},
  {id:"booking-create",label:"Buat Tempahan",url:"/?module=etempahan&tab=form"},
  {id:"oprhub",label:"Pusat OPR",url:"/?module=oprhub"},
  {id:"ekeberadaan",label:"E-Keberadaan & Relief",url:"/?module=ekeberadaan"},
  {id:"etempahan",label:"E-Tempahan",url:"/?module=etempahan"},
  {id:"epemantauan",label:"e-Pemantauan",url:"/?module=epemantauan"},
  {id:"achievement",label:"Arkib Kejayaan",url:"/?module=achievement"},
  {id:"custom",label:"Pautan sendiri",url:""},
] as const;
function AdminPanel({ notify }: { notify: (message: string) => void }) {
  const today=new Date().toISOString().slice(0,10);
  const [me,setMe]=useState<PortalUser|null>(null);const [users,setUsers]=useState<PortalUser[]>([]);const [trash,setTrash]=useState<PortalUser[]>([]);const [logs,setLogs]=useState<AdminLog[]>([]);const [permissions,setPermissions]=useState<AdminPermission[]>([]);const [settings,setSettings]=useState<Record<string,string>>({});const [announcements,setAnnouncements]=useState<PortalAnnouncement[]>([]);const [events,setEvents]=useState<PortalEvent[]>([]);const [announcementDraft,setAnnouncementDraft]=useState({title:"",body:"",audience:"Semua",publishedAt:today,endsAt:today});const [announcementImage,setAnnouncementImage]=useState<File|null>(null);const [eventDraft,setEventDraft]=useState({title:"",eventDate:today,endDate:today,category:"Sekolah",details:""});const [tab,setTab]=useState("dashboard");const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [query,setQuery]=useState("");const [editing,setEditing]=useState<PortalUser|null>(null);const [adminPhoto,setAdminPhoto]=useState<File|null>(null);
  const [exporting,setExporting]=useState("");
  const [visitorExportDate,setVisitorExportDate]=useState(today);
  const [pushSummary,setPushSummary]=useState({total:0,users:0});
  const [pushHistory,setPushHistory]=useState<Array<{id:string;title:string;body:string;audience:string;status:string;sentCount:number;failedCount:number;createdAt:string}>>([]);
  const [pushDraft,setPushDraft]=useState({title:"",body:"",destination:"home",customUrl:"",audience:"Semua warga",userIds:[] as string[]});
  const [pushUserSearch,setPushUserSearch]=useState("");
  const [pushSending,setPushSending]=useState(false);
  const [schoolYears,setSchoolYears]=useState<AdminSchoolYear[]>([]);
  const [activeSchoolYear,setActiveSchoolYear]=useState(new Date().getFullYear());
  const [selectedSchoolYear,setSelectedSchoolYear]=useState(new Date().getFullYear());
  const [schoolYearBusy,setSchoolYearBusy]=useState(false);
  const [schoolYearError,setSchoolYearError]=useState("");
  const [driveState,setDriveState]=useState<"idle"|"testing"|"connected"|"error">("idle");
  const testDrive=async()=>{setDriveState("testing");try{const response=await fetch("/api/drive?refresh=1",{cache:"no-store"}),data=await response.json();if(!response.ok)throw new Error(data.error||"Sambungan gagal");setDriveState("connected");notify(`Google Drive sekolah disahkan · ${(data.files||[]).length} fail OPR boleh dibaca`);}catch(e){setDriveState("error");notify(e instanceof Error?e.message:"Sambungan Google Drive gagal")}};
  const loadPush=async()=>{try{const response=await fetch("/api/push?view=admin",{cache:"no-store"}),data=await response.json();if(response.ok){setPushSummary(data.summary||{total:0,users:0});setPushHistory(data.history||[]);}}catch{}};
  const api=async(method="GET",body?:unknown,url="/api/admin-users")=>{const response=await fetch(url,{method,headers:{...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(data.error||"Permintaan tidak berjaya.");return data;};
  const load=async()=>{try{setLoading(true);setError("");const [adminResponse,contentResponse]=await Promise.all([fetch("/api/admin-users",{cache:"no-store"}),fetch("/api/portal-content?view=admin",{cache:"no-store"})]),data=await adminResponse.json(),content=await contentResponse.json();if(!adminResponse.ok)throw new Error(data.error||"Akses tidak dibenarkan.");setMe(data.me);setUsers(data.users||[]);setTrash(data.trash||[]);setLogs(data.logs||[]);setPermissions(data.permissions||[]);setSettings({...data.settings,...(content.settings||{})});setAnnouncements(content.announcements||[]);setEvents(content.events||[]);return true;}catch(e){setError(e instanceof Error?e.message:"Akses tidak dibenarkan.");setMe(null);return false;}finally{setLoading(false);}};
  useEffect(()=>{let cancelled=false;const start=async()=>{if(await load())return;try{const config=await fetch("/api/admin-users?resource=config").then(r=>r.json());if(!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')){const s=document.createElement("script");s.src="https://accounts.google.com/gsi/client";s.async=true;document.head.appendChild(s);}for(let i=0;i<50&&!window.google;i++)await new Promise(r=>setTimeout(r,100));if(cancelled||!window.google)return;window.google.accounts.id.initialize({client_id:config.clientId,callback:({credential})=>{void fetch("/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential})}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Log masuk tidak berjaya.");await load();}).catch(reason=>setError(reason instanceof Error?reason.message:"Log masuk tidak berjaya."));}});for(let i=0;i<20&&!document.getElementById("google-admin-signin");i++)await new Promise(r=>setTimeout(r,50));const el=document.getElementById("google-admin-signin");if(el){el.innerHTML="";window.google.accounts.id.renderButton(el,{theme:"outline",size:"large",text:"continue_with",shape:"pill",width:280});}}catch{setError("Butang Google tidak dapat disediakan sekarang.");setLoading(false);}};void start();return()=>{cancelled=true};},[]);
  useEffect(()=>{if(me)void loadPush();},[me?.id]);
  const loadSchoolYears=async(preferredYear?:number)=>{try{setSchoolYearError("");const response=await fetch(`/api/skas?year=${preferredYear||selectedSchoolYear}`,{cache:"no-store"}),data=await response.json() as{activeYear?:number;years?:AdminSchoolYear[];error?:string};if(!response.ok)throw new Error(data.error||"Maklumat tahun tidak dapat dibaca");const years=data.years||[],active=data.activeYear||new Date().getFullYear();setSchoolYears(years);setActiveSchoolYear(active);setSelectedSchoolYear(current=>preferredYear||years.some(item=>item.schoolYear===current)?(preferredYear||current):active);}catch(e){setSchoolYearError(e instanceof Error?e.message:"Maklumat tahun tidak dapat dibaca");}};
  useEffect(()=>{if(me&&tab==="years")void loadSchoolYears();},[me?.id,tab]);
  const createSchoolYear=async()=>{const next=Math.max(new Date().getFullYear(),activeSchoolYear,...schoolYears.map(item=>item.schoolYear))+1;if(!confirm(`Sediakan tahun ${next} sebagai draf? Tahun ${activeSchoolYear} kekal aktif.`))return;try{setSchoolYearBusy(true);const response=await fetch("/api/skas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create_year",schoolYear:next,preparedFrom:activeSchoolYear})}),data=await response.json() as{error?:string};if(!response.ok)throw new Error(data.error||"Tahun baharu tidak dapat disediakan");setSelectedSchoolYear(next);notify(`Tahun ${next} telah disediakan sebagai draf`);await loadSchoolYears(next);}catch(e){notify(e instanceof Error?e.message:"Tahun baharu tidak dapat disediakan");}finally{setSchoolYearBusy(false);}};
  const activateSchoolYear=async()=>{const selected=schoolYears.find(item=>item.schoolYear===selectedSchoolYear);if(!selected||selected.status!=="draft")return;if(!confirm(`Aktifkan tahun ${selectedSchoolYear} dan tutup tahun ${activeSchoolYear}? Dokumen tahun lama kekal boleh dibaca.`))return;try{setSchoolYearBusy(true);const response=await fetch("/api/skas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"activate_year",schoolYear:selectedSchoolYear})}),data=await response.json() as{error?:string};if(!response.ok)throw new Error(data.error||"Tahun tidak dapat diaktifkan");notify(`Tahun ${selectedSchoolYear} kini aktif. Tahun ${activeSchoolYear} telah ditutup.`);await loadSchoolYears(selectedSchoolYear);}catch(e){notify(e instanceof Error?e.message:"Tahun tidak dapat diaktifkan");}finally{setSchoolYearBusy(false);}};
  const save=async()=>{if(!editing)return;try{await api(editing.id?"PUT":"POST",editing);if(adminPhoto&&editing.id){if(adminPhoto.size>1_500_000)throw new Error("Gambar pentadbir mesti 1.5 MB atau kurang");const photoBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(reader.error);reader.readAsDataURL(adminPhoto);});await api("PUT",{id:editing.id,photoBase64,mimeType:adminPhoto.type},"/api/admin-users?resource=admin-photo");}setEditing(null);setAdminPhoto(null);notify("Maklumat pengguna berjaya disimpan");await load();}catch(e){notify(e instanceof Error?e.message:"Tidak dapat disimpan")}};
  const remove=async(user:PortalUser)=>{if(!confirm(`Padam akses ${user.name}?`))return;try{await api("DELETE",undefined,`/api/admin-users?id=${encodeURIComponent(user.id)}`);notify("Akses pengguna telah dipadam");await load();}catch(e){notify(e instanceof Error?e.message:"Tidak dapat dipadam")}};
  const restore=async(user:PortalUser)=>{try{await api("POST",{},`/api/admin-users?resource=restore&id=${encodeURIComponent(user.id)}`);notify("Pengguna berjaya dipulihkan");await load();}catch(e){notify(e instanceof Error?e.message:"Tidak dapat dipulihkan")}};
  const saveProfileSettings=async()=>{try{await api("PUT",{settings},"/api/portal-content");invalidatePublicContent();notify("Profil sekolah berjaya dikemas kini");await load();}catch(e){notify(e instanceof Error?e.message:"Profil tidak dapat disimpan")}};
  const saveModuleSettings=async()=>{try{await api("PUT",{settings},"/api/admin-users?resource=settings");notify("Status modul berjaya disimpan");await load();}catch(e){notify(e instanceof Error?e.message:"Tetapan tidak dapat disimpan")}};
  const saveAnnouncement=async()=>{try{let imageBase64="",imageMimeType="";if(announcementImage){if(announcementImage.size>2_000_000)throw new Error("Gambar pengumuman mesti 2 MB atau kurang");imageMimeType=announcementImage.type;imageBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(reader.error);reader.readAsDataURL(announcementImage);});}await api("POST",{kind:"announcement",...announcementDraft,imageBase64,imageMimeType},"/api/portal-content");invalidatePublicContent();setAnnouncementDraft({title:"",body:"",audience:"Semua",publishedAt:today,endsAt:today});setAnnouncementImage(null);notify("Pengumuman berjaya diterbitkan");await load();}catch(e){notify(e instanceof Error?e.message:"Pengumuman tidak dapat diterbitkan")}};
  const saveEvent=async()=>{try{await api("POST",{kind:"event",...eventDraft},"/api/portal-content");invalidatePublicContent();setEventDraft({title:"",eventDate:today,endDate:today,category:"Sekolah",details:""});notify("Aktiviti takwim berjaya disimpan");await load();}catch(e){notify(e instanceof Error?e.message:"Aktiviti tidak dapat disimpan")}};
  const sendPush=async()=>{try{setPushSending(true);const destination=pushDestinations.find(item=>item.id===pushDraft.destination),url=pushDraft.destination==="custom"?pushDraft.customUrl:destination?.url||"/";const response=await fetch("/api/push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send",title:pushDraft.title,body:pushDraft.body,url,audience:pushDraft.audience,userIds:pushDraft.userIds})}),data=await response.json() as{error?:string;sent?:number;failed?:number};if(!response.ok)throw new Error(data.error||"Notifikasi tidak dapat dihantar");notify(`Notifikasi dihantar kepada ${data.sent||0} peranti${data.failed?` · ${data.failed} gagal`:""}`);setPushDraft({title:"",body:"",destination:"home",customUrl:"",audience:"Semua warga",userIds:[]});setPushUserSearch("");await loadPush();}catch(e){notify(e instanceof Error?e.message:"Notifikasi tidak dapat dihantar");}finally{setPushSending(false);}};
  const deleteContent=async(kind:"announcement"|"event",id:string)=>{if(!confirm("Padam rekod ini?"))return;try{await api("DELETE",undefined,`/api/portal-content?kind=${kind}&id=${encodeURIComponent(id)}`);invalidatePublicContent();notify("Rekod telah dipadam");await load();}catch(e){notify(e instanceof Error?e.message:"Rekod tidak dapat dipadam")}};
  const moduleNames:Array<[string,string]>=[["module_opr","Pusat OPR"],["module_epanitia","e-Panitia"],["module_ekeberadaan","E-Keberadaan & Relief"],["module_etempahan","E-Tempahan"],["module_epemantauan","e-Pemantauan"],["module_ekunjung","E-Kunjung"],["module_achievement","Arkib Kejayaan"]];
  const accessModules=[["users","Pengguna"],["content","Kandungan Portal"],["opr","Pusat OPR"],["ekeberadaan","E-Keberadaan"],["etempahan","E-Tempahan"],["ekunjung","E-Kunjung"],["achievement","Arkib Kejayaan"],["logs","Log Aktiviti"]];
  const togglePermission=async(user:PortalUser,key:string)=>{const current=permissions.filter(x=>x.userId===user.id&&x.enabled).map(x=>x.moduleKey),next=current.includes(key)?current.filter(x=>x!==key):[...current,key];try{await api("PUT",{id:user.id,permissions:next},"/api/admin-users?resource=permissions");notify("Kebenaran admin dikemas kini");await load();}catch(e){notify(e instanceof Error?e.message:"Kebenaran tidak dapat disimpan")}};
  const logout=()=>{void fetch("/api/session",{method:"DELETE"});window.google?.accounts.id.disableAutoSelect();setMe(null);setUsers([]);location.reload();};
  const saveDownload=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const exportJson=async(kind:"ekeberadaan"|"etempahan")=>{setExporting(kind);try{let payload:unknown;if(kind==="ekeberadaan"){const response=await fetch("/api/ekeberadaan?resource=all",{cache:"no-store"});payload=await response.json();if(!response.ok)throw new Error("Data E-Keberadaan tidak dapat dieksport");}else{const year=new Date().getFullYear(),all:unknown[]=[];for(let month=0;month<12;month+=1){const from=`${year}-${String(month+1).padStart(2,"0")}-01`,end=new Date(year,month+1,0),to=`${year}-${String(month+1).padStart(2,"0")}-${String(end.getDate()).padStart(2,"0")}`;const response=await fetch(`/api/etempahan?from=${from}&to=${to}`,{cache:"no-store"}),data=await response.json();if(response.ok&&Array.isArray(data.bookings))all.push(...data.bookings);}payload={exportedAt:new Date().toISOString(),year,bookings:all};}saveDownload(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),`${kind}-SMKAP-${new Date().toISOString().slice(0,10)}.json`);notify(`Data ${kind} berjaya dimuat turun`);}catch(e){notify(e instanceof Error?e.message:"Eksport tidak berjaya");}finally{setExporting("");}};
  const exportVisitorPdf=async()=>{setExporting("ekunjung");try{const response=await fetch(`/api/ekunjung?view=admin&date=${visitorExportDate}`,{cache:"no-store"}),data=await response.json() as{records?:VisitorAdminRecord[];error?:string};if(!response.ok)throw new Error(data.error||"Data E-Kunjung tidak dapat dieksport");const records=data.records||[];if(!records.length)throw new Error("Tiada rekod pelawat pada tarikh yang dipilih");const jsPDF=await loadJsPdf(),pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true}),pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight(),margin=12;const header=()=>{pdf.setFillColor(18,65,75);pdf.rect(0,0,pageWidth,30,"F");pdf.setTextColor(255,255,255);pdf.setFont("helvetica","bold");pdf.setFontSize(16);pdf.text("SENARAI PELAWAT E-KUNJUNG",margin,13);pdf.setFontSize(9);pdf.setFont("helvetica","normal");pdf.text(`SMK Agama Pahang · Tarikh: ${visitorExportDate}`,margin,21);pdf.text(`Dijana: ${new Date().toLocaleString("ms-MY")}`,pageWidth-margin,21,{align:"right"});};header();let y=38;records.forEach((record,index)=>{const details=[`Telefon: ${record.phone||"—"}${record.vehicleNo?` · Kenderaan: ${record.vehicleNo}`:""}`,`Tujuan: ${record.purpose||"—"} · Staf: ${record.staff||"—"}`,`Organisasi/Tempat: ${[record.organisation,record.meetingPlace].filter(Boolean).join(" · ")||"—"}${record.notes?` · Catatan: ${record.notes}`:""}`],lines=details.flatMap(text=>pdf.splitTextToSize(text,198));const h=Math.max(23,12+lines.length*4);if(y+h>pageHeight-15){pdf.addPage();header();y=38;}pdf.setFillColor(index%2?247:239,index%2?250:247,index%2?250:246);pdf.setDrawColor(205,220,221);pdf.roundedRect(margin,y,pageWidth-margin*2,h,2,2,"FD");pdf.setTextColor(20,55,63);pdf.setFont("helvetica","bold");pdf.setFontSize(10);pdf.text(`${index+1}. ${record.name}`,margin+4,y+7);pdf.setFontSize(9);pdf.text(`${record.timeIn} — ${record.timeOut||"BELUM KELUAR"}`,pageWidth-margin-4,y+7,{align:"right"});pdf.setFont("helvetica","normal");pdf.setTextColor(70,88,92);pdf.setFontSize(7.5);pdf.text(lines,margin+4,y+13,{lineHeightFactor:1.35});y+=h+3;});pdf.setFontSize(7);pdf.setTextColor(95,110,113);pdf.text(`Jumlah: ${records.length} pelawat · Belum keluar: ${records.filter(record=>!record.timeOut).length}`,margin,pageHeight-7);saveDownload(pdf.output("blob"),`Senarai-Pelawat-${visitorExportDate}.pdf`);notify("PDF senarai pelawat berjaya dimuat turun");}catch(e){notify(e instanceof Error?e.message:"PDF E-Kunjung tidak berjaya dijana");}finally{setExporting("");}};
  const exportAllReports=async()=>{setExporting("reports");try{const index=await fetch("/api/drive",{cache:"no-store"}),data=await index.json() as{files?:OprReport[];error?:string};if(!index.ok||!data.files?.length)throw new Error(data.error||"Tiada laporan untuk dimuat turun");const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"bundle",ids:data.files.map(item=>item.id),name:`Semua-Laporan-SMKAP-${new Date().toISOString().slice(0,10)}.zip`})});if(!response.ok){const issue=await response.json() as{error?:string};throw new Error(issue.error||"Fail ZIP tidak dapat disediakan");}saveDownload(await response.blob(),`Semua-Laporan-SMKAP-${new Date().toISOString().slice(0,10)}.zip`);notify("Semua PDF OPR, e-Pemantauan, laporan bertugas dan arkib berjaya dimuat turun");}catch(e){notify(e instanceof Error?e.message:"Eksport laporan tidak berjaya");}finally{setExporting("");}};
  if(!me)return <div className="admin-auth"><span className="modal-overline">KAWALAN PENTADBIR</span><h2 id="folder-title">Log masuk dengan ID DELIMa</h2><p>Gunakan akaun <b>@moe-dl.edu.my</b> yang telah didaftarkan oleh sekolah.</p><div id="google-admin-signin" className="google-signin-slot" />{loading&&<small>Menyediakan log masuk selamat…</small>}{error&&<div className="admin-error">{error}</div>}<div className="admin-security"><ShieldCheck aria-hidden="true"/><span>Kata laluan tidak disimpan oleh portal. Pengesahan dikendalikan oleh Google.</span></div></div>;
  const visible=users.filter(u=>`${u.name} ${u.email} ${u.position} ${u.grade}`.toLowerCase().includes(query.toLowerCase()));
  const pushUsers=users.filter(user=>user.status==="active"&&`${user.name} ${user.email} ${user.position}`.toLowerCase().includes(pushUserSearch.toLowerCase()));
  const togglePushUser=(id:string)=>setPushDraft(current=>({...current,userIds:current.userIds.includes(id)?current.userIds.filter(userId=>userId!==id):[...current.userIds,id]}));
  const orgPeers=editing?users.filter(user=>user.id!==editing.id&&user.showOrgChart&&orgChartLevel(user.orgPosition||user.position)===orgChartLevel(editing.orgPosition||editing.position)).sort((a,b)=>(a.orgOrder??999)-(b.orgOrder??999)||a.name.localeCompare(b.name)):[];
  const currentOrgOrder=editing?.orgOrder??999;
  const orgPrevious=[...orgPeers].reverse().find(user=>(user.orgOrder??999)<currentOrgOrder);
  const orgNext=orgPeers.find(user=>(user.orgOrder??999)>currentOrgOrder);
  const placeAfter=(id:string)=>{if(!editing)return;const anchor=orgPeers.find(user=>user.id===id);if(!anchor){const first=orgPeers[0];setEditing({...editing,orgOrder:first?Math.max(0,(first.orgOrder??10)-10):orgChartDefaultOrder(editing.orgPosition||editing.position)});return;}const index=orgPeers.indexOf(anchor),next=orgPeers[index+1],anchorOrder=anchor.orgOrder??999;setEditing({...editing,orgOrder:next?(anchorOrder+(next.orgOrder??anchorOrder+20))/2:anchorOrder+10});};
  const nav=[["dashboard","Dashboard"],["years","Tahun Persekolahan"],["users","Pengguna"],["expertise","Kepakaran Guru"],["access","Akses Admin"],["content","Tentang Sekolah"],["announcements","Pengumuman"],["notifications","Notifikasi"],["calendar","Takwim"],["modules","Modul"],["drive","Dokumen & Google Drive"],["export","Eksport & Sandaran"],["trash","Tong Sampah"],["logs","Log Aktiviti"]];
  const actionLabel=(action:string)=>({create:"Tambah pengguna",update:"Ubah pengguna",delete:"Padam pengguna",restore:"Pulih pengguna",profile_update:"Kemas kini profil",settings_update:"Ubah tetapan",permissions_update:"Ubah kebenaran"}[action]||action);
  return <div className="admin-console"><header><div><span className="modal-overline">KAWALAN PENTADBIR</span><h2 id="folder-title">Pusat Pentadbiran Portal</h2><p>{me.name} · {me.role==="super_admin"?"Super Admin":"Admin"}</p></div><button onClick={logout}>Log keluar</button></header>
    <nav className="admin-tabs">{nav.filter(([key])=>me.role==="super_admin"||!["access","trash"].includes(key)).map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    {tab==="drive"&&<section className="admin-section admin-drive"><span className="modal-overline">PUSAT DOKUMEN SEKOLAH</span><h3>Dokumen & Google Drive</h3><p>Satu sambungan Google Drive sekolah digunakan oleh Pusat OPR, e-Panitia, Pengurusan Sekolah dan Pusat SK@S.</p><div className="admin-export-grid"><article><strong>Status sambungan</strong><span>{driveState==="connected"?"Disahkan dan boleh membaca fail":driveState==="error"?"Sambungan memerlukan perhatian":"Belum diuji dalam sesi ini"}</span><button onClick={()=>void testDrive()} disabled={driveState==="testing"}>{driveState==="testing"?"Sedang menguji…":"Uji sambungan Drive"}</button></article><article><strong>Storan rasmi</strong><span>Google Drive sekolah · semua modul menggunakan sambungan yang sama.</span><button onClick={()=>void testDrive()}>Sambung semula Google Drive</button></article><article><strong>Folder induk</strong><span>Folder tahun dan bidang dikawal oleh integrasi Drive pusat. Pemetaan modul tidak menyalin fail.</span><button onClick={()=>notify("Folder induk kekal pada sambungan Drive sekolah semasa")}>Periksa folder induk</button></article><article><strong>Identiti dokumen sekolah</strong><span>Logo, nama, alamat, footer dan format PDF menggunakan pembina OPR rasmi.</span><button onClick={()=>setTab("content")}>Buka identiti sekolah</button></article></div><div className="drive-admin-principles"><strong>Peraturan storan aktif</strong><span>✓ Kejayaan hanya dipaparkan selepas Drive memulangkan file ID</span><span>✓ Kandungan fail tidak disimpan dalam localStorage atau D1</span><span>✓ Versi dan pemetaan disimpan sebagai metadata rekod induk</span><span>✓ Shared Drive perlu diutamakan apabila dikonfigurasi oleh sekolah</span></div></section>}
    {tab==="dashboard"&&<><div className="admin-user-summary admin-kpis"><article><b>{users.length}</b><span>Jumlah pengguna</span></article><article><b>{users.filter(u=>u.role.includes("admin")).length}</b><span>Pentadbir</span></article><article><b>{users.filter(u=>u.status==="inactive").length}</b><span>Tidak aktif</span></article><article><b>{logs.length}</b><span>Aktiviti terkini</span></article></div><section className="admin-welcome"><strong>Semua kawalan penting dalam satu tempat</strong><p>Urus warga sekolah, hadkan kuasa admin, kemas kini maklumat awam, hentikan modul sementara dan semak setiap perubahan.</p><div>{moduleNames.map(([key,label])=><span key={key} className={settings[key]==="disabled"?"off":""}>{label}<b>{settings[key]==="disabled"?"Ditutup":"Aktif"}</b></span>)}</div></section></>}
    {tab==="years"&&<section className="admin-section admin-school-year"><span className="modal-overline">TAHUN PERSEKOLAHAN</span><h3>Tutup tahun dan buka tahun baharu</h3><p>Sediakan tahun seterusnya sebagai draf dahulu. Apabila draf diaktifkan, tahun semasa ditutup secara automatik dan rekodnya kekal boleh dibaca.</p>{schoolYearError?<div className="admin-year-error" role="alert"><span>{schoolYearError}</span><button onClick={()=>void loadSchoolYears()}>Cuba semula</button></div>:<><div className="admin-year-current"><span>TAHUN AKTIF</span><strong>{activeSchoolYear}</strong><small>Sedang digunakan untuk rekod dan muat naik baharu</small></div><div className="admin-year-flow"><article><b>1</b><div><strong>Sediakan tahun baharu</strong><small>Cipta ruang tahun seterusnya sebagai draf tanpa menutup {activeSchoolYear}.</small></div><button disabled={schoolYearBusy||schoolYears.some(item=>item.schoolYear>activeSchoolYear&&item.status==="draft")} onClick={()=>void createSchoolYear()}>{schoolYears.some(item=>item.schoolYear>activeSchoolYear&&item.status==="draft")?"Draf telah tersedia":"Sediakan tahun baharu"}</button></article><article><b>2</b><div><strong>Pilih draf untuk diaktifkan</strong><small>Tindakan ini akan menutup tahun {activeSchoolYear} secara automatik.</small></div><select value={selectedSchoolYear} onChange={event=>setSelectedSchoolYear(Number(event.target.value))} aria-label="Pilih tahun persekolahan">{schoolYears.map(item=><option key={item.schoolYear} value={item.schoolYear}>{item.schoolYear} · {item.status==="active"?"Aktif":item.status==="draft"?"Draf":"Ditutup"}</option>)}</select><button className="admin-year-activate" disabled={schoolYearBusy||schoolYears.find(item=>item.schoolYear===selectedSchoolYear)?.status!=="draft"} onClick={()=>void activateSchoolYear()}>{schoolYearBusy?"Sedang memproses…":`Aktifkan ${selectedSchoolYear}`}</button></article></div><div className="admin-year-history"><strong>Sejarah tahun</strong>{schoolYears.map(item=><span key={item.schoolYear} className={item.status}><b>{item.schoolYear}</b><em>{item.status==="active"?"Aktif":item.status==="draft"?"Draf":"Ditutup"}</em></span>)}</div></>}</section>}
    {tab==="users"&&<><div className="admin-toolbar"><label>⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama, e-mel, jawatan atau gred"/></label>{me.role==="super_admin"&&<button onClick={()=>{setAdminPhoto(null);setEditing(blankPortalUser())}}>＋ Tambah pengguna</button>}</div>{loading?<p className="admin-state">Membaca direktori…</p>:<div className="admin-user-list">{visible.map(user=><article key={user.id}><div className="admin-avatar">{user.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("")}</div><div><strong>{user.name}</strong><small>{user.email}</small><span>{user.position||"Jawatan belum ditetapkan"}{user.grade?` · ${user.grade}`:""} · {user.showDirectory===false?"Tidak dipapar":"Dipapar dalam direktori"}{user.showOrgChart?` · Carta: ${user.orgPosition||user.position}`:""}</span></div><b>{user.status==="inactive"?"Tidak aktif":user.role==="super_admin"?"Super Admin":user.role==="admin"?"Admin":"Pengguna"}</b>{me.role==="super_admin"&&<div className="admin-row-actions"><button onClick={()=>{setAdminPhoto(null);setEditing({...user})}}>Ubah</button><button onClick={()=>void remove(user)}>Padam</button></div>}</article>)}</div>}</>}
    {tab==="expertise"&&<StaffExpertiseList/>}
    {tab==="access"&&<section className="admin-section"><span className="modal-overline">AKSES ADMIN</span><h3>Hadkan fungsi setiap admin</h3><p>Super Admin kekal mempunyai semua kuasa. Pilih modul yang boleh diurus oleh setiap Admin.</p><div className="admin-access-list">{users.filter(u=>u.role==="admin").map(user=><article key={user.id}><div><strong>{user.name}</strong><small>{user.email}</small></div><div>{accessModules.map(([key,label])=><label key={key}><input type="checkbox" checked={permissions.some(x=>x.userId===user.id&&x.moduleKey===key&&x.enabled)} onChange={()=>void togglePermission(user,key)}/><span>{label}</span></label>)}</div></article>)}{!users.some(u=>u.role==="admin")&&<p>Belum ada akaun Admin biasa.</p>}</div></section>}
    {tab==="content"&&<section className="admin-section admin-settings"><span className="modal-overline">TENTANG SEKOLAH</span><h3>Kemas kini profil rasmi sekolah</h3><p>Carta organisasi tidak perlu ditaip di sini. Ia dibina automatik daripada jawatan Pengetua, Penolong Kanan dan Guru Kanan Mata Pelajaran dalam senarai pengguna.</p><div className="admin-editor-grid"><label>Nama rasmi sekolah<input value={settings.school_name||""} onChange={e=>setSettings({...settings,school_name:e.target.value})}/></label><label>Kod sekolah<input value={settings.school_code||""} onChange={e=>setSettings({...settings,school_code:e.target.value})}/></label><label>Jenis / kategori<input value={settings.school_type||""} onChange={e=>setSettings({...settings,school_type:e.target.value})}/></label><label>Gred sekolah<input value={settings.school_grade||""} onChange={e=>setSettings({...settings,school_grade:e.target.value})}/></label><label>Tarikh ditubuhkan<input value={settings.school_founded||""} onChange={e=>setSettings({...settings,school_founded:e.target.value})}/></label><label>Cogan kata<input value={settings.school_motto||""} onChange={e=>setSettings({...settings,school_motto:e.target.value})}/></label><label>E-mel sekolah<input value={settings.school_email||""} onChange={e=>setSettings({...settings,school_email:e.target.value})}/></label><label>Nombor telefon<input value={settings.school_phone||""} onChange={e=>setSettings({...settings,school_phone:e.target.value})}/></label></div><label>Alamat sekolah<input value={settings.school_address||""} onChange={e=>setSettings({...settings,school_address:e.target.value})}/></label><label>Sejarah ringkas<textarea rows={5} value={settings.school_history||""} onChange={e=>setSettings({...settings,school_history:e.target.value})}/></label><label>Visi<textarea rows={3} value={settings.school_vision||""} onChange={e=>setSettings({...settings,school_vision:e.target.value})}/></label><label>Misi<textarea rows={3} value={settings.school_mission||""} onChange={e=>setSettings({...settings,school_mission:e.target.value})}/></label><div className="admin-editor-grid"><label>Pautan Koperasi SMKAP<input type="url" value={settings.parent_coop_url||"https://koperasismkap.kiah.store/"} onChange={e=>setSettings({...settings,parent_coop_url:e.target.value})}/></label><label>Pautan Sumbangan PIBG<input type="url" value={settings.parent_pibg_url||"https://app.herepay.org/pibgsmkapahang"} onChange={e=>setSettings({...settings,parent_pibg_url:e.target.value})}/></label></div><label>Teks kaki portal<input value={settings.footer_notice||""} onChange={e=>setSettings({...settings,footer_notice:e.target.value})}/></label><button className="admin-save" onClick={()=>void saveProfileSettings()}>Simpan profil sekolah dan pautan</button></section>}
    {tab==="announcements"&&<section className="admin-section"><span className="modal-overline">PENGUMUMAN</span><h3>Terbitkan hebahan sekolah</h3><p>Pengumuman “Guru & Staf” muncul sekali selepas login. Selepas dibaca, pengguna boleh membukanya semula melalui butang Pengumuman dalam ruang Guru & Staf.</p><div className="admin-content-form"><label>Tajuk pengumuman<input value={announcementDraft.title} onChange={e=>setAnnouncementDraft({...announcementDraft,title:e.target.value})}/></label><div className="admin-editor-grid"><label>Sasaran<select value={announcementDraft.audience} onChange={e=>setAnnouncementDraft({...announcementDraft,audience:e.target.value})}><option>Semua</option><option>Guru & Staf</option><option>Ibu Bapa / Penjaga</option><option>Murid</option></select></label><label>Tarikh mula<input type="date" value={announcementDraft.publishedAt} onChange={e=>setAnnouncementDraft({...announcementDraft,publishedAt:e.target.value,endsAt:e.target.value>announcementDraft.endsAt?e.target.value:announcementDraft.endsAt})}/></label><label>Tarikh tamat<input type="date" min={announcementDraft.publishedAt} value={announcementDraft.endsAt} onChange={e=>setAnnouncementDraft({...announcementDraft,endsAt:e.target.value})}/></label></div><label>Maklumat<textarea rows={5} value={announcementDraft.body} onChange={e=>setAnnouncementDraft({...announcementDraft,body:e.target.value})}/></label><label className="admin-announcement-upload">Gambar pengumuman (pilihan)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAnnouncementImage(e.target.files?.[0]||null)}/><span>{announcementImage?announcementImage.name:"Pilih JPG, PNG atau WebP"}</span><small>Maksimum 2 MB</small></label><button className="admin-save" onClick={()=>void saveAnnouncement()}>Terbitkan pengumuman</button></div><div className="admin-manage-list">{announcements.map(item=><article key={item.id}>{item.imageDataUrl&&<img className="admin-announcement-thumb" src={item.imageDataUrl} alt=""/>}<div><small>{item.audience} · {new Date(`${item.publishedAt}T12:00:00`).toLocaleDateString("ms-MY")} – {new Date(`${item.endsAt||item.publishedAt}T12:00:00`).toLocaleDateString("ms-MY")}</small><strong>{item.title}</strong><p>{item.body}</p></div><button onClick={()=>void deleteContent("announcement",item.id)}>Padam</button></article>)}{!announcements.length&&<p>Belum ada pengumuman.</p>}</div></section>}
    {tab==="notifications"&&<section className="admin-section admin-push"><span className="modal-overline">NOTIFIKASI PERANTI</span><h3>Hantar makluman kepada warga sekolah</h3><p>Notifikasi diterima pada telefon atau komputer yang telah didaftarkan oleh pengguna.</p><div className="admin-push-kpis"><article><b>{pushSummary.users}</b><span>Pengguna berdaftar</span></article><article><b>{pushSummary.total}</b><span>Peranti aktif</span></article></div><div className="admin-content-form"><label>Tajuk notifikasi<input value={pushDraft.title} maxLength={100} onChange={e=>setPushDraft({...pushDraft,title:e.target.value})} placeholder="Contoh: Sila lengkapkan OPR"/></label><label>Mesej<textarea rows={4} value={pushDraft.body} maxLength={500} onChange={e=>setPushDraft({...pushDraft,body:e.target.value})} placeholder="Tulis makluman ringkas dan jelas"/></label><div className="admin-editor-grid"><label>Sasaran<select value={pushDraft.audience} onChange={e=>setPushDraft({...pushDraft,audience:e.target.value,userIds:e.target.value==="Pengguna tertentu"?pushDraft.userIds:[]})}><option>Semua warga</option><option>Guru</option><option>Admin</option><option>Pengguna tertentu</option></select></label><label>Tindakan apabila ditekan<select value={pushDraft.destination} onChange={e=>setPushDraft({...pushDraft,destination:e.target.value})}>{pushDestinations.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>{pushDraft.destination==="custom"&&<label>Pautan sendiri<input value={pushDraft.customUrl} onChange={e=>setPushDraft({...pushDraft,customUrl:e.target.value})} placeholder="https:// atau /halaman"/></label>}{pushDraft.audience==="Pengguna tertentu"&&<div className="push-custom-users"><header><label><Search aria-hidden="true"/><input value={pushUserSearch} onChange={e=>setPushUserSearch(e.target.value)} placeholder="Cari nama, e-mel atau jawatan"/></label><b>{pushDraft.userIds.length} dipilih</b></header><div>{pushUsers.map(user=><label key={user.id}><input type="checkbox" checked={pushDraft.userIds.includes(user.id)} onChange={()=>togglePushUser(user.id)}/><span><strong>{user.name}</strong><small>{user.email} · {user.position}</small></span></label>)}{!pushUsers.length&&<p>Tiada pengguna yang sepadan.</p>}</div></div>}<div className="push-action-preview"><span>APABILA DITEKAN</span><strong>{pushDestinations.find(item=>item.id===pushDraft.destination)?.label||"Portal Utama"}</strong><small>Notifikasi akan membuka bahagian ini dalam portal.</small></div><button className="admin-save" disabled={pushSending||!pushDraft.title.trim()||!pushDraft.body.trim()||(pushDraft.audience==="Pengguna tertentu"&&!pushDraft.userIds.length)||(pushDraft.destination==="custom"&&!pushDraft.customUrl.trim())} onClick={()=>void sendPush()}>{pushSending?"Sedang menghantar…":"Hantar notifikasi"}</button></div><div className="admin-manage-list">{pushHistory.map(item=><article key={item.id}><div><small>{item.audience} · {new Date(item.createdAt).toLocaleString("ms-MY")}</small><strong>{item.title}</strong><p>{item.body}</p><span>{item.sentCount} berjaya · {item.failedCount} gagal</span></div><b className={`push-status ${item.status}`}>{item.status}</b></article>)}{!pushHistory.length&&<p>Belum ada notifikasi dihantar.</p>}</div></section>}
    {tab==="calendar"&&<section className="admin-section"><span className="modal-overline">TAKWIM SEKOLAH</span><h3>Tambah aktiviti dan tarikh penting</h3><div className="admin-content-form"><label>Nama aktiviti<input value={eventDraft.title} onChange={e=>setEventDraft({...eventDraft,title:e.target.value})}/></label><div className="admin-editor-grid"><label>Tarikh mula<input type="date" value={eventDraft.eventDate} onChange={e=>setEventDraft({...eventDraft,eventDate:e.target.value})}/></label><label>Tarikh akhir<input type="date" value={eventDraft.endDate} onChange={e=>setEventDraft({...eventDraft,endDate:e.target.value})}/></label><label>Kategori<select value={eventDraft.category} onChange={e=>setEventDraft({...eventDraft,category:e.target.value})}><option>Sekolah</option><option>Akademik</option><option>HEM</option><option>Kokurikulum</option><option>Cuti</option></select></label></div><label>Catatan<textarea rows={4} value={eventDraft.details} onChange={e=>setEventDraft({...eventDraft,details:e.target.value})}/></label><button className="admin-save" onClick={()=>void saveEvent()}>Simpan dalam takwim</button></div><div className="admin-manage-list">{events.map(item=><article key={item.id}><div><small>{item.category} · {new Date(item.eventDate).toLocaleDateString("ms-MY")}{item.endDate!==item.eventDate?` – ${new Date(item.endDate).toLocaleDateString("ms-MY")}`:""}</small><strong>{item.title}</strong><p>{item.details}</p></div><button onClick={()=>void deleteContent("event",item.id)}>Padam</button></article>)}{!events.length&&<p>Belum ada aktiviti dalam takwim.</p>}</div></section>}
    {tab==="modules"&&<section className="admin-section"><span className="modal-overline">KAWALAN MODUL</span><h3>Buka atau tutup modul sementara</h3><p>Gunakan ketika penyelenggaraan. Data modul tidak dipadam.</p><div className="admin-module-list">{moduleNames.map(([key,label])=><button key={key} disabled={me.role!=="super_admin"} onClick={()=>setSettings({...settings,[key]:settings[key]==="disabled"?"enabled":"disabled"})}><span><strong>{label}</strong><small>{settings[key]==="disabled"?"Pengguna tidak boleh membuka modul":"Modul tersedia kepada pengguna"}</small></span><i className={settings[key]==="disabled"?"off":""}></i></button>)}</div>{me.role==="super_admin"&&<button className="admin-save" onClick={()=>void saveModuleSettings()}>Simpan status modul</button>}</section>}
    {tab==="export"&&<section className="admin-section admin-export"><span className="modal-overline">EKSPORT & SANDARAN</span><h3>Muat turun data portal</h3><p>Ambil salinan fail dan rekod penting sebelum penyelenggaraan, pertukaran hosting atau audit sekolah.</p><div className="admin-export-grid"><article><strong>Semua PDF & dokumen</strong><span>OPR, laporan guru bertugas dan Arkib Kejayaan daripada Google Drive.</span><button onClick={()=>void exportAllReports()} disabled={!!exporting}>{exporting==="reports"?"Menyediakan ZIP…":"Muat turun semua laporan"}</button></article><article><strong>E-Keberadaan & Relief</strong><span>Senarai guru dan rekod ketidakhadiran dalam fail JSON.</span><button onClick={()=>void exportJson("ekeberadaan")} disabled={!!exporting}>{exporting==="ekeberadaan"?"Menyediakan…":"Muat turun data"}</button></article><article><strong>E-Tempahan</strong><span>Semua tempahan bagi tahun semasa dalam satu fail JSON.</span><button onClick={()=>void exportJson("etempahan")} disabled={!!exporting}>{exporting==="etempahan"?"Menyediakan…":"Muat turun data"}</button></article><article><strong>E-Kunjung</strong><span>Laporan PDF pelawat lengkap dengan butiran serta waktu masuk dan keluar.</span><label className="admin-export-date">Tarikh<input type="date" value={visitorExportDate} onChange={e=>setVisitorExportDate(e.target.value)}/></label><button onClick={()=>void exportVisitorPdf()} disabled={!!exporting}>{exporting==="ekunjung"?"Menjana PDF…":"Muat turun PDF pelawat"}</button></article></div><small className="admin-export-note">Eksport hanya tersedia selepas log masuk pentadbir dan tidak mengubah data asal.</small></section>}
    {tab==="trash"&&<section className="admin-section"><span className="modal-overline">TONG SAMPAH</span><h3>Pengguna yang dipadam</h3><div className="admin-user-list">{trash.map(user=><article key={user.id}><div className="admin-avatar">{user.name.slice(0,2)}</div><div><strong>{user.name}</strong><small>{user.email}</small></div><button className="admin-restore" onClick={()=>void restore(user)}>Pulihkan</button></article>)}{!trash.length&&<p>Tiada pengguna dalam tong sampah.</p>}</div></section>}
    {tab==="logs"&&<section className="admin-section"><span className="modal-overline">LOG AKTIVITI</span><h3>Jejak perubahan pentadbir</h3><div className="admin-log-list">{logs.map(log=><article key={log.id}><span>✓</span><div><strong>{actionLabel(log.action)}</strong><small>{log.actorEmail} → {log.targetEmail||"Portal"}</small></div><time>{new Date(log.createdAt).toLocaleString("ms-MY")}</time></article>)}</div></section>}
    {editing&&<div className="admin-editor-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setEditing(null)}><section className="admin-editor"><button className="folder-float-close" onClick={()=>setEditing(null)}>×</button><span className="modal-overline">{editing.id?"UBAH PENGGUNA":"PENGGUNA BAHARU"}</span><h3>Maklumat akses portal</h3><label>Nama penuh<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>E-mel DELIMa<input type="email" value={editing.email} onChange={e=>setEditing({...editing,email:e.target.value})}/></label><label>Jawatan<input value={editing.position} onChange={e=>setEditing({...editing,position:e.target.value})}/></label><div className="admin-editor-grid"><label>Gred SSPA<select value={editing.grade} onChange={e=>setEditing({...editing,grade:e.target.value})}><option value="">Belum ditetapkan</option>{["DG5","DG6","DG7","DG8","DG9","DG10","DG12","DG13","DG14"].map(g=><option key={g}>{g}</option>)}</select></label><label>Peranan<select value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value})}><option value="teacher">Pengguna</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label></div><div className="admin-editor-grid"><label>Status<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})}><option value="active">Aktif</option><option value="inactive">Tidak aktif</option></select></label><label className="admin-check"><input type="checkbox" checked={editing.showDirectory!==false} onChange={e=>setEditing({...editing,showDirectory:e.target.checked})}/><span>Papar dalam Senarai Guru</span></label></div><label className="admin-check admin-org-check"><input type="checkbox" checked={!!editing.showOrgChart} onChange={e=>{const enabled=e.target.checked,title=editing.orgPosition||editing.position;setEditing({...editing,showOrgChart:enabled,orgPosition:title,orgOrder:enabled&&(!Number.isFinite(editing.orgOrder)||editing.orgOrder===999)?orgChartDefaultOrder(title):editing.orgOrder})}}/><span>Papar sebagai pentadbir dalam Carta Organisasi</span></label>{editing.showOrgChart&&<div className="admin-org-config"><label>Jawatan pada carta<select value={editing.orgPosition||editing.position} onChange={e=>setEditing({...editing,orgPosition:e.target.value,orgOrder:orgChartDefaultOrder(e.target.value)})}>{orgChartPositions.map(position=><option key={position}>{position}</option>)}</select></label><label>Kedudukan dalam aras<select value={orgPrevious?.id||""} onChange={e=>placeAfter(e.target.value)}><option value="">Paling awal dalam aras ini</option>{orgPeers.map(user=><option key={user.id} value={user.id}>Selepas {user.name} — {user.orgPosition||user.position}</option>)}</select></label><div className="admin-org-order-preview"><span>Selepas</span><strong>{orgPrevious?.name||"Permulaan aras"}</strong><i>→</i><span>Sebelum</span><strong>{orgNext?.name||"Akhir aras"}</strong></div></div>}{editing.id&&editing.showOrgChart&&<label className="admin-announcement-upload">Gambar untuk Carta Organisasi<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAdminPhoto(e.target.files?.[0]||null)}/><span>{adminPhoto?adminPhoto.name:"Pilih gambar pentadbir"}</span><small>JPG, PNG atau WebP · maksimum 1.5 MB · dipaparkan secara awam</small></label>}<button className="admin-save" onClick={()=>void save()}>Simpan perubahan</button></section></div>}
  </div>;
}

const bookingRooms = ["Pusat Sumber Sekolah", "Pusat Akses", "Bilik Gerakan", "Bilik KKQ", "Bilik Media", "Makmal Sibaweh", "Makmal Komputer 1", "Makmal Komputer 2", "Dewan Al Farabi", "Surau As-Syafie", "Bilik Seni"];
const roomIcon = (room: string) => {
  const Icon = room === "Bilik KKQ" ? BookOpenText : room === "Makmal Sibaweh" ? Presentation : room.includes("Komputer") || room === "Pusat Akses" ? Monitor : room.includes("Dewan") ? Landmark : room.includes("Surau") ? MoonStar : room.includes("Sumber") ? BookOpen : room.includes("Seni") ? Palette : room.includes("Media") ? Video : BriefcaseBusiness;
  return <Icon aria-hidden="true" />;
};
type Booking = { id: string; room: string; applicantName: string; purpose: string; startDate: string; startTime: string; endDate: string; endTime: string; participants: number; status: string; canDelete?: boolean };
const formatBookingDateRange = (startDate: string, endDate: string) => {
  const format = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("ms-MY", { day: "numeric", month: "long" });
  const year = new Date(`${endDate}T12:00:00`).getFullYear();
  if (startDate === endDate) return `${format(startDate)} ${year}`;
  return `${format(startDate)}–${format(endDate)} ${year}`;
};
const formatBookingTime = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return `${String(hours % 12 || 12).padStart(2, "0")}.${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

function BookingCentre({ notify, close, user, initialTab="dashboard" }: { notify: (message: string) => void; close: () => void; user:PortalIdentity|null; initialTab?:"dashboard"|"form" }) {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
  const [tab, setTab] = useState<"dashboard" | "list" | "form">(initialTab);
  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listBookings, setListBookings] = useState<Booking[]>([]);
  const [listFrom, setListFrom] = useState(today);
  const [listTo, setListTo] = useState(nextWeek);
  const [listRoom, setListRoom] = useState("Semua bilik");
  const [printingList, setPrintingList] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string; id?: string; count?: number } | null>(null);
  const [form, setForm] = useState({ room: "", applicantName: user?.name||"", email: user?.email||"", startDate: today, startTime: "08:00", endDate: today, endTime: "09:00", purpose: "" });
  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const loadBookings = async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const response = await fetch(`/api/etempahan?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const data = await response.json() as { bookings?: Booking[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Status bilik tidak dapat dibaca");
      setBookings(data.bookings || []); setError("");
    } catch (reason) { if (!silent) setError(reason instanceof Error ? reason.message : "Status bilik tidak dapat dibaca"); }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => {
    void loadBookings();
    const timer = window.setInterval(() => void loadBookings(true), 15000);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void loadBookings(true); };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [date]);
  const loadBookingList = async () => {
    setListLoading(true); setListError("");
    try {
      const response = await fetch(`/api/etempahan?from=${encodeURIComponent(listFrom)}&to=${encodeURIComponent(listTo)}`, { cache: "no-store" });
      const data = await response.json() as { bookings?: Booking[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Senarai tempahan tidak dapat dibaca");
      setListBookings(data.bookings || []);
    } catch (reason) { setListError(reason instanceof Error ? reason.message : "Senarai tempahan tidak dapat dibaca"); }
    finally { setListLoading(false); }
  };
  const roomBookings = (room: string) => bookings.filter((item) => item.room === room && item.status !== "Dibatalkan" && new Date(`${item.endDate}T${item.endTime}`) > new Date());
  const visibleListBookings = listRoom === "Semua bilik" ? listBookings : listBookings.filter((item) => item.room === listRoom);
  const roomState = (room: string) => {
    const active = roomBookings(room);
    if (!active.length) return { label: "Kosong", tone: "available" };
    const now = new Date();
    const inUse = active.some((item) => now >= new Date(`${item.startDate}T${item.startTime}`) && now <= new Date(`${item.endDate}T${item.endTime}`));
    return inUse ? { label: "Sedang digunakan", tone: "inuse" } : { label: "Ditempah", tone: "booked" };
  };
  const nextRoomBooking = (room: string) => [...roomBookings(room)].sort((a, b) => `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`))[0];
  const showRoomPicker = () => { setRoomPickerOpen(true); void loadBookings(true); };
  const beginBooking = (room: string) => {
    setField("room", room);
    setField("startDate", date);
    setField("endDate", date);
    setRoomPickerOpen(false);
    setTab("form");
  };
  const openBookingForm = showRoomPicker;
  const submit = async () => {
    setSaving(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/etempahan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { success?: boolean; id?: string; count?: number; status?: string; emailSent?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Tempahan tidak berjaya");
      const confirmation = data.emailSent === false ? " Tempahan direkodkan tetapi e-mel pengesahan belum dapat dihantar." : " E-mel pengesahan telah dihantar.";
      setResult({ success: true, id: data.id, count: data.count || 1, message: `${(data.count || 1) > 1 ? `${data.count} hari berjaya ditempah.` : "Tempahan berjaya diluluskan."}${confirmation}` });
      notify("Tempahan berjaya diluluskan"); await loadBookings();
    } catch (reason) { const message = reason instanceof Error ? reason.message : "Tempahan tidak berjaya"; setResult({ success: false, message }); }
    finally { setSaving(false); }
  };
  const printBookingList = async () => {
    if (!visibleListBookings.length) return notify("Pilih julat yang mempunyai rekod tempahan dahulu");
    setPrintingList(true);
    try {
      const jsPDF = await loadJsPdf();
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      const width = pdf.internal.pageSize.getWidth();
      const heading = "SENARAI PENGGUNAAN BILIK";
      pdf.setFillColor(211, 239, 245); pdf.rect(0, 0, width, 30, "F");
      pdf.setTextColor(18, 57, 77); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text(heading, 14, 14);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(`SMK Agama Pahang · ${listFrom} hingga ${listTo} · ${listRoom}`, 14, 22);
      const columns = [14, 41, 88, 119, 161, 232];
      const labels = ["Tarikh", "Bilik", "Masa", "Pemohon", "Tujuan", "Status"];
      let y = 39;
      const tableHead = () => { pdf.setFillColor(22, 63, 82); pdf.rect(11, y - 6, width - 22, 8, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); labels.forEach((label, index) => pdf.text(label, columns[index], y - 1)); y += 7; };
      tableHead();
      visibleListBookings.forEach((item) => {
        const values = [new Date(`${item.startDate}T12:00:00`).toLocaleDateString("ms-MY"), item.room, `${item.startTime}–${item.endTime}`, item.applicantName, item.purpose, item.status];
        const lines = values.map((value, index) => pdf.splitTextToSize(value, [24, 43, 28, 38, 65, 38][index]));
        const height = Math.max(7, ...lines.map((line) => line.length * 4.1)) + 3;
        if (y + height > 194) { pdf.addPage(); y = 20; tableHead(); }
        pdf.setDrawColor(197, 215, 220); pdf.rect(11, y - 5, width - 22, height);
        pdf.setTextColor(25, 52, 64); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
        lines.forEach((line, index) => pdf.text(line, columns[index], y)); y += height;
      });
      pdf.setFontSize(7); pdf.setTextColor(80, 105, 116); pdf.text(`Dijana melalui Portal Rasmi SMK Agama Pahang · ${new Date().toLocaleString("ms-MY")}`, 14, 202);
      pdf.save(`Senarai-Penggunaan-Bilik-${listFrom}-hingga-${listTo}.pdf`);
      notify("PDF senarai penggunaan telah dimuat turun");
    } catch { notify("PDF senarai penggunaan tidak dapat dijana sekarang"); }
    finally { setPrintingList(false); }
  };
  const deleteBooking = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/etempahan", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id, startDate: deleteTarget.startDate }) });
      const data = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Tempahan tidak dapat dipadam");
      setDeleteTarget(null);
      setListBookings((current) => current.filter((item) => item.id !== deleteTarget.id));
      setBookings((current) => current.filter((item) => item.id !== deleteTarget.id));
      notify("Tempahan berjaya dipadam");
    } catch (reason) { notify(reason instanceof Error ? reason.message : "Tempahan tidak dapat dipadam"); }
    finally { setDeleting(false); }
  };
  if (result) return <div className="booking-centre"><span className="modal-overline">E-TEMPAHAN SMKAP</span><div className={`booking-result ${result.success ? "success" : "failed"}`}><span>{result.success ? "✓" : "!"}</span><h2>{result.success ? "TEMPAHAN BERJAYA" : "TEMPAHAN TIDAK BERJAYA"}</h2><p>{result.message}</p>{result.id && <small>Nombor rujukan: {result.id}{result.count && result.count > 1 ? ` · ${result.count} rekod` : ""}</small>}<div><button onClick={() => { setResult(null); setTab("list"); void loadBookingList(); }}>Lihat senarai tempahan</button><button className="booking-primary" onClick={() => { setResult(null); setTab("form"); }}>Buat tempahan lain</button></div></div></div>;
  return <div className="booking-centre">
    <div className="booking-head"><div><span className="modal-overline">E-TEMPAHAN SMKAP</span><h2 id="folder-title">Tempahan bilik sekolah</h2><p>Semak kekosongan dan buat tempahan dalam beberapa langkah sahaja.</p></div><button onClick={close}>Kembali ke Guru & Staf</button></div>
    <div className="booking-tabs booking-tabs-three"><button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>Status bilik</button><button className={tab === "list" ? "active" : ""} onClick={() => { setTab("list"); void loadBookingList(); }}>Senarai tempahan</button><button className={tab === "form" ? "active" : ""} onClick={openBookingForm}>Buat tempahan</button></div>
    {tab === "dashboard" ? <>
      <div className="booking-filter"><label>Semak tarikh<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><div><span><i className="available"></i>Kosong</span><span><i className="booked"></i>Ditempah</span><span><i className="inuse"></i>Sedang digunakan</span></div></div>
      {loading ? <div className="booking-loading"><i className="button-spinner"></i> Membaca status bilik...</div> : error ? <p className="visitor-error">{error}</p> : <div className="room-grid">{bookingRooms.map((room) => { const state = roomState(room); const slots = roomBookings(room); return <article key={room} className={state.tone}><header><span>{roomIcon(room)}</span><div><h3>{room}</h3><b>{state.label}</b></div></header>{slots.length ? <div className="room-slots">{slots.slice(0,3).map((item) => <p key={item.id}><strong>{item.startTime}–{item.endTime}</strong><span>{item.applicantName} · {item.purpose}</span></p>)}</div> : <p className="room-free">Tiada tempahan pada tarikh ini.</p>}<button onClick={() => beginBooking(room)}>{state.tone === "available" ? "Tempah bilik ini" : "Lihat slot lain"} →</button></article>; })}</div>}
    </> : tab === "list" ? <>
      <div className="booking-list-filter"><label>Dari<input type="date" value={listFrom} onChange={(event) => setListFrom(event.target.value)} /></label><label>Hingga<input type="date" min={listFrom} value={listTo} onChange={(event) => setListTo(event.target.value)} /></label><label>Bilik<select value={listRoom} onChange={(event) => setListRoom(event.target.value)}><option>Semua bilik</option>{bookingRooms.map((room) => <option key={room}>{room}</option>)}</select></label><button onClick={() => void loadBookingList()} disabled={listLoading}>{listLoading ? "Membaca..." : "Paparkan"}</button><button className="booking-print" onClick={() => void printBookingList()} disabled={printingList || listLoading || !visibleListBookings.length}>{printingList ? "Menjana PDF..." : "Muat turun PDF"}</button></div>
      {listLoading ? <div className="booking-loading"><i className="button-spinner"></i> Membaca senarai tempahan...</div> : listError ? <p className="visitor-error">{listError}</p> : !visibleListBookings.length ? <div className="booking-empty"><strong>Tiada tempahan</strong><span>Tiada rekod dalam julat dan bilik yang dipilih.</span></div> : <div className="booking-list">{visibleListBookings.map((item) => <article key={`${item.id}-${item.startDate}`}><div className="booking-list-date" aria-hidden="true">{roomIcon(item.room)}</div><div className="booking-list-details"><h3>{item.room}</h3><strong className="booking-list-range">{formatBookingDateRange(item.startDate, item.endDate)}</strong><p>{formatBookingTime(item.startTime)}–{formatBookingTime(item.endTime)}</p><span>{item.applicantName}</span><small>{item.purpose}</small></div><div className="booking-list-actions"><b>{item.status}</b>{item.canDelete && <button type="button" onClick={() => setDeleteTarget(item)}>Padam tempahan</button>}</div></article>)}</div>}
    </> : <form className="booking-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className="booking-note"><span>✓</span><div><strong>Lulus secara automatik jika slot kosong</strong><small>Sistem menyemak pertindihan sebelum menyimpan dan menghantar e-mel keputusan.</small></div></div>
      <div className="booking-form-grid"><label>Bilik yang ingin ditempah *<select value={form.room} onChange={(event) => setField("room", event.target.value)} required><option value="">Pilih bilik</option>{bookingRooms.map((room) => <option key={room}>{room}</option>)}</select></label><label>Tujuan penggunaan *<select value={form.purpose} onChange={(event) => setField("purpose", event.target.value)} required><option value="">Pilih tujuan</option><option>PdPC</option><option>Mesyuarat</option><option>Taklimat</option><option>Perjumpaan</option><option>Latihan SPTS</option><option>Program Sekolah</option><option>Lain-lain</option></select></label></div>
      <div className="booking-form-grid"><label>Nama pemohon *<input value={form.applicantName} onChange={(event) => setField("applicantName", event.target.value)} onBlur={() => setField("applicantName", tidyTitleCase(form.applicantName))} placeholder="Akan diisi automatik selepas log masuk Google" required /></label><label>E-mel pengesahan *<input type="email" value={form.email} onChange={(event) => setField("email", event.target.value.trim())} placeholder="nama@moe-dl.edu.my" required /></label></div>
      <div className="booking-repeat-note"><strong>Tempahan sehari atau beberapa hari</strong><span>Bilik akan diblok secara berterusan daripada waktu mula pada hari pertama hingga waktu tamat pada hari terakhir.</span></div>
      <div className="booking-form-grid four"><label>Tarikh mula<input type="date" value={form.startDate} min={today} onChange={(event) => { setField("startDate", event.target.value); if (form.endDate < event.target.value) setField("endDate", event.target.value); }} required /></label><label>Waktu mula<input type="time" value={form.startTime} onChange={(event) => setField("startTime", event.target.value)} required /></label><label>Tarikh akhir<input type="date" value={form.endDate} min={form.startDate} onChange={(event) => setField("endDate", event.target.value)} required /></label><label>Waktu akhir<input type="time" value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} required /></label></div>
      {error && <p className="visitor-error">{error}</p>}{saving && <div className="visitor-saving-state"><i></i><div><strong>Sedang menyemak kekosongan...</strong><small>Jangan tutup halaman ini.</small></div></div>}
      <p className="visitor-disclaimer"><span>ⓘ</span> Nama boleh diubah jika tempahan dibuat bagi pihak orang lain. Akaun dan e-mel sebenar akan disimpan untuk tujuan rekod apabila log masuk Google diaktifkan.</p>
      <div className="visitor-actions"><button type="button" onClick={() => setTab("dashboard")}>Semak status bilik</button><button className="visitor-primary" disabled={saving}>{saving ? <><i className="button-spinner"></i> Menyemak...</> : "Sahkan tempahan →"}</button></div>
    </form>}
    {typeof document !== "undefined" && createPortal(<>
      <nav className="booking-floating-nav" aria-label="Menu e-Tempahan">
        <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}><CalendarRange aria-hidden="true"/><span>Status</span></button>
        <button className={tab === "form" || roomPickerOpen ? "active add" : "add"} onClick={showRoomPicker}><CalendarPlus aria-hidden="true"/><span>Tempah</span></button>
        <button className={tab === "list" ? "active" : ""} onClick={() => { setTab("list"); void loadBookingList(); }}><ClipboardList aria-hidden="true"/><span>Senarai</span></button>
      </nav>
      {roomPickerOpen && <div className="booking-room-picker" role="dialog" aria-modal="true" aria-labelledby="room-picker-title" onMouseDown={(event) => event.target === event.currentTarget && setRoomPickerOpen(false)}>
        <section>
          <i className="booking-picker-handle" aria-hidden="true" />
          <header>
            <span className="booking-picker-title-icon"><Building2 aria-hidden="true" /></span>
            <div><h3 id="room-picker-title">Pilih bilik untuk ditempah</h3><p>Status dan waktu dikemas kini secara automatik.</p></div>
            <button type="button" aria-label="Tutup pilihan bilik" onClick={() => setRoomPickerOpen(false)}><X aria-hidden="true"/></button>
          </header>
          <div className="booking-picker-grid">
            {bookingRooms.map((room) => { const state = roomState(room); const slot = nextRoomBooking(room); return <button type="button" className={state.tone} key={room} onClick={() => beginBooking(room)}><span>{roomIcon(room)}</span><div><strong>{room}</strong><small><i />{state.label}</small>{slot && <em>{formatBookingDateRange(slot.startDate, slot.endDate)} · {formatBookingTime(slot.startTime)}–{formatBookingTime(slot.endTime)}</em>}</div><ChevronRight aria-hidden="true"/></button>; })}
          </div>
        </section>
      </div>}
    </>, document.body)}
    {deleteTarget && <div className="achievement-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-booking-title" onMouseDown={(event) => event.target === event.currentTarget && !deleting && setDeleteTarget(null)}><section><span className="modal-overline">PENGESAHAN PADAM</span><h3 id="delete-booking-title">Padam tempahan ini?</h3><p><strong>{deleteTarget.room}</strong><br />{formatBookingDateRange(deleteTarget.startDate, deleteTarget.endDate)}<br />{formatBookingTime(deleteTarget.startTime)}–{formatBookingTime(deleteTarget.endTime)} · {deleteTarget.applicantName}</p><small>Tempahan yang dipadam tidak boleh dipulihkan.</small><div><button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>Batal</button><button type="button" className="danger" disabled={deleting} onClick={() => void deleteBooking()}>{deleting ? "Sedang memadam…" : "Ya, padam tempahan"}</button></div></section></div>}
  </div>;
}

type VisitorAdminRecord={id:string;date:string;timeIn:string;timeOut:string;name:string;phone:string;vehicleNo:string;organisation:string;purpose:string;staff:string;meetingPlace:string;notes:string;status:string};
function VisitorForm({ notify, close }: { notify: (message: string) => void; close: () => void }) {
  const now = new Date();
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [review, setReview] = useState(false);
  const [visitMode, setVisitMode] = useState<"in" | "out">("in");
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [checkoutTime, setCheckoutTime] = useState(now.toTimeString().slice(0, 5));
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [activeRecords, setActiveRecords] = useState<Array<{ id: string; date: string; timeIn: string; name: string; vehicleNo: string }>>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedRecord, setSavedRecord] = useState<{ id: string; status: string } | null>(null);
  const [form, setForm] = useState({
    date: now.toISOString().slice(0, 10), timeIn: now.toTimeString().slice(0, 5), timeOut: "", visitorName: "",
    phone: "", vehicleNo: "", organisation: "", purpose: "", staff: "", meetingPlace: "", notes: "",
  });
  const setVisitorField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const tidyVisitorField = (field: keyof typeof form) => setForm((current) => ({ ...current, [field]: tidyTitleCase(current[field]) }));
  const complete = Boolean(form.date && form.timeIn && form.visitorName && form.phone && form.purpose && form.staff && photoFile);
  useEffect(() => {
    if (checkoutDone) return;
    setLoadingActive(true); setSaveError("");
    void fetch("/api/ekunjung", { cache: "no-store" }).then(async (response) => {
      const result = await response.json() as { records?: typeof activeRecords; error?: string };
      if (!response.ok) throw new Error(result.error || "Senarai pelawat tidak tersedia");
      setActiveRecords(result.records||[]);
    }).catch((error) => setSaveError(error instanceof Error ? error.message : "Senarai pelawat tidak tersedia")).finally(() => setLoadingActive(false));
  }, [visitMode, checkoutDone]);
  const photoPayload = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
    if (!blob) throw new Error("Gambar tidak dapat diproses");
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca")); reader.readAsDataURL(blob); });
    return { mimeType: "image/jpeg", base64: dataUrl.split(",")[1] || "" };
  };
  const saveVisit = async () => {
    if (!photoFile) return;
    setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/ekunjung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form, photo: await photoPayload(photoFile) }) });
      const result = await response.json() as { id?: string; status?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "Rekod tidak dapat disimpan");
      setSavedRecord({ id: result.id, status: result.status || "DALAM KAWASAN" }); notify("Daftar masuk berjaya disimpan");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Rekod tidak dapat disimpan"); }
    finally { setSaving(false); }
  };
  const checkoutVisit = async () => {
    setSaving(true); setSaveError("");
    try {
      const response = await fetch("/api/ekunjung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkout", id: checkoutId, timeOut: checkoutTime }) });
      const result = await response.json() as { name?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Masa keluar tidak dapat disimpan");
      if (result.name) setCheckoutName(result.name); setCheckoutDone(true); notify("Masa keluar telah disahkan");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Masa keluar tidak dapat disimpan"); }
    finally { setSaving(false); }
  };
  if (visitMode === "out") return <div className="visitor-form-shell">
    <span className="modal-overline">E-KUNJUNG SMKAP</span><h2 id="folder-title">Daftar keluar pelawat</h2><p>Pelawat atau pengawal boleh melengkapkan daftar keluar dengan dua langkah sahaja.</p>
    <div className="visitor-mode-tabs"><button onClick={() => setVisitMode("in")}>Daftar masuk</button><button className="active">Daftar keluar</button></div>
    <div className="visitor-active-summary"><strong>{activeRecords.length}</strong><span>pelawat masih belum daftar keluar</span></div>
    <div className="visitor-checkout-card"><span>↗</span><div><strong>Daftar keluar pelawat</strong><small>Cari nama seperti dalam rekod daftar masuk</small></div></div>
    {checkoutDone ? <div className="visitor-complete"><span>✓</span><strong>SELESAI</strong><p>{checkoutName} telah didaftarkan keluar pada {checkoutTime}.</p><button onClick={() => { setCheckoutDone(false); setCheckoutName(""); setCheckoutId(""); setCheckoutTime(new Date().toTimeString().slice(0, 5)); }}>Daftar keluar pelawat lain</button></div> : <form className="visitor-form" onSubmit={(event) => { event.preventDefault(); void checkoutVisit(); }}>
      <label>Pilih pelawat *<select autoFocus value={checkoutId} onChange={(event) => { const id = event.target.value; setCheckoutId(id); setCheckoutName(activeRecords.find((record) => record.id === id)?.name || ""); }} required disabled={loadingActive}><option value="">{loadingActive ? "Membaca rekod..." : activeRecords.length ? "Pilih nama pelawat" : "Tiada pelawat aktif"}</option>{activeRecords.map((record) => <option key={record.id} value={record.id}>{record.name}{record.vehicleNo ? ` · ${record.vehicleNo}` : ""} · masuk {record.timeIn}</option>)}</select></label>
      <label>Masa keluar *<input type="time" value={checkoutTime} onChange={(event) => setCheckoutTime(event.target.value)} required /></label>
      {saving && <div className="visitor-saving-state"><i></i><div><strong>Sedang mendaftar keluar...</strong><small>Jangan tutup halaman ini.</small></div></div>}
      {saveError && <p className="visitor-error">{saveError}</p>}
      <div className="visitor-actions"><button type="button" onClick={close}>Kembali</button><button className="visitor-primary" disabled={!checkoutId || !checkoutTime || saving}>{saving ? <><i className="button-spinner"></i> Menyimpan...</> : <>Sahkan daftar keluar <span>→</span></>}</button></div>
    </form>}
    <p className="visitor-disclaimer"><span>ⓘ</span> Daftar keluar mesti disahkan oleh pelawat atau pengawal. Masa boleh dilaras jika pendaftaran dibuat lewat.</p>
  </div>;
  if (savedRecord) return <div className="visitor-form-shell"><span className="modal-overline">E-KUNJUNG SMKAP</span><div className="visitor-complete visitor-checkin-complete"><span>✓</span><strong>DAFTAR MASUK BERJAYA</strong><p>Rekod {form.visitorName} telah disimpan dalam Google Sheet sekolah.</p><small>{savedRecord.id} · {savedRecord.status}</small><button onClick={close}>Selesai</button></div><p className="visitor-disclaimer"><span>ⓘ</span> Sila patuhi arahan pengawal dan rekodkan masa keluar sebelum meninggalkan kawasan sekolah.</p></div>;
  if (review) return <article className="visitor-review">
    <span className="modal-overline">SEMAKAN E-KUNJUNG</span><h2 id="folder-title">Semak maklumat pelawat</h2><p>Pastikan semua maklumat betul sebelum rekod dihantar.</p>
    <div className="visitor-review-layout"><img src={photo} alt="Gambar pelawat" /><div>{[["Nama pelawat",form.visitorName],["Nombor telefon",form.phone],["Tujuan lawatan",form.purpose],["Staf ditemui",form.staff],["Tarikh & masa",`${form.date} · ${form.timeIn}`],...(form.vehicleNo ? [["Nombor kenderaan",form.vehicleNo.toUpperCase()]] : []),...(form.organisation ? [["Organisasi",form.organisation]] : []),...(form.meetingPlace ? [["Tempat perjumpaan",form.meetingPlace]] : []),...(form.notes ? [["Catatan",form.notes]] : [])].map(([label,value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></div>
    {saving && <div className="visitor-saving-state"><i></i><div><strong>Sedang menyimpan rekod...</strong><small>Gambar sedang dihantar ke Google Drive. Jangan tutup halaman ini.</small></div></div>}
    {saveError && <p className="visitor-error">{saveError}</p>}
    <div className="visitor-actions"><button onClick={() => setReview(false)} disabled={saving}>Kembali ubah maklumat</button><button className="visitor-primary" onClick={() => void saveVisit()} disabled={saving}>{saving ? <><i className="button-spinner"></i> Menyimpan...</> : "Sahkan & daftar masuk"}</button></div>
  </article>;
  return <div className="visitor-form-shell">
    <span className="modal-overline">DAFTAR PELAWAT</span><h2 id="folder-title">E-Kunjung SMKAP</h2><p>Daftar masuk ke SMKAP dengan pantas.</p>
    <div className="visitor-mode-tabs"><button className="active">Daftar masuk</button><button onClick={() => setVisitMode("out")}>Daftar keluar</button></div>
    <div className="visitor-active-summary"><strong>{activeRecords.length}</strong><span>pelawat masih belum daftar keluar</span></div>
    <div className="visitor-time-strip"><span>◷</span><div><small>Tarikh masuk</small><strong>{new Intl.DateTimeFormat("ms-MY", { dateStyle: "long" }).format(new Date(`${form.date}T12:00:00`))}</strong></div><label><small>Masa masuk — boleh dilaras</small><input type="time" value={form.timeIn} onChange={(event) => setVisitorField("timeIn",event.target.value)} required /></label></div>
    <form className="visitor-form" onSubmit={(event) => { event.preventDefault(); if (complete) setReview(true); }}>
      <label>Nama pelawat *<input autoFocus value={form.visitorName} onChange={(event) => setVisitorField("visitorName",event.target.value)} onBlur={() => tidyVisitorField("visitorName")} placeholder="Masukkan nama penuh" required /></label>
      <div className="visitor-row"><label>Nombor telefon *<input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setVisitorField("phone",event.target.value.replace(/[^0-9+ -]/g, ""))} placeholder="Contoh: 012-345 6789" required /></label><label>Nombor kenderaan<input value={form.vehicleNo} onChange={(event) => setVisitorField("vehicleNo",event.target.value.toUpperCase())} placeholder="Contoh: CAA 1234" /></label></div>
      <label>Tujuan lawatan *<select value={form.purpose} onChange={(event) => setVisitorField("purpose",event.target.value)} required><option value="">Pilih tujuan</option><option>Urusan Rasmi</option><option>Berjumpa Guru / Staf</option><option>Penghantaran Barang</option><option>Mesyuarat / Program</option><option>Urusan Murid</option><option>Lain-lain</option></select></label>
      <label>Staf yang ingin ditemui *<input value={form.staff} onChange={(event) => setVisitorField("staff",event.target.value)} onBlur={() => tidyVisitorField("staff")} placeholder="Nama guru atau staf" required /></label>
      <label className="visitor-photo">Gambar pelawat *<input type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) { if (photo) URL.revokeObjectURL(photo); setPhotoFile(file); setPhoto(URL.createObjectURL(file)); } }} />{photo ? <div><img src={photo} alt="Pratonton gambar pelawat" /><span>Tekan untuk tukar gambar</span></div> : <div><b>⌁</b><strong>Ambil atau pilih satu gambar</strong><span>JPG atau PNG</span></div>}</label>
      <details className="visitor-optional"><summary><span>＋</span> Maklumat tambahan <small>Jika perlu sahaja</small></summary><div><div className="visitor-row"><label>Organisasi<input value={form.organisation} onChange={(event) => setVisitorField("organisation",event.target.value)} onBlur={() => tidyVisitorField("organisation")} placeholder="Syarikat / jabatan" /></label><label>Tempat perjumpaan<input value={form.meetingPlace} onChange={(event) => setVisitorField("meetingPlace",event.target.value)} onBlur={() => tidyVisitorField("meetingPlace")} placeholder="Pejabat / bilik" /></label></div><label>Catatan<input value={form.notes} onChange={(event) => setVisitorField("notes",event.target.value)} placeholder="Jika ada" /></label></div></details>
      <p className="visitor-disclaimer"><span>ⓘ</span> Dengan meneruskan, pelawat bersetuju maklumat dan gambar digunakan oleh pihak sekolah bagi rekod lawatan, keselamatan dan kecemasan sahaja. Pendaftaran ini bukan kebenaran automatik untuk memasuki kawasan larangan; pelawat hendaklah mematuhi arahan pengawal dan pihak sekolah.</p>
      <div className="visitor-actions"><button type="button" onClick={close}>Kembali</button><button className="visitor-primary" disabled={!complete}>Semak maklumat <span>→</span></button></div>
    </form>
  </div>;
}

const tidyAcronyms = new Set(["AI", "HEM", "ICT", "KPM", "OPR", "PAJSK", "PBD", "PIBG", "SMKAP", "SPM", "STEM", "STPM"]);
const tidyLowerWords = new Set(["bin", "binti", "dan", "dari", "daripada", "di", "ke", "serta", "untuk", "yang"]);
function tidyTitleCase(value: string) {
  const words = value.trim().replace(/\s+/g, " ").toLowerCase().split(" ");
  return words.map((word, index) => word.split(/([-’'])/).map((part) => {
    if (/^[-’']$/.test(part)) return part;
    const upper = part.toUpperCase();
    if (tidyAcronyms.has(upper)) return upper;
    if (index > 0 && tidyLowerWords.has(part)) return part;
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : part;
  }).join("")).join(" ");
}

type DutyReport = { id:string; reportDate:string; weekNumber:number; schoolYear:number; dayName:string; teachers:string; teacherTotal:number; teacherPresent:number; teacherAbsent:number; cleanlinessStatus:string; disciplineStatus:string; safetyStatus:string; healthStatus:string; canteenStatus:string; activityNote:string; generalNote:string; detailsJson:string; preparedBy:string; createdAt?:string; updatedAt?:string };
type DutyDetails = { locationRatings:Record<string,string>; locationNotes:Record<string,string>; disciplineControlled:boolean; disciplineCaseType:string; disciplineStudents:string; disciplineAction:string; hospitalMale:string; hospitalFemale:string; healthRoomMale:string; healthRoomFemale:string; hospitalTeacher:string; hospitalDriver:string; monitoringAgency:string; monitoringDetail:string; currentIssue:string; reviewedBy:string };
const dutyStatuses = ["Baik","Memuaskan","Perlu perhatian","Tiada isu"];
const cleanlinessLocations = ["Kawasan sekolah","Bilik darjah / kelas","Koridor & tangga","Kantin","Tandas guru lelaki","Tandas guru perempuan","Tandas murid lelaki","Tandas murid perempuan","Persekitaran dewan","Blok bangunan sekolah"];
const freshDutyDetails = ():DutyDetails => ({ locationRatings:Object.fromEntries(cleanlinessLocations.map((location)=>[location,"Baik"])),locationNotes:Object.fromEntries(cleanlinessLocations.map((location)=>[location,""])),disciplineControlled:true,disciplineCaseType:"",disciplineStudents:"",disciplineAction:"",hospitalMale:"0",hospitalFemale:"0",healthRoomMale:"0",healthRoomFemale:"0",hospitalTeacher:"",hospitalDriver:"",monitoringAgency:"Tiada",monitoringDetail:"",currentIssue:"",reviewedBy:"Guru Penolong Kanan Pentadbiran" });
function parseDutyDetails(record:DutyReport):Partial<DutyDetails> { try { return JSON.parse(record.detailsJson||"{}"); } catch { return {}; } }
function isoWeek(dateValue:string) { const date=new Date(`${dateValue}T12:00:00`); const target=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())); const day=target.getUTCDay()||7; target.setUTCDate(target.getUTCDate()+4-day); const yearStart=new Date(Date.UTC(target.getUTCFullYear(),0,1)); return { week:Math.ceil((((target.getTime()-yearStart.getTime())/86400000)+1)/7),year:target.getUTCFullYear() }; }
function schoolWeekDates(year:number,week:number) { const jan4=new Date(Date.UTC(year,0,4)); const monday=new Date(jan4); monday.setUTCDate(jan4.getUTCDate()-(jan4.getUTCDay()||7)+1+(week-1)*7); return Array.from({length:5},(_,index)=>{ const date=new Date(monday); date.setUTCDate(monday.getUTCDate()+index); return date.toISOString().slice(0,10); }); }
function dutyWeekDates(year:number,week:number,reports:DutyReport[]) {
  const anchor=reports.map((record)=>record.reportDate).filter(Boolean).sort()[0];
  if(!anchor)return schoolWeekDates(year,week);
  const monday=new Date(`${anchor}T12:00:00`);const day=monday.getDay();monday.setDate(monday.getDate()+(day===0?-6:1-day));
  return Array.from({length:5},(_,index)=>{const date=new Date(monday);date.setDate(monday.getDate()+index);return date.toISOString().slice(0,10);});
}
function latestDutyRecordsByDate(records:DutyReport[]) {
  const latest=new globalThis.Map<string,DutyReport>();
  for(const record of records) {
    const current=latest.get(record.reportDate);
    const timestamp=record.updatedAt||record.createdAt||"";
    const currentTimestamp=current?.updatedAt||current?.createdAt||"";
    if(!current||timestamp>=currentTimestamp) latest.set(record.reportDate,record);
  }
  return [...latest.values()].sort((a,b)=>a.reportDate.localeCompare(b.reportDate));
}

function OprDutyCentreLegacy({ notify }:{ notify:(message:string)=>void }) {
  const today=new Date().toISOString().slice(0,10), initialWeek=isoWeek(today);
  const [tab,setTab]=useState<"daily"|"weekly">("daily"); const [saving,setSaving]=useState(false); const [loading,setLoading]=useState(false); const [reports,setReports]=useState<DutyReport[]>([]); const [week,setWeek]=useState(initialWeek.week); const [year,setYear]=useState(initialWeek.year); const [dayStates,setDayStates]=useState<Record<string,string>>({}); const [summary,setSummary]=useState(""); const [weeklySending,setWeeklySending]=useState(false); const [weeklyUrl,setWeeklyUrl]=useState("");
  const [form,setForm]=useState({ reportDate:today,weekNumber:String(initialWeek.week),schoolYear:String(initialWeek.year),teachers:"",teacherTotal:"",teacherPresent:"",teacherAbsent:"",cleanlinessStatus:"Baik",disciplineStatus:"Tiada isu",safetyStatus:"Tiada isu",healthStatus:"Tiada isu",canteenStatus:"Tiada isu",activityNote:"",generalNote:"",preparedBy:"" });
  const [details,setDetails]=useState<DutyDetails>(freshDutyDetails);
  const dayName=new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${form.reportDate}T12:00:00`));
  const loadWeek=async()=>{ setLoading(true); setSummary(""); setWeeklyUrl(""); try { const response=await fetch(`/api/opr-duty?year=${year}&week=${week}`,{cache:"no-store"}); const data=await response.json() as {records?:DutyReport[];error?:string}; if(!response.ok||!data.records) throw new Error(data.error||"Laporan tidak tersedia"); setReports(data.records); const next:Record<string,string>={}; schoolWeekDates(year,week).forEach((date)=>{ next[date]=data.records!.some((record)=>record.reportDate===date)?"Lengkap":"Belum lengkap"; }); setDayStates(next); } catch(error){ notify(error instanceof Error?error.message:"Laporan tidak dapat dibaca"); } finally { setLoading(false); } };
  useEffect(()=>{ if(tab==="weekly") void loadWeek(); },[tab,week,year]);
  const saveDaily=async(event:React.FormEvent)=>{ event.preventDefault(); if(!form.teachers.trim()||!form.preparedBy.trim()) return notify("Nama guru bertugas dan penyedia diperlukan"); if(Number(form.weekNumber)<1||Number(form.weekNumber)>53) return notify("Masukkan nombor minggu antara 1 hingga 53"); const ratingValues=Object.values(details.locationRatings); const cleanlinessStatus=ratingValues.includes("Lemah")?"Perlu perhatian":ratingValues.includes("Memuaskan")?"Memuaskan":"Baik"; const disciplineStatus=details.disciplineControlled?"Tiada isu":"Perlu perhatian"; const healthCount=[details.hospitalMale,details.hospitalFemale,details.healthRoomMale,details.healthRoomFemale].reduce((sum,value)=>sum+(Number(value)||0),0); setSaving(true); try { const response=await fetch("/api/opr-duty",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,cleanlinessStatus,disciplineStatus,healthStatus:healthCount?"Perlu perhatian":"Tiada isu",details,id:crypto.randomUUID(),weekNumber:Number(form.weekNumber),schoolYear:Number(form.schoolYear),dayName,teacherTotal:Number(form.teacherTotal)||0,teacherPresent:Number(form.teacherPresent)||0,teacherAbsent:Number(form.teacherAbsent)||0})}); const data=await response.json() as {error?:string}; if(!response.ok) throw new Error(data.error||"Laporan tidak dapat disimpan"); notify("Laporan harian lengkap berjaya disimpan"); setForm((current)=>({...current,activityNote:"",generalNote:""})); setDetails(freshDutyDetails()); } catch(error){notify(error instanceof Error?error.message:"Laporan tidak dapat disimpan");} finally{setSaving(false);} };
  const makeSummary=()=>{ const unresolved=Object.values(dayStates).some((status)=>status==="Belum lengkap"); if(unresolved) return notify("Tandakan hari tanpa persekolahan sebagai Cuti / Tiada persekolahan dahulu"); const actual=reports.filter((record)=>dayStates[record.reportDate]==="Lengkap"); if(!actual.length) return notify("Tiada laporan harian untuk dirumuskan"); const issues=(key:keyof DutyReport,label:string)=>{ const selected=actual.filter((record)=>!["Baik","Tiada isu"].includes(String(record[key]))); return selected.length?`${label}: ${selected.map((record)=>`${record.dayName} (${record[key]})`).join(", ")}.`:`${label}: Tiada isu penting dilaporkan.`; }; const holidays=Object.entries(dayStates).filter(([,status])=>status!=="Lengkap").map(([date])=>new Intl.DateTimeFormat("ms-MY",{weekday:"long",day:"numeric",month:"short"}).format(new Date(`${date}T12:00:00`))); const detailRows=actual.map((record)=>({record,details:parseDutyDetails(record)})); const locationIssues=detailRows.flatMap(({record,details})=>Object.entries(details.locationRatings||{}).filter(([,rating])=>rating!=="Baik").map(([location,rating])=>`${record.dayName}: ${location} (${rating})`)); const disciplineCases=detailRows.filter(({details})=>details.disciplineControlled===false).map(({record,details})=>`${record.dayName}: ${details.disciplineCaseType||"Kes disiplin"}${details.disciplineAction?` — tindakan: ${details.disciplineAction}`:""}`); const healthTotals=detailRows.reduce((totals,{details})=>({hospital:totals.hospital+Number(details.hospitalMale||0)+Number(details.hospitalFemale||0),room:totals.room+Number(details.healthRoomMale||0)+Number(details.healthRoomFemale||0)}),{hospital:0,room:0}); const monitoring=detailRows.filter(({details})=>details.monitoringAgency&&details.monitoringAgency!=="Tiada").map(({record,details})=>`${record.dayName}: ${details.monitoringAgency}${details.monitoringDetail?` — ${details.monitoringDetail}`:""}`); const notes=detailRows.flatMap(({record,details})=>[record.activityNote,details.currentIssue,record.generalNote].filter(Boolean).map((note)=>`${record.dayName}: ${note}`)); setSummary([`Laporan Mingguan Minggu ${week} merangkumi ${actual.length} hari persekolahan.`,holidays.length?`Cuti / tiada persekolahan: ${holidays.join(", ")}.`:"",issues("safetyStatus","Keselamatan"),issues("canteenStatus","Kantin"),locationIssues.length?`Kebersihan & keceriaan yang perlu perhatian: ${locationIssues.join("; ")}.`:"Kebersihan & keceriaan: Semua lokasi dilaporkan baik.",disciplineCases.length?`Disiplin: ${disciplineCases.join("; ")}.`:"Disiplin: Terkawal sepanjang minggu.",`Kesihatan: ${healthTotals.hospital} murid dibawa ke hospital; ${healthTotals.room} murid direkodkan di bilik kesihatan.`,monitoring.length?`Pemantauan / pelawat: ${monitoring.join("; ")}.`:"Pemantauan / pelawat: Tiada rekod.",notes.length?`Aktiviti, isu dan catatan: ${notes.join(" ")}`:"Tiada aktiviti, isu atau catatan tambahan."].filter(Boolean).join("\n\n")); };
  const saveWeekly=async()=>{ if(!summary) return notify("Jana dan semak rumusan dahulu"); setWeeklySending(true); try { const jsPDF=await loadJsPdf();const pdf=new jsPDF({unit:"mm",format:"a4",compress:true}); pdf.setFillColor(201,230,247); pdf.rect(0,0,210,38,"F"); pdf.setTextColor(22,54,82); pdf.setFont("helvetica","bold"); pdf.setFontSize(16); pdf.text("SMK AGAMA PAHANG",15,15); pdf.setFontSize(12); pdf.text(`LAPORAN GURU BERTUGAS MINGGU ${week}`,15,28); pdf.setFont("helvetica","normal"); pdf.setFontSize(9); const lines=pdf.splitTextToSize(summary,180); pdf.text(lines,15,52,{lineHeightFactor:1.45}); pdf.setFontSize(8); pdf.text(`Disediakan oleh: ${form.preparedBy||reports[0]?.preparedBy||"Guru Bertugas"}`,15,275); const blob=pdf.output("blob"); const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);}); const name=`${year}-Minggu-${week}-Laporan-Guru-Bertugas-Mingguan__PENYEDIA__${(form.preparedBy||reports[0]?.preparedBy||"Guru Bertugas").replace(/[^A-Za-z0-9 ]/g,"")}.pdf`; const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:"Pengurusan · Laporan Guru Bertugas · Laporan Mingguan",files:[{name,mimeType:"application/pdf",base64}]})}); const data=await response.json() as {error?:string;files?:Array<{url?:string;viewUrl?:string}>}; if(!response.ok||!data.files?.[0]) throw new Error(data.error||"Rumusan tidak dapat dihantar"); setWeeklyUrl(data.files[0].url||data.files[0].viewUrl||""); notify("Laporan mingguan berjaya disimpan ke Google Drive"); } catch(error){notify(error instanceof Error?error.message:"Laporan mingguan tidak dapat disimpan");} finally{setWeeklySending(false);} };
  const statusField=(label:string,key:keyof typeof form)=><label>{label}<select value={form[key]} onChange={(event)=>setForm((current)=>({...current,[key]:event.target.value}))}>{dutyStatuses.map((status)=><option key={status}>{status}</option>)}</select></label>;
  return <div className="duty-centre"><div className="attendance-head"><div><span className="modal-overline">PENGURUSAN · GURU BERTUGAS</span><h2 id="folder-title">Laporan guru bertugas</h2><p>Laporan harian lengkap untuk rekod pentadbiran, kemudian sistem menyediakan rumusan mengikut hari persekolahan sebenar.</p></div></div><div className="duty-tabs"><button className={tab==="daily"?"active":""} onClick={()=>setTab("daily")}>Laporan harian</button><button className={tab==="weekly"?"active":""} onClick={()=>setTab("weekly")}>Rumusan mingguan</button></div>
  {tab==="daily"?<form className="duty-form duty-form-complete" onSubmit={saveDaily}>
    <section className="duty-section duty-section-intro"><div className="duty-section-head"><span>01</span><div><h3>Maklumat laporan</h3><p>Maklumat asas hari bertugas dan kehadiran guru.</p></div></div><div className="duty-grid"><label>Tarikh<input type="date" value={form.reportDate} onChange={(event)=>setForm((current)=>({...current,reportDate:event.target.value}))}/></label><label>Hari<input value={dayName} readOnly/></label><label>Minggu<input type="number" min="1" max="53" value={form.weekNumber} onChange={(event)=>setForm((current)=>({...current,weekNumber:event.target.value}))} required/></label><label>Tahun<input type="number" min="2020" max="2100" value={form.schoolYear} onChange={(event)=>setForm((current)=>({...current,schoolYear:event.target.value}))} required/></label></div><label>Nama guru bertugas<small>Masukkan nama dipisahkan dengan koma.</small><textarea value={form.teachers} onChange={(event)=>setForm((current)=>({...current,teachers:event.target.value}))} required/></label><div className="duty-grid three"><label>Bilangan guru<input type="number" min="0" value={form.teacherTotal} onChange={(event)=>setForm((current)=>({...current,teacherTotal:event.target.value}))}/></label><label>Hadir<input type="number" min="0" value={form.teacherPresent} onChange={(event)=>setForm((current)=>({...current,teacherPresent:event.target.value}))}/></label><label>Tidak hadir<input type="number" min="0" value={form.teacherAbsent} onChange={(event)=>setForm((current)=>({...current,teacherAbsent:event.target.value}))}/></label></div></section>
    <section className="duty-section duty-section-clean"><div className="duty-section-head"><span>02</span><div><h3>Kebersihan & keceriaan</h3><p>Tekan tahap bagi setiap lokasi. Semua ditetapkan “Baik” untuk mempercepatkan semakan.</p></div></div><div className="duty-location-list">{cleanlinessLocations.map((location)=><div className="duty-location-row" key={location}><strong>{location}</strong><div>{["Baik","Memuaskan","Lemah"].map((rating)=><button type="button" key={rating} className={details.locationRatings[location]===rating?"active":""} onClick={()=>setDetails((current)=>({...current,locationRatings:{...current.locationRatings,[location]:rating}}))}>{rating}</button>)}</div></div>)}</div></section>
    <section className="duty-section"><div className="duty-section-head"><span>03</span><div><h3>Disiplin & keselamatan</h3><p>Catatan kes hanya muncul apabila diperlukan.</p></div></div><div className="duty-toggle"><button type="button" className={details.disciplineControlled?"active":""} onClick={()=>setDetails((current)=>({...current,disciplineControlled:true}))}>Disiplin terkawal</button><button type="button" className={!details.disciplineControlled?"alert active":""} onClick={()=>setDetails((current)=>({...current,disciplineControlled:false}))}>Ada kes disiplin</button></div>{!details.disciplineControlled&&<div className="duty-conditional"><label>Jenis / kes<input value={details.disciplineCaseType} onChange={(event)=>setDetails((current)=>({...current,disciplineCaseType:event.target.value}))} placeholder="Contoh: lewat, pergaduhan, salah laku"/></label><label>Murid terlibat<textarea value={details.disciplineStudents} onChange={(event)=>setDetails((current)=>({...current,disciplineStudents:event.target.value}))} placeholder="Nama atau kelas jika berkaitan"/></label><label>Tindakan yang diambil<textarea value={details.disciplineAction} onChange={(event)=>setDetails((current)=>({...current,disciplineAction:event.target.value}))} placeholder="Nyatakan tindakan susulan"/></label></div>}<div className="duty-grid">{statusField("Tahap keselamatan","safetyStatus")}{statusField("Keadaan kantin","canteenStatus")}</div></section>
    <section className="duty-section"><div className="duty-section-head"><span>04</span><div><h3>Kesihatan & urusan hospital</h3><p>Masukkan angka sahaja. Kekalkan 0 jika tiada kes.</p></div></div><div className="duty-number-grid"><label>Ke hospital — Lelaki<input type="number" min="0" value={details.hospitalMale} onChange={(event)=>setDetails((current)=>({...current,hospitalMale:event.target.value}))}/></label><label>Ke hospital — Perempuan<input type="number" min="0" value={details.hospitalFemale} onChange={(event)=>setDetails((current)=>({...current,hospitalFemale:event.target.value}))}/></label><label>Bilik kesihatan — Lelaki<input type="number" min="0" value={details.healthRoomMale} onChange={(event)=>setDetails((current)=>({...current,healthRoomMale:event.target.value}))}/></label><label>Bilik kesihatan — Perempuan<input type="number" min="0" value={details.healthRoomFemale} onChange={(event)=>setDetails((current)=>({...current,healthRoomFemale:event.target.value}))}/></label></div>{Number(details.hospitalMale)+Number(details.hospitalFemale)>0&&<div className="duty-conditional duty-grid"><label>Guru pengiring<input value={details.hospitalTeacher} onChange={(event)=>setDetails((current)=>({...current,hospitalTeacher:event.target.value}))}/></label><label>Pemandu / kenderaan<input value={details.hospitalDriver} onChange={(event)=>setDetails((current)=>({...current,hospitalDriver:event.target.value}))}/></label></div>}</section>
    <section className="duty-section duty-section-wide"><div className="duty-section-head"><span>05</span><div><h3>Pemantauan, pelawat & peristiwa semasa</h3><p>Lengkapkan hanya jika berlaku pada hari tersebut.</p></div></div><div className="duty-grid"><label>Agensi pemantauan<select value={details.monitoringAgency} onChange={(event)=>setDetails((current)=>({...current,monitoringAgency:event.target.value}))}>{["Tiada","PPD","SPI","JPN","BPI","KPM","Lain-lain"].map((agency)=><option key={agency}>{agency}</option>)}</select></label><label>Butiran pemantauan / pelawat<input value={details.monitoringDetail} onChange={(event)=>setDetails((current)=>({...current,monitoringDetail:event.target.value}))} placeholder="Tujuan atau pegawai terlibat"/></label></div><label>Aktiviti, lawatan atau peristiwa semasa<textarea value={form.activityNote} onChange={(event)=>setForm((current)=>({...current,activityNote:event.target.value}))} placeholder="Kosongkan jika tiada"/></label><label>Isu semasa / perkara yang memerlukan tindakan<textarea value={details.currentIssue} onChange={(event)=>setDetails((current)=>({...current,currentIssue:event.target.value}))} placeholder="Kosongkan jika tiada"/></label><label>Ulasan guru bertugas / hal-hal lain<textarea value={form.generalNote} onChange={(event)=>setForm((current)=>({...current,generalNote:event.target.value}))} placeholder="Rumusan penting sahaja"/></label></section>
    <section className="duty-section duty-signoff"><div className="duty-section-head"><span>06</span><div><h3>Pengesahan laporan</h3><p>Pastikan semua bahagian telah disemak sebelum simpan.</p></div></div><div className="duty-grid"><label>Disediakan oleh<input value={form.preparedBy} onChange={(event)=>setForm((current)=>({...current,preparedBy:event.target.value}))} required/></label><label>Disemak oleh<input value={details.reviewedBy} onChange={(event)=>setDetails((current)=>({...current,reviewedBy:event.target.value}))} required/></label></div><div className="duty-completion"><span>✓</span><div><strong>Laporan lengkap untuk rekod pentadbiran</strong><small>Data ini akan digunakan untuk menjana rumusan mingguan secara automatik.</small></div></div></section>
    <button className="duty-primary duty-submit-complete" disabled={saving}>{saving?"Menyimpan laporan lengkap…":"Simpan laporan harian lengkap"}</button>
  </form>:
  <div className="weekly-builder"><div className="weekly-tools"><label>Tahun<input type="number" value={year} onChange={(event)=>setYear(Number(event.target.value))}/></label><label>Minggu<input type="number" min="1" max="53" value={week} onChange={(event)=>setWeek(Number(event.target.value))}/></label><button onClick={()=>void loadWeek()} disabled={loading}>{loading?"Membaca…":"Segarkan"}</button></div><div className="school-days">{schoolWeekDates(year,week).map((date)=>{const record=reports.find((item)=>item.reportDate===date); return <article key={date}><div><strong>{new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${date}T12:00:00`))}</strong><small>{new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"long"}).format(new Date(`${date}T12:00:00`))}</small></div><select value={dayStates[date]||"Belum lengkap"} onChange={(event)=>setDayStates((current)=>({...current,[date]:event.target.value}))} disabled={Boolean(record)}><option>Lengkap</option><option>Belum lengkap</option><option>Cuti / Tiada persekolahan</option></select>{record&&<span>{record.preparedBy}</span>}</article>;})}</div><button className="duty-primary" onClick={makeSummary}>Jana rumusan daripada laporan harian</button>{summary&&<section className="weekly-summary"><h3>Semak rumusan</h3><textarea value={summary} onChange={(event)=>setSummary(event.target.value)} rows={12}/><div><button onClick={()=>setSummary("")}>Jana semula</button><button className="save" onClick={()=>void saveWeekly()} disabled={weeklySending||Boolean(weeklyUrl)}>{weeklySending?"Menyimpan…":weeklyUrl?"Sudah disimpan":"Simpan PDF ke Google Drive"}</button></div>{weeklyUrl&&<a href={weeklyUrl} target="_blank" rel="noreferrer">Buka laporan mingguan</a>}</section>}</div>}</div>;
}

type DutyWeekGroup = { key:string; year:number; week:number; daily:OprReport[]; weekly:OprReport[]; updatedAt:string };

function OprDutyCentre({ notify,user }:{ notify:(message:string)=>void;user:PortalIdentity|null }) {
  const today=new Date().toISOString().slice(0,10), currentYear=new Date(`${today}T12:00:00`).getFullYear();
  const [tab,setTab]=useState<"dashboard"|"daily"|"weekly">("dashboard");
  const [saving,setSaving]=useState(false); const [loading,setLoading]=useState(false); const [reports,setReports]=useState<DutyReport[]>([]);
  const [week,setWeek]=useState(0); const [year,setYear]=useState(currentYear); const [dayStates,setDayStates]=useState<Record<string,string>>({}); const [summary,setSummary]=useState("");
  const [driveReports,setDriveReports]=useState<OprReport[]>([]); const [dashboardLoading,setDashboardLoading]=useState(true); const [dashboardError,setDashboardError]=useState(""); const [selectedWeekKey,setSelectedWeekKey]=useState(""); const [selectedDriveReport,setSelectedDriveReport]=useState<OprReport|null>(null);
  const [dailyRendering,setDailyRendering]=useState(false); const [dailyPdfBase64,setDailyPdfBase64]=useState(""); const [dailyPreviewUrl,setDailyPreviewUrl]=useState(""); const [dailySavedUrl,setDailySavedUrl]=useState("");
  const [weeklyRendering,setWeeklyRendering]=useState(false); const [weeklySending,setWeeklySending]=useState(false); const [weeklyPdfBase64,setWeeklyPdfBase64]=useState(""); const [weeklyPreviewUrl,setWeeklyPreviewUrl]=useState(""); const [weeklySavedUrl,setWeeklySavedUrl]=useState("");
  const [form,setForm]=useState({ reportDate:today,weekNumber:"",schoolYear:String(currentYear),teachers:"",teacherTotal:"",teacherPresent:"",teacherAbsent:"",cleanlinessStatus:"Baik",disciplineStatus:"Tiada isu",safetyStatus:"Tiada isu",healthStatus:"Tiada isu",canteenStatus:"Tiada isu",activityNote:"",generalNote:"",preparedBy:user?.name||"" });
  const [staffUsers,setStaffUsers]=useState<DirectoryUser[]>([]); const [staffSearch,setStaffSearch]=useState(""); const [staffLoading,setStaffLoading]=useState(false); const [staffError,setStaffError]=useState(""); const [staffPickerOpen,setStaffPickerOpen]=useState(false);
  const [details,setDetails]=useState<DutyDetails>(freshDutyDetails);
  const dayName=new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${form.reportDate}T12:00:00`));
  const safeName=(value:string)=>value.normalize("NFKD").replace(/[^a-zA-Z0-9 -]/g,"").replace(/\s+/g," ").trim()||"Laporan";
  const blobToDataUrl=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  const blobToBase64=async(blob:Blob)=>(await blobToDataUrl(blob)).split(",")[1]||"";
  const reportTitle=(report:OprReport)=>report.name.replace(/\.pdf$/i,"").replace(/__PENYEDIA__.*/,"").replace(/^\d{4}-\d{2}-\d{2}-/,"").replace(/^\d{4}-/,"").replaceAll("-"," ");
  const reportPreparer=(report:OprReport)=>report.name.match(/__PENYEDIA__(.+)\.pdf$/i)?.[1]||"Guru Bertugas";
  const reportDate=(report:OprReport)=>new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(report.updatedAt));
  const dutyReportDate=(report:OprReport)=>{const match=report.name.match(/^(\d{4}-\d{2}-\d{2})-/);return match?.[1]||report.updatedAt.slice(0,10);};
  const dutyReportDay=(report:OprReport)=>new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${dutyReportDate(report)}T12:00:00`));
  const dutyDailyMeta=(report:OprReport,reportWeek:number)=>`${new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${dutyReportDate(report)}T12:00:00`))} | ${dutyReportDay(report)} | Minggu ${reportWeek} | ${reportPreparer(report)}`;
  const latestDutyPdfByDate=(items:OprReport[])=>{const latest=new globalThis.Map<string,OprReport>();for(const item of items){const date=dutyReportDate(item);const current=latest.get(date);if(!current||item.updatedAt>=current.updatedAt)latest.set(date,item);}return [...latest.values()];};
  const isDutyReport=(report:OprReport)=>report.category.startsWith("Pengurusan · Laporan Guru Bertugas")||/Laporan-Guru-Bertugas/i.test(report.name);
  const isDutyDailyReport=(report:OprReport)=>isDutyReport(report)&&!(report.category.endsWith("Laporan Mingguan")||/Laporan-Mingguan|Laporan Mingguan/i.test(report.name));
  const activeDailyPdfsForWeek=(items:OprReport[],requestedYear:number,requestedWeek:number)=>latestDutyPdfByDate(items.filter((report)=>{
    const reportWeek=Number(report.name.match(/Minggu[-_ ](\d{1,2})/i)?.[1]);
    const reportYear=Number(report.name.match(/^(\d{4})-/)?.[1]);
    return isDutyDailyReport(report)&&reportYear===requestedYear&&reportWeek===requestedWeek;
  }));
  const fetchDutyIndex=async(refresh=false)=>{
    const response=await fetch(`/api/drive${refresh?"?refresh=1":""}`,{cache:"no-store"});
    const data=await response.json() as {files?:OprReport[];error?:string};
    if(!response.ok||!data.files)throw new Error(data.error||"Senarai laporan guru bertugas tidak dapat dibaca");
    const active=data.files.filter((file)=>isDutyReport(file)&&!/^UJIAN-SISTEM-/i.test(file.name));
    // Sinkronkan cache umum hanya selepas respons lengkap diterima. Dashboard
    // guru bertugas sendiri tidak bergantung pada cache memori ini.
    oprMemoryCache=data.files;
    return active;
  };

  const loadDashboard=async(refresh=false)=>{
    setDashboardLoading(true); setDashboardError("");
    try {
      setDriveReports(await fetchDutyIndex(refresh));
    } catch(error){setDashboardError(error instanceof Error?error.message:"PDF Google Drive tidak dapat dibaca");}
    finally{setDashboardLoading(false);}
  };

  const weekGroups=(()=>{
    const grouped=new globalThis.Map<string,DutyWeekGroup>();
    for(const report of driveReports){
      const weekMatch=report.name.match(/Minggu[-_ ](\d{1,2})/i); const yearMatch=report.name.match(/^(\d{4})/);
      const reportWeek=Number(weekMatch?.[1]),reportYear=Number(yearMatch?.[1]);if(!reportWeek||!reportYear)continue;const key=`${reportYear}-${String(reportWeek).padStart(2,"0")}`;
      const current=grouped.get(key)||{key,year:reportYear,week:reportWeek,daily:[],weekly:[],updatedAt:report.updatedAt};
      const isWeekly=report.category.endsWith("Laporan Mingguan")||/Mingguan/i.test(report.name); (isWeekly?current.weekly:current.daily).push(report);
      if(report.updatedAt>current.updatedAt) current.updatedAt=report.updatedAt; grouped.set(key,current);
    }
    return [...grouped.values()].sort((a,b)=>b.key.localeCompare(a.key)).map((group)=>({...group,daily:latestDutyPdfByDate(group.daily).sort((a,b)=>dutyReportDate(a).localeCompare(dutyReportDate(b))),weekly:group.weekly.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}));
  })();
  const selectedWeek=weekGroups.find((group)=>group.key===selectedWeekKey);
  const groupDailyCount=(group:DutyWeekGroup)=>group.daily.length;
  const selectedDailyEntries=selectedWeek?selectedWeek.daily.map((pdf)=>({date:dutyReportDate(pdf),pdf})):[];
  const dailyCount=weekGroups.reduce((total,group)=>total+groupDailyCount(group),0);
  const weeklyCount=driveReports.filter((report)=>report.category.endsWith("Laporan Mingguan")||/Mingguan/i.test(report.name)).length;

  useEffect(()=>{if(tab==="dashboard") void loadDashboard();},[tab]);
  useEffect(()=>{if(tab!=="daily"||staffUsers.length||staffLoading||staffError)return;setStaffLoading(true);fetch("/api/admin-users?resource=staff-picker",{cache:"no-store"}).then(async(response)=>{const data=await response.json() as {users?:DirectoryUser[];error?:string};if(!response.ok||!data.users)throw new Error(data.error||"Senarai guru tidak dapat dibaca");setStaffUsers(data.users);}).catch((error)=>setStaffError(error instanceof Error?error.message:"Senarai guru tidak dapat dibaca")).finally(()=>setStaffLoading(false));},[tab,staffUsers.length,staffLoading,staffError]);
  useEffect(()=>{const update=(event:Event)=>{const report=(event as CustomEvent<OprReport>).detail;if(!report||(report.category.startsWith("Pengurusan · Laporan Guru Bertugas")||/Laporan-Guru-Bertugas/i.test(report.name)))setDriveReports((current)=>report?[report,...current.filter(item=>item.id!==report.id)]:current);};const remove=(event:Event)=>{const id=(event as CustomEvent<string>).detail;if(id)setDriveReports((current)=>current.filter((report)=>report.id!==id));};window.addEventListener("smkap:opr-updated",update);window.addEventListener("smkap:opr-removed",remove);return()=>{window.removeEventListener("smkap:opr-updated",update);window.removeEventListener("smkap:opr-removed",remove);};},[]);

  const loadWeek=async()=>{
    setLoading(true); setSummary(""); setWeeklyPdfBase64(""); setWeeklySavedUrl(""); if(weeklyPreviewUrl) URL.revokeObjectURL(weeklyPreviewUrl); setWeeklyPreviewUrl("");
    try {
      const response=await fetch(`/api/opr-duty?year=${year}&week=${week}`,{cache:"no-store"}); const data=await response.json() as {records?:DutyReport[];error?:string};
      if(!response.ok||!data.records) throw new Error(data.error||"Laporan tidak tersedia");
      const sorted=latestDutyRecordsByDate(data.records);setReports(sorted);
      const dates=dutyWeekDates(year,week,sorted);setDayStates((current)=>Object.fromEntries(dates.map((date)=>[date,sorted.some((record)=>record.reportDate===date)?"Lengkap":current[date]==="Cuti / Tiada persekolahan"?current[date]:"Belum lengkap"])));
      void fetchOprIndex(true).then((files)=>{
        const dutyFiles=files.filter((file)=>isDutyReport(file)&&!/^UJIAN-SISTEM-/i.test(file.name));setDriveReports(dutyFiles);
        const activePdfByDate=new globalThis.Map(activeDailyPdfsForWeek(dutyFiles,year,week).map((file)=>[dutyReportDate(file),file]));
        setReports(sorted.map((record)=>{
          const activePdf=activePdfByDate.get(record.reportDate);
          return activePdf?{...record,preparedBy:reportPreparer(activePdf),updatedAt:activePdf.updatedAt}:record;
        }));
      }).catch(()=>{/* Rekod sistem kekal dipaparkan jika Google Drive lambat atau tidak tersedia. */});
    } catch(error){notify(error instanceof Error?error.message:"Laporan tidak dapat dibaca");}
    finally{setLoading(false);}
  };
  useEffect(()=>{if(tab==="weekly"&&week)void loadWeek();else if(tab==="weekly"){setReports([]);setDayStates({});}},[tab,week,year]);

  const loadLogo=async()=>{try{return await blobToDataUrl(await(await fetch("/logo-smkap.png")).blob());}catch{return "";}};
  const drawPdfHeader=(pdf:PdfDocument,logoData:string,title:string,reference:string)=>{
    pdf.setFillColor(201,230,247); pdf.rect(0,0,210,40,"F"); pdf.setFillColor(231,245,253); pdf.circle(187,3,28,"F"); pdf.circle(158,1,17,"F"); pdf.setFillColor(218,238,250); pdf.roundedRect(3,3,204,33,7,7,"F"); pdf.setDrawColor(153,199,225); pdf.roundedRect(3,3,204,33,7,7,"S"); pdf.setFillColor(45,119,165); pdf.rect(0,38,210,1.4,"F"); pdf.setFillColor(124,184,216); pdf.rect(0,39.4,210,.6,"F");
    if(logoData) pdf.addImage(logoData,"PNG",8,8,63,17,undefined,"FAST");
    pdf.setTextColor(22,54,82); pdf.setFont("helvetica","bold"); pdf.setFontSize(15); pdf.text("SMK AGAMA PAHANG",76,14); pdf.setFontSize(8.5); pdf.setFont("helvetica","normal"); pdf.text("MUADZAM SHAH, PAHANG",76,20); pdf.setTextColor(82,157,199); pdf.setFont("helvetica","bold"); pdf.setFontSize(8); pdf.text(title,76,28); pdf.setTextColor(58,91,116); pdf.setFontSize(6.8); pdf.text(reference,198,14,{align:"right"});
  };
  const drawPdfFooter=(pdf:PdfDocument)=>{pdf.setFillColor(45,119,165);pdf.rect(0,289,210,8,"F");pdf.setTextColor(255,255,255);pdf.setFont("helvetica","normal");pdf.setFontSize(6.5);pdf.text("Portal Rasmi SMK Agama Pahang | Dokumen dijana secara digital",12,294);pdf.text("SMKAP",198,294,{align:"right"});};

  const makeDailyPdf=async()=>{
    const jsPDF=await loadJsPdf();const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true}); const logo=await loadLogo();
    pdf.setProperties({title:`Laporan Harian Guru Bertugas Minggu ${form.weekNumber}`,subject:"Laporan Guru Bertugas SMK Agama Pahang",author:form.preparedBy,creator:"Portal Rasmi SMKAP"});
    drawPdfHeader(pdf,logo,"LAPORAN HARIAN GURU BERTUGAS",`MINGGU ${form.weekNumber} / ${form.schoolYear}`);
    pdf.setTextColor(22,54,82);pdf.setFont("helvetica","bold");pdf.setFontSize(14);pdf.text("LAPORAN HARIAN GURU BERTUGAS",12,49);
    const meta=[["TARIKH",form.reportDate],["HARI",dayName],["MINGGU",form.weekNumber],["TAHUN",form.schoolYear]]; meta.forEach(([label,value],index)=>{const bx=12+index*47;pdf.setFillColor(239,247,252);pdf.roundedRect(bx,55,44,17,2,2,"F");pdf.setTextColor(45,119,165);pdf.setFontSize(6.7);pdf.text(label,bx+3,61);pdf.setTextColor(22,54,82);pdf.setFontSize(8.5);pdf.text(value||"-",bx+3,68);});
    pdf.setDrawColor(215,228,235);pdf.setFillColor(255,255,255);pdf.roundedRect(12,77,186,24,2,2,"FD");pdf.setTextColor(45,119,165);pdf.setFontSize(7);pdf.text("NAMA GURU BERTUGAS",16,84);pdf.setTextColor(22,54,82);pdf.setFontSize(8.5);pdf.text(pdf.splitTextToSize(form.teachers||"-",178).slice(0,3),16,91);
    [["BILANGAN GURU",form.teacherTotal||"0"],["HADIR",form.teacherPresent||"0"],["TIDAK HADIR",form.teacherAbsent||"0"]].forEach(([label,value],index)=>{const bx=12+index*63;pdf.setFillColor(239,247,252);pdf.roundedRect(bx,105,60,18,2,2,"F");pdf.setTextColor(45,119,165);pdf.setFontSize(6.5);pdf.text(label,bx+3,111);pdf.setTextColor(22,54,82);pdf.setFontSize(11);pdf.text(value,bx+3,119);});
    pdf.setTextColor(22,54,82);pdf.setFontSize(8);pdf.text("KEBERSIHAN & KECERIAAN",12,132);let y=137;cleanlinessLocations.forEach((location,index)=>{pdf.setFillColor(index%2?247:239,index%2?251:247,index%2?253:252);pdf.rect(12,y,186,7,"F");pdf.setTextColor(55,75,88);pdf.setFont("helvetica","normal");pdf.setFontSize(7.2);pdf.text(location,16,y+4.8);const note=details.locationNotes?.[location]||"";if(note){pdf.setTextColor(100,120,130);pdf.setFontSize(6.2);pdf.text(pdf.splitTextToSize(note,75)[0],86,y+4.8);}pdf.setFont("helvetica","bold");pdf.setTextColor(details.locationRatings[location]==="Lemah"?180:45,details.locationRatings[location]==="Lemah"?78:119,details.locationRatings[location]==="Lemah"?70:165);pdf.text(details.locationRatings[location]||"Baik",194,y+4.8,{align:"right"});y+=7;});
    pdf.setFillColor(239,247,252);pdf.roundedRect(12,211,91,30,2,2,"F");pdf.roundedRect(107,211,91,30,2,2,"F");pdf.setTextColor(45,119,165);pdf.setFontSize(7);pdf.text("DISIPLIN",16,218);pdf.text("KESELAMATAN & KANTIN",111,218);pdf.setTextColor(22,54,82);pdf.setFontSize(8);pdf.text(details.disciplineControlled?"Terkawal":"Ada kes disiplin",16,225);pdf.text(`Keselamatan: ${form.safetyStatus}`,111,225);pdf.text(`Kantin: ${form.canteenStatus}`,111,232);if(!details.disciplineControlled){pdf.setFontSize(6.8);pdf.text(pdf.splitTextToSize(`${details.disciplineCaseType||"Kes"} - ${details.disciplineAction||"Tindakan belum dinyatakan"}`,82).slice(0,2),16,231);}
    pdf.setTextColor(22,54,82);pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.text("KESIHATAN & URUSAN HOSPITAL",12,251);pdf.setFont("helvetica","normal");pdf.setFontSize(7.5);pdf.text(`Hospital: Lelaki ${details.hospitalMale} | Perempuan ${details.hospitalFemale}     Bilik kesihatan: Lelaki ${details.healthRoomMale} | Perempuan ${details.healthRoomFemale}`,12,258);if(details.hospitalTeacher||details.hospitalDriver)pdf.text(`Guru pengiring: ${details.hospitalTeacher||"-"}     Pemandu/kenderaan: ${details.hospitalDriver||"-"}`,12,265);drawPdfFooter(pdf);
    pdf.addPage();drawPdfHeader(pdf,logo,"LAPORAN HARIAN GURU BERTUGAS",`${dayName.toUpperCase()} · ${form.reportDate}`);
    const section=(heading:string,value:string,sy:number,sh:number)=>{pdf.setDrawColor(215,228,235);pdf.setFillColor(255,255,255);pdf.roundedRect(12,sy,186,sh,2,2,"FD");pdf.setFillColor(45,119,165);pdf.roundedRect(12,sy,186,8,2,2,"F");pdf.rect(12,sy+5,186,3,"F");pdf.setTextColor(255,255,255);pdf.setFont("helvetica","bold");pdf.setFontSize(7);pdf.text(heading,16,sy+5.3);pdf.setTextColor(55,75,88);pdf.setFont("helvetica","normal");pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(value||"Tiada catatan.",178).slice(0,Math.max(2,Math.floor((sh-12)/4.2))),16,sy+14,{lineHeightFactor:1.25});};
    section("PEMANTAUAN / PELAWAT",details.monitoringAgency&&details.monitoringAgency!=="Tiada"?`${details.monitoringAgency}: ${details.monitoringDetail||"Butiran tidak dinyatakan"}`:"Tiada pemantauan atau pelawat direkodkan.",49,34);section("AKTIVITI, LAWATAN ATAU PERISTIWA SEMASA",form.activityNote,88,45);section("ISU SEMASA / PERKARA YANG MEMERLUKAN TINDAKAN",details.currentIssue,138,45);section("ULASAN GURU BERTUGAS / HAL-HAL LAIN",form.generalNote,188,45);
    [["DISEDIAKAN OLEH",form.preparedBy,"Guru Bertugas"],["DISEMAK OLEH",details.reviewedBy,"Pentadbir"]].forEach(([label,name,role],index)=>{const sx=12+index*96;pdf.setDrawColor(215,228,235);pdf.roundedRect(sx,240,90,31,2,2,"S");pdf.setTextColor(45,119,165);pdf.setFont("helvetica","bold");pdf.setFontSize(6.8);pdf.text(label,sx+4,247);pdf.setTextColor(22,54,82);pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(name,82).slice(0,2),sx+4,255);pdf.setTextColor(78,105,124);pdf.setFont("helvetica","normal");pdf.setFontSize(7);pdf.text(role,sx+4,265);});drawPdfFooter(pdf);
    const blob=pdf.output("blob");return{base64:await blobToBase64(blob),url:URL.createObjectURL(blob)};
  };

  const prepareDailyPreview=async(event:React.FormEvent)=>{
    event.preventDefault(); if(!form.teachers.trim()||!form.preparedBy.trim())return notify("Nama guru bertugas dan penyedia diperlukan");if(Number(form.weekNumber)<1||Number(form.weekNumber)>53)return notify("Masukkan nombor minggu antara 1 hingga 53");
    setDailyRendering(true);setDailySavedUrl("");try{const generated=await makeDailyPdf();if(dailyPreviewUrl)URL.revokeObjectURL(dailyPreviewUrl);setDailyPdfBase64(generated.base64);setDailyPreviewUrl(generated.url);}catch{notify("Pratonton PDF laporan harian tidak dapat dijana");}finally{setDailyRendering(false);}
  };

  const saveDaily=async()=>{
    if(!dailyPdfBase64)return notify("Sila jana dan semak pratonton PDF dahulu");const ratingValues=Object.values(details.locationRatings);const cleanlinessStatus=ratingValues.includes("Lemah")?"Perlu perhatian":ratingValues.includes("Memuaskan")?"Memuaskan":"Baik";const disciplineStatus=details.disciplineControlled?"Tiada isu":"Perlu perhatian";const healthCount=[details.hospitalMale,details.hospitalFemale,details.healthRoomMale,details.healthRoomFemale].reduce((sum,value)=>sum+(Number(value)||0),0);setSaving(true);
    try{
      const recordResponse=await fetch("/api/opr-duty",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,cleanlinessStatus,disciplineStatus,healthStatus:healthCount?"Perlu perhatian":"Tiada isu",details,id:crypto.randomUUID(),submittedAt:new Date().toISOString(),weekNumber:Number(form.weekNumber),schoolYear:Number(form.schoolYear),dayName,teacherTotal:Number(form.teacherTotal)||0,teacherPresent:Number(form.teacherPresent)||0,teacherAbsent:Number(form.teacherAbsent)||0})});const recordData=await recordResponse.json()as{error?:string};if(!recordResponse.ok)throw new Error(recordData.error||"Data laporan tidak dapat disimpan");
      const name=`${form.reportDate}-Minggu-${form.weekNumber}-Laporan-Harian-Guru-Bertugas-${safeName(dayName)}__PENYEDIA__${safeName(form.preparedBy)}.pdf`;const driveResponse=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:"Pengurusan · Laporan Guru Bertugas · Laporan Harian",files:[{name,mimeType:"application/pdf",base64:dailyPdfBase64}]})});const driveData=await driveResponse.json()as{error?:string;files?:OprReport[]};if(!driveResponse.ok||!driveData.files?.[0])throw new Error(driveData.error||"PDF tidak dapat dihantar");const savedReport=driveData.files[0];rememberOprReport(savedReport);setDriveReports((current)=>[savedReport,...current.filter((item)=>item.id!==savedReport.id)]);setDailySavedUrl(savedReport.viewUrl);setSelectedWeekKey(form.schoolYear+"-"+String(form.weekNumber).padStart(2,"0"));setTab("dashboard");notify("Laporan harian dan PDF berjaya disimpan ke Google Drive");
    }catch(error){notify(error instanceof Error?error.message:"Laporan harian tidak dapat disimpan");}finally{setSaving(false);}
  };

  const makeSummary=()=>{const currentReports=latestDutyRecordsByDate(reports);const dates=dutyWeekDates(year,week,currentReports);const unresolved=dates.filter((date)=>!currentReports.some((record)=>record.reportDate===date)&&dayStates[date]!=="Cuti / Tiada persekolahan");if(unresolved.length)return notify("Lengkapkan laporan atau tandakan Hari cuti bagi semua hari Isnin hingga Jumaat");const actual=currentReports.filter((record)=>dates.includes(record.reportDate));if(!actual.length)return notify("Tiada laporan harian untuk dirumuskan");const holidays=dates.filter((date)=>dayStates[date]==="Cuti / Tiada persekolahan").map((date)=>new Intl.DateTimeFormat("ms-MY",{weekday:"long",day:"numeric",month:"long"}).format(new Date(`${date}T12:00:00`)));const issues=(key:keyof DutyReport,label:string)=>{const selected=actual.filter((record)=>!["Baik","Tiada isu"].includes(String(record[key])));return selected.length?`${label}: ${selected.map((record)=>`${record.dayName} (${record[key]})`).join(", ")}.`:`${label}: Tiada isu penting dilaporkan.`;};const detailRows=actual.map((record)=>({record,details:parseDutyDetails(record)}));const locationIssues=detailRows.flatMap(({record,details})=>Object.entries(details.locationRatings||{}).filter(([,rating])=>rating!=="Baik").map(([location,rating])=>`${record.dayName}: ${location} (${rating})`));const disciplineCases=detailRows.filter(({details})=>details.disciplineControlled===false).map(({record,details})=>`${record.dayName}: ${details.disciplineCaseType||"Kes disiplin"}${details.disciplineAction?` - tindakan: ${details.disciplineAction}`:""}`);const healthTotals=detailRows.reduce((totals,{details})=>({hospital:totals.hospital+Number(details.hospitalMale||0)+Number(details.hospitalFemale||0),room:totals.room+Number(details.healthRoomMale||0)+Number(details.healthRoomFemale||0)}),{hospital:0,room:0});const monitoring=detailRows.filter(({details})=>details.monitoringAgency&&details.monitoringAgency!=="Tiada").map(({record,details})=>`${record.dayName}: ${details.monitoringAgency}${details.monitoringDetail?` - ${details.monitoringDetail}`:""}`);const notes=detailRows.flatMap(({record,details})=>[record.activityNote,details.currentIssue,record.generalNote].filter(Boolean).map((note)=>`${record.dayName}: ${note}`));setSummary([`Laporan Mingguan Minggu ${week} merangkumi ${actual.length} hari persekolahan daripada lima hari Isnin hingga Jumaat.`,holidays.length?`Hari cuti: ${holidays.join(", ")}.`:"Hari cuti: Tiada.",issues("safetyStatus","Keselamatan"),issues("canteenStatus","Kantin"),locationIssues.length?`Kebersihan & keceriaan yang perlu perhatian: ${locationIssues.join("; ")}.`:"Kebersihan & keceriaan: Semua lokasi dilaporkan baik.",disciplineCases.length?`Disiplin: ${disciplineCases.join("; ")}.`:"Disiplin: Terkawal sepanjang minggu.",`Kesihatan: ${healthTotals.hospital} murid dibawa ke hospital; ${healthTotals.room} murid direkodkan di bilik kesihatan.`,monitoring.length?`Pemantauan / pelawat: ${monitoring.join("; ")}.`:"Pemantauan / pelawat: Tiada rekod.",notes.length?`Aktiviti, isu dan catatan: ${notes.join(" ")}`:"Tiada aktiviti, isu atau catatan tambahan."].join("\n\n"));};

  const makeWeeklyPdf=async()=>{
    const jsPDF=await loadJsPdf();const pdf=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});const logo=await loadLogo();const preparedBy=form.preparedBy||reports[0]?.preparedBy||"Guru Bertugas";pdf.setProperties({title:`Laporan Mingguan Guru Bertugas Minggu ${week}`,subject:"Laporan Guru Bertugas SMK Agama Pahang",author:preparedBy,creator:"Portal Rasmi SMKAP"});drawPdfHeader(pdf,logo,"LAPORAN MINGGUAN GURU BERTUGAS",`MINGGU ${week} / ${year}`);pdf.setTextColor(22,54,82);pdf.setFont("helvetica","bold");pdf.setFontSize(14);pdf.text(`LAPORAN MINGGUAN GURU BERTUGAS - MINGGU ${week}`,12,49);
    const currentReports=latestDutyRecordsByDate(reports);const dates=dutyWeekDates(year,week,currentReports);const actual=currentReports.filter((record)=>dates.includes(record.reportDate));[["TAHUN",String(year)],["MINGGU",String(week)],["HARI SEKOLAH",String(actual.length)],["DISEDIAKAN",preparedBy]].forEach(([label,value],index)=>{const bx=12+index*47;pdf.setFillColor(239,247,252);pdf.roundedRect(bx,55,44,19,2,2,"F");pdf.setTextColor(45,119,165);pdf.setFontSize(6.5);pdf.text(label,bx+3,61);pdf.setTextColor(22,54,82);pdf.setFontSize(index===3?7:9);pdf.text(pdf.splitTextToSize(value,38).slice(0,2),bx+3,68);});pdf.setTextColor(22,54,82);pdf.setFontSize(8);pdf.text("REKOD ISNIN HINGGA JUMAAT",12,84);let y=89;dates.forEach((date,index)=>{const record=actual.find((item)=>item.reportDate===date);const isHoliday=dayStates[date]==="Cuti / Tiada persekolahan";pdf.setFillColor(index%2?247:239,index%2?251:247,index%2?253:252);pdf.rect(12,y,186,10,"F");pdf.setTextColor(55,75,88);pdf.setFont("helvetica","bold");pdf.setFontSize(7.2);pdf.text(new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${date}T12:00:00`)),16,y+4.3);pdf.setFont("helvetica","normal");pdf.text(new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${date}T12:00:00`)),55,y+4.3);pdf.setTextColor(isHoliday?166:45,isHoliday?112:119,isHoliday?47:165);pdf.text(record?"Laporan harian lengkap":isHoliday?"Hari cuti":"Belum lengkap",194,y+4.3,{align:"right"});pdf.setTextColor(100,125,135);pdf.setFontSize(6.5);pdf.text(record?.preparedBy||isHoliday?record?.preparedBy||"Cuti / Tiada persekolahan":"-",194,y+8,{align:"right"});y+=10;});
    const headingY=146;pdf.setFillColor(45,119,165);pdf.roundedRect(12,headingY,186,9,2,2,"F");pdf.setTextColor(255,255,255);pdf.setFont("helvetica","bold");pdf.setFontSize(7.3);pdf.text("RUMUSAN MINGGUAN",16,headingY+6);pdf.setTextColor(55,75,88);pdf.setFont("helvetica","normal");pdf.setFontSize(8.2);const lines=pdf.splitTextToSize(summary,178);const firstPageLines=lines.slice(0,28);pdf.text(firstPageLines,16,164,{lineHeightFactor:1.35});drawPdfFooter(pdf);
    if(lines.length>28){pdf.addPage();drawPdfHeader(pdf,logo,"LAPORAN MINGGUAN GURU BERTUGAS",`SAMBUNGAN · MINGGU ${week}`);pdf.setTextColor(22,54,82);pdf.setFont("helvetica","bold");pdf.setFontSize(9);pdf.text("SAMBUNGAN RUMUSAN",12,51);pdf.setTextColor(55,75,88);pdf.setFont("helvetica","normal");pdf.setFontSize(8.2);pdf.text(lines.slice(28,82),16,61,{lineHeightFactor:1.35});drawPdfFooter(pdf);}
    const lastPage=pdf.getNumberOfPages();pdf.setPage(lastPage);pdf.setDrawColor(215,228,235);pdf.roundedRect(12,247,90,30,2,2,"S");pdf.roundedRect(108,247,90,30,2,2,"S");pdf.setTextColor(45,119,165);pdf.setFont("helvetica","bold");pdf.setFontSize(6.8);pdf.text("DISEDIAKAN OLEH",16,254);pdf.text("DISEMAK OLEH",112,254);pdf.setTextColor(22,54,82);pdf.setFontSize(8);pdf.text(pdf.splitTextToSize(preparedBy,82).slice(0,2),16,263);pdf.text(pdf.splitTextToSize(details.reviewedBy||"Guru Penolong Kanan Pentadbiran",82).slice(0,2),112,263);drawPdfFooter(pdf);const blob=pdf.output("blob");return{base64:await blobToBase64(blob),url:URL.createObjectURL(blob)};
  };
  const prepareWeeklyPreview=async()=>{if(!summary)return notify("Jana dan semak rumusan dahulu");setWeeklyRendering(true);setWeeklySavedUrl("");try{const generated=await makeWeeklyPdf();if(weeklyPreviewUrl)URL.revokeObjectURL(weeklyPreviewUrl);setWeeklyPdfBase64(generated.base64);setWeeklyPreviewUrl(generated.url);}catch{notify("Pratonton PDF laporan mingguan tidak dapat dijana");}finally{setWeeklyRendering(false);}};
  const saveWeekly=async()=>{if(!weeklyPdfBase64)return notify("Sila jana dan semak pratonton PDF dahulu");setWeeklySending(true);try{const preparedBy=form.preparedBy||reports[0]?.preparedBy||"Guru Bertugas";const name=`${year}-Minggu-${week}-Laporan-Guru-Bertugas-Mingguan__PENYEDIA__${safeName(preparedBy)}.pdf`;const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:"Pengurusan · Laporan Guru Bertugas · Laporan Mingguan",files:[{name,mimeType:"application/pdf",base64:weeklyPdfBase64}]})});const data=await response.json()as{error?:string;files?:OprReport[]};if(!response.ok||!data.files?.[0])throw new Error(data.error||"Rumusan tidak dapat dihantar");const savedReport=data.files[0];rememberOprReport(savedReport);setDriveReports((current)=>[savedReport,...current.filter((item)=>item.id!==savedReport.id)]);setWeeklySavedUrl(savedReport.viewUrl);setSelectedWeekKey(year+"-"+String(week).padStart(2,"0"));setTab("dashboard");notify("Laporan mingguan berjaya disimpan ke Google Drive");}catch(error){notify(error instanceof Error?error.message:"Laporan mingguan tidak dapat disimpan");}finally{setWeeklySending(false);}};
  const selectedDutyTeachers=form.teachers.split(",").map((name)=>name.trim()).filter(Boolean);
  const normalizedStaffSearch=staffSearch.trim().toLocaleLowerCase("ms-MY");
  const selectedDutyTeacherKeys=new Set(selectedDutyTeachers.map((name)=>name.toLocaleLowerCase("ms-MY")));
  const staffMatches=staffUsers.filter((staff)=>!selectedDutyTeacherKeys.has(staff.name.toLocaleLowerCase("ms-MY"))&&(!normalizedStaffSearch||`${staff.name} ${staff.position} ${staff.grade}`.toLocaleLowerCase("ms-MY").includes(normalizedStaffSearch)));
  const addDutyTeacher=(staff:DirectoryUser)=>{setForm((current)=>{const names=current.teachers.split(",").map((name)=>name.trim()).filter(Boolean);if(names.some((name)=>name.toLocaleLowerCase("ms-MY")===staff.name.toLocaleLowerCase("ms-MY")))return current;return{...current,teachers:[...names,staff.name].join(", ")};});setStaffSearch("");};
  const removeDutyTeacher=(name:string)=>setForm((current)=>({...current,teachers:current.teachers.split(",").map((item)=>item.trim()).filter((item)=>item&&item!==name).join(", ")}));
  const statusField=(label:string,key:keyof typeof form)=><label>{label}<select value={form[key]} onChange={(event)=>setForm((current)=>({...current,[key]:event.target.value}))}>{dutyStatuses.map((status)=><option key={status}>{status}</option>)}</select></label>;

  if(selectedDriveReport)return createPortal(<div className="duty-preview-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setSelectedDriveReport(null)}><article className="saved-opr-preview drive-opr-preview duty-saved-preview" role="dialog" aria-modal="true" aria-label={`Pratonton ${reportTitle(selectedDriveReport)}`}><button className="saved-preview-close" onClick={()=>setSelectedDriveReport(null)} aria-label="Tutup pratonton">×</button><header><span>PDF LAPORAN GURU BERTUGAS · GOOGLE DRIVE</span><h2>{reportTitle(selectedDriveReport)}</h2><p>{reportDate(selectedDriveReport)} · {reportPreparer(selectedDriveReport)}</p></header><DrivePdfPreview fileId={selectedDriveReport.id} title={`PDF ${reportTitle(selectedDriveReport)}`}/><footer><button onClick={()=>setSelectedDriveReport(null)}>Tutup pratonton</button><a href={`/api/drive?file=${encodeURIComponent(selectedDriveReport.id)}&download=1`}>Muat turun PDF</a><a className="print-opr" href={`https://drive.google.com/file/d/${encodeURIComponent(selectedDriveReport.id)}/view`} target="_blank" rel="noreferrer">Buka untuk cetak</a></footer></article></div>,document.body);

  return <div className="duty-centre">
    <div className="attendance-head"><div><span className="modal-overline">PENGURUSAN · GURU BERTUGAS</span><h2 id="folder-title">Pusat laporan guru bertugas</h2><p>Setiap minggu mempunyai folder sendiri yang menghimpunkan PDF laporan harian dan laporan mingguan.</p></div></div>
    <div className="duty-tabs duty-tabs-three"><button className={tab==="dashboard"?"active":""} onClick={()=>setTab("dashboard")}>Dashboard laporan</button><button className={tab==="daily"?"active":""} onClick={()=>setTab("daily")}>Laporan harian</button><button className={tab==="weekly"?"active":""} onClick={()=>setTab("weekly")}>Laporan mingguan</button></div>
    {tab==="dashboard"?<div className="duty-dashboard">
      <div className="duty-dashboard-kpis"><article><span>FOLDER MINGGU</span><strong>{weekGroups.length}</strong><small>Minggu direkodkan</small></article><article><span>LAPORAN HARIAN</span><strong>{dailyCount}</strong><small>PDF lengkap</small></article><article><span>LAPORAN MINGGUAN</span><strong>{weeklyCount}</strong><small>PDF rumusan</small></article><article><span>MINGGU TERKINI</span><strong className="word">{weekGroups[0]?`Minggu ${weekGroups[0].week}`:"Belum ada"}</strong><small>{weekGroups[0]?.year||"Menunggu laporan"}</small></article></div>
      <section className="duty-week-section"><div className="dash-section-title"><div><span>FOLDER LAPORAN</span><h3>Pilih minggu untuk membuka laporan harian dan mingguan</h3></div><button onClick={()=>void loadDashboard(true)} disabled={dashboardLoading}>{dashboardLoading?"Menyemak…":"Segarkan"}</button></div>{dashboardError&&!weekGroups.length?<p className="drive-list-state error">{dashboardError}</p>:dashboardLoading&&!weekGroups.length?<p className="drive-list-state">Membaca rekod laporan...</p>:<div className="duty-week-grid">{weekGroups.map((group)=>{const dailyTotal=groupDailyCount(group);return <button key={group.key} onClick={()=>setSelectedWeekKey(group.key)}><span>▰</span><div><strong>Minggu {group.week}</strong><small>{group.year} · {dailyTotal} harian · {group.weekly.length} mingguan</small></div><b>{dailyTotal+group.weekly.length}</b></button>;})}</div>}</section>
      <div className="duty-dashboard-actions"><button onClick={()=>setTab("daily")}>＋ Cipta laporan harian</button><button onClick={()=>{const latest=weekGroups.find(group=>groupDailyCount(group)>0);if(!latest)return notify("Belum ada laporan harian untuk dijadikan laporan mingguan");setWeek(latest.week);setYear(latest.year);setTab("weekly");}}>Jana laporan mingguan →</button></div>
      {selectedWeek&&createPortal(<div className="opr-folder-float-backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setSelectedWeekKey("")}><section className="opr-folder-float duty-week-float" role="dialog" aria-modal="true" aria-label={`Laporan Minggu ${selectedWeek.week}`}><button className="folder-float-close" onClick={()=>setSelectedWeekKey("")} aria-label="Tutup folder minggu">×</button><span className="modal-overline">FOLDER LAPORAN GURU BERTUGAS</span><h3>Minggu {selectedWeek.week}</h3><p>{selectedWeek.year} · Pilih laporan untuk membuka PDF.</p><div className="duty-week-columns"><section><h4>Laporan harian <b>{selectedDailyEntries.length}</b></h4><div className="duty-report-stack">{selectedDailyEntries.length?selectedDailyEntries.map((entry)=>{const preparedBy=reportPreparer(entry.pdf);const day=dutyReportDay(entry.pdf);const meta=dutyDailyMeta(entry.pdf,selectedWeek.week);return <button className="duty-report-row" key={entry.pdf.id} onClick={()=>setSelectedDriveReport(entry.pdf)}><span className="duty-report-icon">▤</span><div><strong>Laporan Harian — {day}</strong><small>{meta}</small></div><i>›</i></button>; }):<p>Belum ada laporan harian.</p>}</div></section><section><h4>Laporan mingguan <b>{selectedWeek.weekly.length}</b></h4><div className="duty-report-stack">{selectedWeek.weekly.length?selectedWeek.weekly.map((report)=><button className="duty-report-row" key={report.id} onClick={()=>setSelectedDriveReport(report)}><span className="duty-report-icon">▤</span><div><strong>Laporan Mingguan — Minggu {selectedWeek.week}</strong><small>Minggu {selectedWeek.week} | {selectedWeek.year} | {reportPreparer(report)}</small></div><i>›</i></button>):<p>Belum ada PDF laporan mingguan.</p>}</div></section></div><div className="duty-week-actions"><button onClick={()=>{setForm((current)=>({...current,weekNumber:String(selectedWeek.week),schoolYear:String(selectedWeek.year)}));setWeek(selectedWeek.week);setYear(selectedWeek.year);setSelectedWeekKey("");setTab("daily");}}>Tambah laporan harian</button><button onClick={()=>{setWeek(selectedWeek.week);setYear(selectedWeek.year);setSelectedWeekKey("");setTab("weekly");}}>Jana laporan mingguan</button></div></section></div>,document.body)}
    </div>:tab==="daily"?dailyPreviewUrl?<article className="opr-preview pdf-review duty-pdf-review"><div className="pdf-review-head"><div><span>PRATONTON PDF LAPORAN HARIAN</span><h3>Semak sebelum simpan</h3><p>Reka bentuk PDF menggunakan identiti yang sama seperti OPR rasmi.</p></div><a href={dailyPreviewUrl} download={`${form.reportDate}-Laporan-Harian-Guru-Bertugas.pdf`}>Muat turun semakan</a></div><div className="pdf-preview-stage"><iframe src={dailyPreviewUrl} title="Pratonton PDF laporan harian"/></div><div className="drive-destination"><span>◈</span><div><strong>Destinasi Google Drive</strong><small>Pengurusan › Laporan Guru Bertugas › Laporan Harian › Minggu {form.weekNumber}</small></div></div>{dailySavedUrl&&<p className="drive-success">✓ Laporan telah difailkan. <a href={dailySavedUrl} target="_blank" rel="noreferrer">Buka PDF di Google Drive</a></p>}<div className="preview-confirmation"><span>✓</span><p><strong>Sudah semak pratonton?</strong><small>Data harian dan PDF akan disimpan bersama untuk rumusan mingguan.</small></p></div><div className="generator-actions"><button onClick={()=>{setDailyPdfBase64("");setDailySavedUrl("");if(dailyPreviewUrl)URL.revokeObjectURL(dailyPreviewUrl);setDailyPreviewUrl("");}} disabled={saving}>Ubah maklumat</button><button className="save" onClick={()=>void saveDaily()} disabled={saving||Boolean(dailySavedUrl)}>{saving?"Menyimpan…":dailySavedUrl?"Sudah disimpan":"Simpan laporan & PDF"}</button></div></article>:<form className="duty-form duty-form-complete" onSubmit={prepareDailyPreview}>
      <section className="duty-section duty-section-intro"><div className="duty-section-head"><span>01</span><div><h3>Maklumat laporan</h3><p>Maklumat asas hari bertugas dan kehadiran guru.</p></div></div><div className="duty-grid"><label>Tarikh<input type="date" value={form.reportDate} onChange={(event)=>setForm((current)=>({...current,reportDate:event.target.value}))}/></label><label>Hari<input value={dayName} readOnly/></label><label>Minggu<input type="number" min="1" max="53" value={form.weekNumber} onChange={(event)=>setForm((current)=>({...current,weekNumber:event.target.value}))} required/></label><label>Tahun<input type="number" min="2020" max="2100" value={form.schoolYear} onChange={(event)=>setForm((current)=>({...current,schoolYear:event.target.value}))} required/></label></div><div className="duty-teacher-picker"><div className="duty-teacher-picker-title"><span>Nama guru bertugas</span><b>{selectedDutyTeachers.length} dipilih</b></div><small>Pilih daripada senarai pengguna. Taip nama untuk mencari dengan pantas.</small>{selectedDutyTeachers.length>0&&<div className="duty-teacher-chips" aria-label="Guru bertugas yang dipilih">{selectedDutyTeachers.map((name)=><span key={name}>{name}<button type="button" onClick={()=>removeDutyTeacher(name)} aria-label={`Buang ${name}`}><X size={14}/></button></span>)}</div>}<div className="duty-teacher-search" role="combobox" aria-expanded={staffPickerOpen} aria-controls="duty-teacher-options"><Search size={17}/><input type="search" value={staffSearch} onFocus={()=>setStaffPickerOpen(true)} onChange={(event)=>{setStaffSearch(event.target.value);setStaffPickerOpen(true);}} placeholder="Taip nama, contoh Azwan" aria-label="Cari nama guru bertugas" autoComplete="off"/><button type="button" onClick={()=>setStaffPickerOpen((open)=>!open)} aria-label={staffPickerOpen?"Tutup senarai guru":"Buka senarai guru"}><ChevronDown size={17}/></button></div>{staffPickerOpen&&<div id="duty-teacher-options" className="duty-teacher-options" role="listbox" aria-multiselectable="true">{staffLoading?<p>Membaca senarai pengguna…</p>:staffError?<div className="duty-teacher-error"><p>{staffError}</p><button type="button" onClick={()=>{setStaffError("");setStaffUsers([]);}}>Cuba semula</button></div>:staffMatches.length?staffMatches.map((staff)=><button type="button" role="option" aria-selected="false" key={staff.id} onClick={()=>addDutyTeacher(staff)}><span>{staff.name}</span><small>{staff.position||"Warga sekolah"}{staff.grade?` · ${staff.grade}`:""}</small></button>):<p>{staffSearch?"Tiada nama yang sepadan.":"Semua nama telah dipilih."}</p>}<button className="duty-teacher-done" type="button" onClick={()=>setStaffPickerOpen(false)}>Selesai memilih</button></div>}<input type="hidden" value={form.teachers}/></div><div className="duty-grid three"><label>Bilangan guru<input type="number" min="0" value={form.teacherTotal} onChange={(event)=>setForm((current)=>({...current,teacherTotal:event.target.value}))}/></label><label>Hadir<input type="number" min="0" value={form.teacherPresent} onChange={(event)=>setForm((current)=>({...current,teacherPresent:event.target.value}))}/></label><label>Tidak hadir<input type="number" min="0" value={form.teacherAbsent} onChange={(event)=>setForm((current)=>({...current,teacherAbsent:event.target.value}))}/></label></div></section>
      <section className="duty-section duty-section-clean"><div className="duty-section-head"><span>02</span><div><h3>Kebersihan & keceriaan</h3><p>Semua ditetapkan “Baik”. Ubah tahap atau tambah catatan hanya jika perlu.</p></div></div><div className="duty-location-list">{cleanlinessLocations.map((location)=><div className="duty-location-row" key={location}><strong>{location}</strong><div className="duty-rating-buttons">{["Baik","Memuaskan","Lemah"].map((rating)=><button type="button" key={rating} className={details.locationRatings[location]===rating?"active":""} onClick={()=>setDetails((current)=>({...current,locationRatings:{...current.locationRatings,[location]:rating}}))}>{rating}</button>)}</div><textarea rows={1} className="duty-location-note" value={details.locationNotes?.[location]||""} onInput={(event)=>{const field=event.currentTarget;field.style.height="auto";field.style.height=`${field.scrollHeight}px`;}} onChange={(event)=>setDetails((current)=>({...current,locationNotes:{...(current.locationNotes||{}),[location]:event.target.value}}))} placeholder="Catatan jika ada" aria-label={`Catatan ${location}`}/></div>)}</div></section>
      <section className="duty-section"><div className="duty-section-head"><span>03</span><div><h3>Disiplin & keselamatan</h3><p>Catatan kes hanya muncul apabila diperlukan.</p></div></div><div className="duty-toggle"><button type="button" className={details.disciplineControlled?"active":""} onClick={()=>setDetails((current)=>({...current,disciplineControlled:true}))}>Disiplin terkawal</button><button type="button" className={!details.disciplineControlled?"alert active":""} onClick={()=>setDetails((current)=>({...current,disciplineControlled:false}))}>Ada kes disiplin</button></div>{!details.disciplineControlled&&<div className="duty-conditional"><label>Jenis / kes<input value={details.disciplineCaseType} onChange={(event)=>setDetails((current)=>({...current,disciplineCaseType:event.target.value}))}/></label><label>Murid terlibat<textarea value={details.disciplineStudents} onChange={(event)=>setDetails((current)=>({...current,disciplineStudents:event.target.value}))}/></label><label>Tindakan yang diambil<textarea value={details.disciplineAction} onChange={(event)=>setDetails((current)=>({...current,disciplineAction:event.target.value}))}/></label></div>}<div className="duty-grid">{statusField("Tahap keselamatan","safetyStatus")}{statusField("Keadaan kantin","canteenStatus")}</div></section>
      <section className="duty-section"><div className="duty-section-head"><span>04</span><div><h3>Kesihatan & urusan hospital</h3><p>Kekalkan 0 jika tiada kes.</p></div></div><div className="duty-number-grid"><label>Ke hospital — Lelaki<input type="number" min="0" value={details.hospitalMale} onChange={(event)=>setDetails((current)=>({...current,hospitalMale:event.target.value}))}/></label><label>Ke hospital — Perempuan<input type="number" min="0" value={details.hospitalFemale} onChange={(event)=>setDetails((current)=>({...current,hospitalFemale:event.target.value}))}/></label><label>Bilik kesihatan — Lelaki<input type="number" min="0" value={details.healthRoomMale} onChange={(event)=>setDetails((current)=>({...current,healthRoomMale:event.target.value}))}/></label><label>Bilik kesihatan — Perempuan<input type="number" min="0" value={details.healthRoomFemale} onChange={(event)=>setDetails((current)=>({...current,healthRoomFemale:event.target.value}))}/></label></div>{Number(details.hospitalMale)+Number(details.hospitalFemale)>0&&<div className="duty-conditional duty-grid"><label>Guru pengiring<input value={details.hospitalTeacher} onChange={(event)=>setDetails((current)=>({...current,hospitalTeacher:event.target.value}))}/></label><label>Pemandu / kenderaan<input value={details.hospitalDriver} onChange={(event)=>setDetails((current)=>({...current,hospitalDriver:event.target.value}))}/></label></div>}</section>
      <section className="duty-section duty-section-wide"><div className="duty-section-head"><span>05</span><div><h3>Pemantauan, pelawat & peristiwa semasa</h3><p>Lengkapkan hanya jika berlaku.</p></div></div><div className="duty-grid"><label>Agensi pemantauan<select value={details.monitoringAgency} onChange={(event)=>setDetails((current)=>({...current,monitoringAgency:event.target.value}))}>{["Tiada","PPD","SPI","JPN","BPI","KPM","Lain-lain"].map((agency)=><option key={agency}>{agency}</option>)}</select></label><label>Butiran pemantauan / pelawat<input value={details.monitoringDetail} onChange={(event)=>setDetails((current)=>({...current,monitoringDetail:event.target.value}))}/></label></div><label>Aktiviti, lawatan atau peristiwa semasa<textarea value={form.activityNote} onChange={(event)=>setForm((current)=>({...current,activityNote:event.target.value}))}/></label><label>Isu semasa / perkara yang memerlukan tindakan<textarea value={details.currentIssue} onChange={(event)=>setDetails((current)=>({...current,currentIssue:event.target.value}))}/></label><label>Ulasan guru bertugas / hal-hal lain<textarea value={form.generalNote} onChange={(event)=>setForm((current)=>({...current,generalNote:event.target.value}))}/></label></section>
      <section className="duty-section duty-signoff"><div className="duty-section-head"><span>06</span><div><h3>Pengesahan laporan</h3><p>Nama ini dipaparkan pada PDF rasmi.</p></div></div><div className="duty-grid"><label>Disediakan oleh<input value={form.preparedBy} onChange={(event)=>setForm((current)=>({...current,preparedBy:event.target.value}))} required/></label><label>Disemak oleh<input value={details.reviewedBy} onChange={(event)=>setDetails((current)=>({...current,reviewedBy:event.target.value}))} required/></label></div><div className="duty-completion"><span>✓</span><div><strong>Sedia untuk pratonton PDF</strong><small>Semak rupa laporan sebelum disimpan.</small></div></div></section>
      <button className="duty-primary duty-submit-complete" disabled={dailyRendering}>{dailyRendering?"Menjana PDF…":"Pratonton PDF laporan harian"}</button>
    </form>:weeklyPreviewUrl?<article className="opr-preview pdf-review duty-pdf-review"><div className="pdf-review-head"><div><span>PRATONTON PDF LAPORAN MINGGUAN</span><h3>Minggu {week}</h3><p>Rumusan dibina daripada laporan harian dan menggunakan reka bentuk OPR rasmi.</p></div><a href={weeklyPreviewUrl} download={`${year}-Minggu-${week}-Laporan-Mingguan-Guru-Bertugas.pdf`}>Muat turun semakan</a></div><div className="pdf-preview-stage"><iframe src={weeklyPreviewUrl} title="Pratonton PDF laporan mingguan"/></div><div className="drive-destination"><span>◈</span><div><strong>Destinasi Google Drive</strong><small>Pengurusan › Laporan Guru Bertugas › Laporan Mingguan › Minggu {week}</small></div></div>{weeklySavedUrl&&<p className="drive-success">✓ Laporan telah difailkan. <a href={weeklySavedUrl} target="_blank" rel="noreferrer">Buka PDF di Google Drive</a></p>}<div className="preview-confirmation"><span>✓</span><p><strong>Sudah semak pratonton?</strong><small>PDF ini akan muncul dalam folder Minggu {week} pada dashboard.</small></p></div><div className="generator-actions"><button onClick={()=>{setWeeklyPdfBase64("");setWeeklySavedUrl("");if(weeklyPreviewUrl)URL.revokeObjectURL(weeklyPreviewUrl);setWeeklyPreviewUrl("");}} disabled={weeklySending}>Ubah rumusan</button><button className="save" onClick={()=>void saveWeekly()} disabled={weeklySending||Boolean(weeklySavedUrl)}>{weeklySending?"Menyimpan…":weeklySavedUrl?"Sudah disimpan":"Simpan PDF mingguan"}</button></div></article>:<div className="weekly-builder"><div className="weekly-tools"><label>Pilih minggu daripada laporan harian<select value={week?`${year}-${String(week).padStart(2,"0")}`:""} onChange={(event)=>{const selected=weekGroups.find(group=>group.key===event.target.value);if(selected){setWeek(selected.week);setYear(selected.year);}}}><option value="">Pilih minggu</option>{weekGroups.filter(group=>groupDailyCount(group)>0).map(group=><option key={group.key} value={group.key}>Minggu {group.week} · {group.year} · {groupDailyCount(group)} laporan harian</option>)}</select></label><button onClick={()=>void loadWeek()} disabled={loading||!week}>{loading?"Membaca…":"Segarkan"}</button></div><div className="school-days">{week?dutyWeekDates(year,week,reports).map((date)=>{const record=reports.find((item)=>item.reportDate===date);const isHoliday=dayStates[date]==="Cuti / Tiada persekolahan";return <article key={date} className={isHoliday?"is-holiday":record?"is-complete":"is-pending"}><div><strong>{new Intl.DateTimeFormat("ms-MY",{weekday:"long"}).format(new Date(`${date}T12:00:00`))}</strong><small>{new Intl.DateTimeFormat("ms-MY",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${date}T12:00:00`))}</small></div><span className="school-day-status">{record?"Laporan lengkap":isHoliday?"Hari cuti":"Belum ada laporan"}</span><label className="school-day-holiday"><input type="checkbox" checked={isHoliday} disabled={Boolean(record)} onChange={(event)=>{setDayStates((current)=>({...current,[date]:event.target.checked?"Cuti / Tiada persekolahan":"Belum lengkap"}));setSummary("");setWeeklyPdfBase64("");}}/><span>{record?record.preparedBy:"Tandakan hari cuti"}</span></label></article>}):null}</div>{!loading&&!reports.length&&<p className="drive-list-state">Pilih minggu yang mempunyai laporan harian. Lima hari Isnin hingga Jumaat akan dipaparkan.</p>}<button className="duty-primary" onClick={makeSummary} disabled={!reports.length}>Jana rumusan daripada laporan harian</button>{summary&&<section className="weekly-summary"><h3>Semak rumusan</h3><textarea value={summary} onChange={(event)=>setSummary(event.target.value)} rows={12}/><div><button onClick={()=>setSummary("")}>Jana semula</button><button className="save" onClick={()=>void prepareWeeklyPreview()} disabled={weeklyRendering}>{weeklyRendering?"Menjana PDF…":"Pratonton PDF mingguan"}</button></div></section>}</div>}
  </div>;
}

function OprGenerator({ notify, close, user, initialCategoryGroup="" }: { notify: (message: string) => void; close: () => void; user:PortalIdentity|null; initialCategoryGroup?:string }) {
  const [enhancing, setEnhancing] = useState(false);
  const [sending, setSending] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [details, setDetails] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [categorySearch, setCategorySearch] = useState(initialCategoryGroup&&initialCategoryGroup!=="Lain-lain"?`${initialCategoryGroup} ›`:"");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(Boolean(initialCategoryGroup&&initialCategoryGroup!=="Lain-lain"));
  const [mediaFiles, setMediaFiles] = useState<Array<{ id:string; file:File; previewUrl:string; kind:string }>>([]);
  const [competition,setCompetition]=useState({enabled:false,name:"",participantType:"Pasukan sekolah",representsSchool:"Ya",participantName:"",level:"Daerah",achievement:"Penyertaan",recognitionStatus:"Belum pasti",officialResultStatus:"Belum diterima"});
  const [external,setExternal]=useState({enabled:false,partyType:"Ibu bapa / penjaga",partyName:"",involvementType:"Kehadiran program",invitedCount:"",attendanceCount:"",contributionType:"Tiada",contributionValue:""});
  const [form, setForm] = useState({
    title: "", category: initialCategoryGroup==="Lain-lain"?"Lain-lain":"Kurikulum · Bahasa · Bahasa Melayu", manualCategory: "", date: new Date().toISOString().slice(0, 10), venue: "", organiser: "", objective: "", outcome: "",
    preparedBy: user?.name||"", preparedRole: user?.position||"", verifier: "Wan Harun Bin Wan Ali|Pengetua", manualVerifier: "", manualVerifierRole: "",
  });

  const verifiers = [
    ["Wan Harun Bin Wan Ali", "Pengetua"],
    ["Suriha Binti Sadi", "Guru Penolong Kanan Pentadbiran"],
    ["SHAMSUL HAZLAN BIN MUHAMMAD KAMAL HAKIM", "Guru Penolong Kanan Hal Ehwal Murid"],
    ["MUHAMAD SHUKRI BIN ABDUL GHANI", "Guru Penolong Kanan Kokurikulum"],
    ["MOHD FADIL BIN ABDULLAH", "Guru Penolong Kanan Tingkatan Enam"],
  ] as const;
  const [verifiedName, verifiedRole] = form.verifier === "manual" ? [form.manualVerifier, form.manualVerifierRole] : form.verifier.split("|");
  const dayName = form.date ? new Intl.DateTimeFormat("ms-MY", { weekday: "long" }).format(new Date(`${form.date}T12:00:00`)) : "";
  const categoryOptions = oprCategoryGroups.flatMap((group) => group.options.map((option) => ({ value:group.label === "Lain-lain" ? option : `${group.label} · ${option}`, label:group.label === "Lain-lain" ? option : `${group.label} › ${option}` })));
  const categoryMatches = categorySearch.trim() ? categoryOptions.filter((option) => option.label.toLowerCase().includes(categorySearch.trim().toLowerCase())) : categoryOptions;
  const effectiveCategory = form.category === "Lain-lain" && form.manualCategory.trim() ? `Lain-lain · ${tidyTitleCase(form.manualCategory).replace(/[<>]/g,"").slice(0,80)}` : form.category;
  const imageMedia=mediaFiles.filter((item)=>item.file.type.startsWith("image/"));
  const documentMedia=mediaFiles.filter((item)=>item.file.type==="application/pdf");

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const tidyField = (field: keyof typeof form) => setForm((current) => ({ ...current, [field]: tidyTitleCase(current[field]) }));
  const setCompetitionField=(field:keyof typeof competition,value:string|boolean)=>setCompetition((current)=>({...current,[field]:value}));
  const setExternalField=(field:keyof typeof external,value:string|boolean)=>setExternal((current)=>({...current,[field]:value}));
  const enhance = async () => {
    if (!details.trim()) return notify("Masukkan ringkasan program dahulu");
    setAiMessage("");
    setEnhancing(true);
    try {
      const response = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: details, title: form.title, category: effectiveCategory, objective: form.objective, outcome: form.outcome }) });
      const data = await response.json() as { details?: string; objective?: string; outcome?: string; error?: string };
      if (!response.ok || !data.details) throw new Error(data.error || "Gemini tidak dapat memproses permintaan");
      setDetails(data.details);
      setForm((current) => ({ ...current, objective: data.objective || current.objective, outcome: data.outcome || current.outcome }));
      setAiMessage("✓ Kandungan berjaya dijana dan dimasukkan ke dalam borang.");
      notify("Pelaksanaan, objektif dan hasil diperkemas oleh Gemini AI");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sambungan Gemini belum tersedia";
      setAiMessage(`⚠ ${message}`);
      notify(message);
    } finally {
      setEnhancing(false);
    }
  };

  const competitionComplete=!competition.enabled||Boolean(competition.name&&competition.participantType&&competition.participantName&&competition.level&&competition.achievement&&form.organiser);
  const externalComplete=!external.enabled||Boolean(external.partyType&&external.partyName&&external.involvementType);
  const complete = Boolean(form.title && form.date && form.venue && details && form.preparedBy && form.preparedRole && verifiedName && verifiedRole && (form.category !== "Lain-lain" || form.manualCategory.trim())&&competitionComplete&&externalComplete);
  const safeName = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, " ").trim() || "OPR";
  const fileToDataUrl = (file: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  const fileToBase64 = async (file: Blob) => (await fileToDataUrl(file)).split(",")[1] || "";
  const optimisePhoto = (file: File) => new Promise<File>((resolve, reject) => {
    const image = new Image(); const source = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(source); reject(new Error("Gambar tidak dapat diproses")); return; }
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { URL.revokeObjectURL(source); if (!blob) return reject(new Error("Gambar tidak dapat dimampatkan")); resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: Date.now() })); }, "image/jpeg", .78);
    };
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("Gambar tidak dapat dibaca")); };
    image.src = source;
  });
  const selectMedia=async(files:File[])=>{
    const selected=files.slice(0,6);
    if(files.length>6)notify("Maksimum 6 fail dipilih");
    if(selected.some((file)=>!(["application/pdf","image/jpeg","image/png"].includes(file.type))))return notify("Hanya fail PDF, JPG dan PNG dibenarkan");
    if(selected.some((file)=>file.size>6_000_000))return notify("Setiap fail mestilah 6 MB atau kurang");
    try{
      const processed=await Promise.all(selected.map(async(file)=>{
        const prepared=file.type==="application/pdf"?file:await optimisePhoto(file);
        return{id:crypto.randomUUID(),file:prepared,previewUrl:prepared.type.startsWith("image/")?URL.createObjectURL(prepared):"",kind:prepared.type==="application/pdf"?"Sijil / dokumen PDF":"Gambar aktiviti"};
      }));
      setMediaFiles((current)=>{current.forEach((item)=>item.previewUrl&&URL.revokeObjectURL(item.previewUrl));return processed;});
      notify(`${processed.length} fail telah disediakan untuk laporan`);
    }catch{notify("Satu atau lebih fail tidak dapat diproses");}
  };
  const makePdf = async () => {
    const jsPDF = await loadJsPdf();
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    pdf.setProperties({ title: form.title, subject: "One Page Report SMK Agama Pahang", author: form.preparedBy, creator: "Portal Rasmi SMKAP" });
    const navy = [22, 54, 82] as const, headerBlue = [201, 230, 247] as const, glassBlue = [231, 245, 253] as const;
    const maroon = [45, 119, 165] as const, gold = [82, 157, 199] as const;
    const muted = [78, 105, 124] as const, pale = [239, 247, 252] as const;
    const x = 12, pageWidth = 210, contentWidth = 186;
    pdf.setFillColor(...headerBlue); pdf.rect(0, 0, pageWidth, 40, "F");
    pdf.setFillColor(...glassBlue); pdf.circle(187, 3, 28, "F"); pdf.circle(158, 1, 17, "F");
    pdf.setFillColor(218, 238, 250); pdf.roundedRect(3, 3, 204, 33, 7, 7, "F");
    pdf.setFillColor(235, 247, 253); pdf.circle(198, 31, 26, "F");
    pdf.setDrawColor(153, 199, 225); pdf.roundedRect(3, 3, 204, 33, 7, 7, "S");
    pdf.setFillColor(...maroon); pdf.rect(0, 38, pageWidth, 1.4, "F");
    pdf.setFillColor(124, 184, 216); pdf.rect(0, 39.4, pageWidth, 0.6, "F");
    try {
      const logoData = await fileToDataUrl(await (await fetch("/logo-smkap.png")).blob());
      pdf.addImage(logoData, "PNG", 8, 8, 63, 17, undefined, "FAST");
    } catch {}
    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16);
    pdf.text("SMK AGAMA PAHANG", 76, 14);
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.text("MUADZAM SHAH, PAHANG", 76, 20);
    pdf.setTextColor(...gold); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.text("ONE PAGE REPORT (OPR)", 76, 28);
    pdf.setFontSize(7); pdf.setTextColor(58, 91, 116); pdf.text(`DIJANA: ${new Date().toLocaleDateString("ms-MY")}`, 198, 11, { align: "right" });
    pdf.text(`RUJUKAN: OPR/${effectiveCategory.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase()}/${form.date.replace(/-/g, "")}`, 198, 16, { align: "right" });

    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
    const titleLines = pdf.splitTextToSize(form.title.toUpperCase(), contentWidth);
    pdf.text(titleLines.slice(0, 2), x, 49);
    const titleBottom = 49 + Math.min(titleLines.length, 2) * 6;

    const metaY = titleBottom + 2, boxW = 35.6, gap = 2;
    const meta = [["BIDANG", effectiveCategory], ["TARIKH", form.date], ["HARI", dayName], ["TEMPAT", form.venue], ["ANJURAN", form.organiser || "-"]];
    meta.forEach(([label, value], index) => {
      const bx = x + index * (boxW + gap);
      pdf.setFillColor(...pale); pdf.roundedRect(bx, metaY, boxW, 17, 2, 2, "F");
      pdf.setTextColor(...maroon); pdf.setFontSize(6.8); pdf.setFont("helvetica", "bold"); pdf.text(label, bx + 3, metaY + 5);
      pdf.setTextColor(...navy); pdf.setFontSize(8.2); pdf.text(pdf.splitTextToSize(value, boxW - 6).slice(0, 2), bx + 3, metaY + 10);
    });

    const section = (heading: string, value: string, sx: number, sy: number, sw: number, sh: number) => {
      pdf.setDrawColor(220, 225, 230); pdf.setFillColor(255, 255, 255); pdf.roundedRect(sx, sy, sw, sh, 2, 2, "FD");
      pdf.setFillColor(...maroon); pdf.roundedRect(sx, sy, sw, 8, 2, 2, "F"); pdf.rect(sx, sy + 5, sw, 3, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text(heading, sx + 3, sy + 5.3);
      pdf.setTextColor(48, 56, 66); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.2);
      const lines = pdf.splitTextToSize(value || "Belum dinyatakan.", sw - 6);
      pdf.text(lines.slice(0, Math.max(2, Math.floor((sh - 12) / 4.1))), sx + 3, sy + 13, { lineHeightFactor: 1.25 });
    };
    const extraInformation:string[]=[];
    if(competition.enabled)extraInformation.push(`PERTANDINGAN: ${competition.name} · ${competition.participantType}: ${competition.participantName} · ${competition.level} · ${competition.achievement}`);
    if(external.enabled)extraInformation.push(`PELIBATAN LUAR: ${external.partyType} · ${external.partyName} · ${external.involvementType}${external.contributionType!=="Tiada"?` · ${external.contributionType}`:""}`);
    const extraHeight=extraInformation.length?20:0;
    if(extraInformation.length){
      const extraY=metaY+21;
      pdf.setDrawColor(183,214,224);pdf.setFillColor(235,248,249);pdf.roundedRect(x,extraY,contentWidth,16,2,2,"FD");
      pdf.setTextColor(...maroon);pdf.setFont("helvetica","bold");pdf.setFontSize(6.8);pdf.text("MAKLUMAT TAMBAHAN",x+3,extraY+5);
      pdf.setTextColor(...navy);pdf.setFont("helvetica","normal");pdf.setFontSize(7.1);
      pdf.text(pdf.splitTextToSize(extraInformation.join("\n"),contentWidth-6).slice(0,3),x+3,extraY+10,{lineHeightFactor:1.15});
    }
    const contentY = metaY + 21 + extraHeight;
    section("PELAKSANAAN PROGRAM", details, x, contentY, contentWidth, 45);
    section("OBJEKTIF", form.objective, x, contentY + 49, 91, 32);
    section("HASIL / IMPAK", form.outcome, x + 95, contentY + 49, 91, 32);

    const photoY = contentY + 85, photoH = 80-extraHeight;
    pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text(documentMedia.length?`DOKUMENTASI PROGRAM · ${documentMedia.length} LAMPIRAN PDF DISERTAKAN`:"DOKUMENTASI PROGRAM", x, photoY);
    pdf.setDrawColor(220, 225, 230); pdf.setFillColor(...pale); pdf.roundedRect(x, photoY + 3, contentWidth, photoH, 2, 2, "FD");
    if (imageMedia.length) {
      const shown = imageMedia.slice(0, 4), cols = shown.length === 1 ? 1 : 2, rows = Math.ceil(shown.length / cols);
      const cellW = (contentWidth - 6 - (cols - 1) * 3) / cols, cellH = (photoH - 6 - (rows - 1) * 3) / rows;
      for (let index = 0; index < shown.length; index++) {
        const data = await fileToDataUrl(shown[index].file); const px = x + 3 + (index % cols) * (cellW + 3); const py = photoY + 6 + Math.floor(index / cols) * (cellH + 3);
        pdf.setFillColor(255, 255, 255); pdf.setDrawColor(203, 210, 216); pdf.roundedRect(px, py, cellW, cellH, 1.5, 1.5, "FD");
        const innerW = cellW - 4, innerH = cellH - 4;
        const props = pdf.getImageProperties(data); const ratio = Math.min(innerW / props.width, innerH / props.height);
        const iw = props.width * ratio, ih = props.height * ratio;
        pdf.addImage(data, shown[index].file.type === "image/png" ? "PNG" : "JPEG", px + (cellW - iw) / 2, py + (cellH - ih) / 2, iw, ih, undefined, "FAST");
        pdf.setFillColor(...maroon); pdf.circle(px + 4, py + 4, 2.6, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.text(String(index + 1), px + 4, py + 4.8, { align: "center" });
      }
    } else {
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "italic"); pdf.setFontSize(8); pdf.text("Tiada gambar program dilampirkan.", pageWidth / 2, photoY + 35, { align: "center" });
    }

    const signY = photoY + photoH + 9, signW = 90;
    [["DISEDIAKAN OLEH", form.preparedBy.toLocaleUpperCase("ms-MY"), form.preparedRole.toLocaleUpperCase("ms-MY")], ["DISAHKAN OLEH", verifiedName.toLocaleUpperCase("ms-MY"), verifiedRole.toLocaleUpperCase("ms-MY")]].forEach(([label, name, role], index) => {
      const sx = x + index * 96; pdf.setDrawColor(220, 225, 230); pdf.roundedRect(sx, signY, signW, 25, 2, 2, "S");
      pdf.setTextColor(...maroon); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.8); pdf.text(label, sx + 4, signY + 6);
      pdf.setTextColor(...navy); pdf.setFontSize(8); pdf.text(pdf.splitTextToSize(name, signW - 8).slice(0, 2), sx + 4, signY + 12);
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.text(pdf.splitTextToSize(role, signW - 8).slice(0, 2), sx + 4, signY + 20);
    });
    pdf.setFillColor(...maroon); pdf.rect(0, 289, pageWidth, 8, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(6.5);
    pdf.text("Portal Rasmi SMK Agama Pahang | Dokumen dijana secara digital", 12, 294);
    pdf.text("SMKAP", 198, 294, { align: "right" });
    const blob = pdf.output("blob");
    return { base64: await fileToBase64(blob), url: URL.createObjectURL(blob) };
  };
  const preparePreview = async () => {
    setRendering(true);
    try {
      const generated = await makePdf();
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfBase64(generated.base64); setPdfPreviewUrl(generated.url); setPreview(true); setDriveUrl("");
    } catch { notify("Pratonton PDF tidak dapat dijana"); }
    finally { setRendering(false); }
  };
  const sendToDrive = async () => {
    if (!pdfBase64 || !pdfPreviewUrl) return notify("Sila jana dan semak pratonton PDF dahulu");
    setSending(true);setDriveUrl("");
    try{
      const base=`${form.date}-${safeName(form.title)}`;
      const pdfBase=`${base}__PENYEDIA__${safeName(form.preparedBy)}`;
      const files=[{name:`${pdfBase}.pdf`,mimeType:"application/pdf",base64:pdfBase64}];
      for(let index=0;index<mediaFiles.length;index++){
        const media=mediaFiles[index],extension=media.file.type==="application/pdf"?"pdf":media.file.type==="image/png"?"png":"jpg";
        files.push({name:`${base}__LAMPIRAN__${safeName(media.kind)}-${index+1}.${extension}`,mimeType:media.file.type||"application/octet-stream",base64:await fileToBase64(media.file)});
      }
      const metadata={
        title:form.title,programDate:form.date,createdBy:user?.email||"",
        competition:{...competition},
        external:{...external},
        attachments:mediaFiles.map((item)=>({name:item.file.name,type:item.file.type,kind:item.kind})),
      };
      const response=await fetch("/api/drive",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:effectiveCategory,files,metadata})});
      const result=await response.json() as{error?:string;files?:OprReport[]};
      if(!response.ok||!result.files?.[0])throw new Error(result.error||"Penghantaran tidak berjaya");
      const saved=result.files[0];rememberOprReport(saved);setDriveUrl(saved.viewUrl);notify("OPR berjaya disimpan ke Google Drive sekolah");
    }catch(error){notify(error instanceof Error?error.message:"OPR tidak dapat dihantar");}
    finally{setSending(false);}
  };
  return <div className="opr-generator">
    <span className="modal-overline">PENJANA OPR RASMI SMKAP</span>
    <h2 id="folder-title">Cipta OPR baharu</h2>
    <p>Isi maklumat program, kemaskan penulisan dan semak laporan sebelum disimpan.</p>
    <div className="generator-steps" aria-label="Aliran penciptaan OPR"><b>1</b><span>Maklumat</span><i></i><b>2</b><span>Perincian</span><i></i><b>3</b><span>Semakan</span></div>

    {!preview ? <form className="generator-form" onSubmit={(event) => { event.preventDefault(); if (complete) void preparePreview(); }}>
      <div className="generator-row">
        <label>Tajuk program<input value={form.title} onChange={(e) => setField("title", e.target.value)} onBlur={() => tidyField("title")} placeholder="Contoh: Program Ihya' Ramadan" required /></label>
        <div className="opr-category-field"><div className="opr-category-heading"><span>Bidang dan unit</span><b>Satu pilihan</b></div><div className="opr-category-current"><small>Pilihan semasa</small><strong>{form.category.replaceAll(" · "," › ")}</strong></div><small>Tekan untuk membuka semua unit atau taip nama untuk menapis senarai.</small><div className="duty-teacher-search" role="combobox" aria-expanded={categoryPickerOpen} aria-controls="opr-category-options"><Search size={17}/><input type="search" value={categorySearch} onFocus={()=>setCategoryPickerOpen(true)} onChange={(event)=>{setCategorySearch(event.target.value);setCategoryPickerOpen(true);}} placeholder="Taip nama unit, contoh Kelab Catur" aria-label="Cari bidang dan unit OPR" autoComplete="off"/><button type="button" onClick={()=>setCategoryPickerOpen((open)=>!open)} aria-label={categoryPickerOpen?"Tutup senarai bidang dan unit":"Buka senarai bidang dan unit"}><ChevronDown size={17}/></button></div>{categoryPickerOpen&&<div id="opr-category-options" className="duty-teacher-options opr-category-options" role="listbox">{categoryMatches.length?categoryMatches.map((option)=>{const parts=option.label.split(" › ");const unit=parts.pop()||option.label;return <button type="button" role="option" aria-selected={form.category===option.value} className={form.category===option.value?"selected":""} key={option.value} onClick={()=>{setField("category",option.value);if(option.value!=="Lain-lain")setField("manualCategory","");setCategorySearch("");setCategoryPickerOpen(false);}}><span>{unit}</span><small>{parts.join(" › ")||"Kategori umum"}</small></button>}):<><p>Tiada unit yang sepadan.</p><button type="button" className="manual-category-use" onClick={()=>{setField("category","Lain-lain");setField("manualCategory",tidyTitleCase(categorySearch));setCategorySearch("");setCategoryPickerOpen(false);}}>Gunakan “{categorySearch}” sebagai kategori manual</button></>}<button className="duty-teacher-done" type="button" onClick={()=>setCategoryPickerOpen(false)}>Tutup senarai</button></div>}</div>
      </div>
      {form.category==="Lain-lain"&&<label className="manual-category-field">Nama unit / kategori lain<input value={form.manualCategory} onChange={(event)=>setField("manualCategory",event.target.value)} onBlur={()=>tidyField("manualCategory")} placeholder="Contoh: Program Khas Sekolah" required/><small>OPR akan difailkan di bawah folder Lain-lain menggunakan nama ini.</small></label>}
      <div className="generator-row generator-four">
        <label>Tarikh<input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></label>
        <label>Hari<input value={dayName} readOnly aria-readonly="true" /></label>
        <label>Tempat<input value={form.venue} onChange={(e) => setField("venue", e.target.value)} onBlur={() => tidyField("venue")} placeholder="Dewan / lokasi" required /></label>
        <label>Anjuran<input value={form.organiser} onChange={(e) => setField("organiser", e.target.value)} onBlur={() => tidyField("organiser")} placeholder="Unit / panitia" /></label>
      </div>
      <fieldset className={`opr-conditional-card${competition.enabled?" is-open":""}`}><legend>Maklumat aktiviti</legend><label className="opr-form-switch"><input type="checkbox" checked={competition.enabled} onChange={(event)=>setCompetitionField("enabled",event.target.checked)}/><span><strong>Aktiviti ini melibatkan pertandingan atau pencapaian</strong><small>Tandakan hanya jika terdapat penyertaan, keputusan atau anugerah.</small></span></label>{competition.enabled&&<div className="opr-conditional-fields">
        <label>Nama pertandingan *<input value={competition.name} onChange={(event)=>setCompetitionField("name",event.target.value)} onBlur={()=>setCompetition((current)=>({...current,name:tidyTitleCase(current.name)}))} placeholder="Contoh: Pertandingan Inovasi STEAM" required/></label>
        <label>Jenis peserta *<select value={competition.participantType} onChange={(event)=>setCompetitionField("participantType",event.target.value)}><option>Guru</option><option>Murid</option><option>Pasukan sekolah</option><option>Sekolah</option></select></label>
        <label>Nama peserta / pasukan *<input value={competition.participantName} onChange={(event)=>setCompetitionField("participantName",event.target.value)} onBlur={()=>setCompetition((current)=>({...current,participantName:tidyTitleCase(current.participantName)}))} placeholder="Nama peserta atau pasukan" required/></label>
        <label>Mewakili sekolah?<select value={competition.representsSchool} onChange={(event)=>setCompetitionField("representsSchool",event.target.value)}><option>Ya</option><option>Tidak</option></select></label>
        <label>Peringkat *<select value={competition.level} onChange={(event)=>setCompetitionField("level",event.target.value)}><option>Sekolah</option><option>Zon</option><option>Daerah</option><option>Negeri</option><option>Kebangsaan</option><option>Antarabangsa</option></select></label>
        <label>Pencapaian *<select value={competition.achievement} onChange={(event)=>setCompetitionField("achievement",event.target.value)}><option>Johan</option><option>Naib Johan</option><option>Tempat Ketiga</option><option>Saguhati</option><option>Penyertaan</option><option>Anugerah Khas</option><option>Lain-lain</option></select></label>
        <label>Pengiktirafan pertandingan<select value={competition.recognitionStatus} onChange={(event)=>setCompetitionField("recognitionStatus",event.target.value)}><option>Diiktiraf KPM / agensi berkaitan</option><option>Belum pasti</option><option>Tidak berkaitan</option></select></label>
        <label>Status keputusan rasmi<select value={competition.officialResultStatus} onChange={(event)=>setCompetitionField("officialResultStatus",event.target.value)}><option>Belum diterima</option><option>Telah diterima</option><option>Tidak berkaitan</option></select></label>
      </div>}</fieldset>
      <label>Ringkasan pelaksanaan<textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Terangkan aktiviti yang dijalankan, kumpulan sasaran dan perjalanan program..." required /></label>
      <button type="button" className="generator-ai" onClick={enhance} disabled={enhancing}><span>✦</span><span>{enhancing ? "Gemini sedang menulis..." : "Jana pelaksanaan, objektif & hasil dengan Gemini AI"}<small>AI mengekalkan fakta asal dan mengemaskan ketiga-tiga bahagian</small></span></button>
      {aiMessage && <p className={`ai-status ${aiMessage.startsWith("✓") ? "success" : "error"}`} role="status">{aiMessage}</p>}
      <div className="generator-row">
        <label>Objektif<textarea rows={2} value={form.objective} onChange={(e) => setField("objective", e.target.value)} placeholder="Objektif utama program" /></label>
        <label>Hasil / impak<textarea rows={2} value={form.outcome} onChange={(e) => setField("outcome", e.target.value)} placeholder="Hasil yang dicapai" /></label>
      </div>
      <fieldset className={`opr-conditional-card${external.enabled?" is-open":""}`}><legend>Pelibatan pihak luar</legend><label className="opr-form-switch"><input type="checkbox" checked={external.enabled} onChange={(event)=>setExternalField("enabled",event.target.checked)}/><span><strong>Aktiviti ini melibatkan ibu bapa, komuniti atau pihak luar</strong><small>Tandakan jika terdapat kehadiran, kepakaran, tajaan atau sumbangan.</small></span></label>{external.enabled&&<div className="opr-conditional-fields">
        <label>Kategori pihak terlibat *<select value={external.partyType} onChange={(event)=>setExternalField("partyType",event.target.value)}><option>Ibu bapa / penjaga</option><option>PIBG / KSIB</option><option>Alumni</option><option>Agensi awam</option><option>Syarikat swasta</option><option>NGO / pertubuhan</option><option>Institusi pendidikan</option><option>Komuniti</option><option>Individu</option></select></label>
        <label>Nama pihak / organisasi *<input value={external.partyName} onChange={(event)=>setExternalField("partyName",event.target.value)} onBlur={()=>setExternal((current)=>({...current,partyName:tidyTitleCase(current.partyName)}))} placeholder="Nama organisasi atau kumpulan" required/></label>
        <label>Bentuk pelibatan *<select value={external.involvementType} onChange={(event)=>setExternalField("involvementType",event.target.value)}><option>Kehadiran program</option><option>Khidmat kepakaran</option><option>Kerjasama program</option><option>Penajaan</option><option>Sumbangan</option><option>Biasiswa / bantuan</option><option>Lain-lain</option></select></label>
        <label>Jenis sumbangan<select value={external.contributionType} onChange={(event)=>setExternalField("contributionType",event.target.value)}><option>Tiada</option><option>Material</option><option>Bukan material</option><option>Kewangan</option><option>Perkhidmatan</option></select></label>
        <label>Bilangan dijemput<input type="number" min="0" inputMode="numeric" value={external.invitedCount} onChange={(event)=>setExternalField("invitedCount",event.target.value)} placeholder="Contoh: 120"/></label>
        <label>Bilangan hadir<input type="number" min="0" inputMode="numeric" value={external.attendanceCount} onChange={(event)=>setExternalField("attendanceCount",event.target.value)} placeholder="Contoh: 95"/></label>
        {external.contributionType!=="Tiada"&&<label>Nilai / keterangan sumbangan<input value={external.contributionValue} onChange={(event)=>setExternalField("contributionValue",event.target.value)} placeholder="Contoh: RM1,000 atau 10 buah komputer"/></label>}
      </div>}</fieldset>
      <label className="photo-drop">Gambar aktiviti, sijil atau dokumen<input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" multiple onChange={(event)=>void selectMedia(Array.from(event.target.files||[]))}/><span>＋ Pilih fail daripada peranti</span><small>Maksimum 6 fail · PDF, JPG atau PNG · gambar dioptimumkan automatik</small></label>
      {mediaFiles.length>0&&<div className="opr-media-list">{mediaFiles.map((media,index)=><article key={media.id}>{media.previewUrl?<img src={media.previewUrl} alt={`Pratonton ${media.file.name}`}/>:<span className="opr-pdf-badge">PDF</span>}<div><strong>{media.file.name}</strong><small>{(media.file.size/1_000_000).toFixed(2)} MB</small><select value={media.kind} onChange={(event)=>setMediaFiles((current)=>current.map((item)=>item.id===media.id?{...item,kind:event.target.value}:item))} aria-label={`Jenis fail ${media.file.name}`}><option>Gambar aktiviti</option><option>Sijil pencapaian</option><option>Keputusan rasmi</option><option>Surat pengesahan</option><option>Dokumen lain</option><option>Sijil / dokumen PDF</option></select></div><button type="button" onClick={()=>setMediaFiles((current)=>current.filter((item)=>{if(item.id===media.id&&item.previewUrl)URL.revokeObjectURL(item.previewUrl);return item.id!==media.id;}))} aria-label={`Buang ${media.file.name}`}>×</button><b>{index+1}</b></article>)}</div>}
      <fieldset className="signatory-fields"><legend>Penyedia dan pengesah OPR</legend><div className="generator-row"><label>Nama penyedia<input value={form.preparedBy} onChange={(e) => setField("preparedBy", e.target.value)} onBlur={() => tidyField("preparedBy")} placeholder="Nama penuh penyedia" required /></label><label>Jawatan penyedia<input value={form.preparedRole} onChange={(e) => setField("preparedRole", e.target.value)} onBlur={() => tidyField("preparedRole")} placeholder="Contoh: Guru Mata Pelajaran" required /></label></div><label>Pilih pengesah<select value={form.verifier} onChange={(e) => setField("verifier", e.target.value)}>{verifiers.map(([name, role]) => <option key={name} value={`${name}|${role}`}>{name} — {role}</option>)}<option value="manual">Isi pengesah secara manual</option></select></label>{form.verifier === "manual" && <div className="generator-row manual-verifier"><label>Nama pengesah<input value={form.manualVerifier} onChange={(e) => setField("manualVerifier", e.target.value)} onBlur={() => tidyField("manualVerifier")} placeholder="Nama penuh pengesah" required /></label><label>Jawatan pengesah<input value={form.manualVerifierRole} onChange={(e) => setField("manualVerifierRole", e.target.value)} onBlur={() => tidyField("manualVerifierRole")} placeholder="Jawatan pengesah" required /></label></div>}</fieldset>
      <div className="generator-actions"><button type="button" onClick={close}>Kembali</button><button className="save" disabled={!complete || rendering}>{rendering ? "Menjana PDF..." : "Pratonton PDF"} <span>→</span></button></div>
    </form> : <article className="opr-preview pdf-review">
      <div className="pdf-review-head"><div><span>PRATONTON PDF SEBENAR</span><h3>Semak sebelum simpan</h3><p>Pastikan tajuk, kandungan, gambar serta nama penyedia dan pengesah adalah betul.</p></div><a href={pdfPreviewUrl} download={`${form.date}-${safeName(form.title)}.pdf`}>Muat turun semakan</a></div>
      <div className="pdf-preview-stage">{pdfPreviewUrl ? <iframe src={pdfPreviewUrl} title="Pratonton PDF OPR rasmi" /> : <p>Pratonton sedang disediakan...</p>}</div>
      <div className="drive-destination"><span>◈</span><div><strong>Destinasi Google Drive</strong><small>Folder {effectiveCategory} · OPR Disahkan</small></div></div>
      {driveUrl && <p className="drive-success">✓ OPR telah difailkan. <a href={driveUrl} target="_blank" rel="noreferrer">Buka PDF di Google Drive</a></p>}
      <div className="preview-confirmation"><span>✓</span><p><strong>Sudah semak pratonton?</strong><small>Selepas disimpan, PDF akan dimasukkan ke folder bidang yang dipilih.</small></p></div>
      <div className="generator-actions"><button onClick={() => { setPreview(false); setPdfBase64(""); if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(""); }} disabled={sending}>Ubah maklumat</button><button className="save" onClick={sendToDrive} disabled={sending || Boolean(driveUrl) || !pdfBase64}>{sending ? "Menyimpan..." : driveUrl ? "Sudah disimpan" : "Simpan ke Google Drive"}</button></div>
    </article>}
  </div>;
}
