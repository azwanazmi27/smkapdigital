const root = document.getElementById("relief-root");
import { createTeacherReview } from './teacher-review.js';
import { createAttendanceControls } from './attendance-controls.js?v=mobile-attendance-2';

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));

const setInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(`${date}T12:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("ms-MY", {
    day: "numeric", month: "long", year: "numeric",
  });
};

const reportDate = (record) => record.endDate && record.endDate !== record.absenceDate
  ? `${formatDate(record.absenceDate)} – ${formatDate(record.endDate)}`
  : formatDate(record.absenceDate);

const coversSelectedDate = (record, selectedDate) => {
  if (!selectedDate) return true;
  const start = record.absenceDate || "";
  const end = record.endDate || start;
  return start <= selectedDate && selectedDate <= end;
};

const openSummaryPdf = async (selectedDate) => {
  const preview = window.open("", "_blank");
  if (!preview) return;
  preview.document.write("<title>Menyediakan PDF…</title><p style=\"font:16px Arial;padding:24px\">Menyediakan rumusan…</p>");
  try {
    const response = await fetch("/api/ekeberadaan?resource=absences", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Data tidak dapat dibaca.");
    const records = (payload.records || []).filter((record) => coversSelectedDate(record, selectedDate));
    const label = selectedDate ? `Tarikh: ${formatDate(selectedDate)}` : "Semua rekod ketidakhadiran";
    const rows = records.map((record, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(record.teacherName)}</td><td>${escapeHtml(reportDate(record))}</td><td>${escapeHtml(record.reason || "—")}</td><td>${escapeHtml(record.note?.trim() || "—")}</td></tr>`).join("")
      || '<tr><td colspan="5" class="empty">Tiada ketidakhadiran direkodkan.</td></tr>';
    preview.document.open();
    preview.document.write(`<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rumusan Keberadaan Guru SMK Agama Pahang</title><style>
      @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#101820;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.35}.document{max-width:269mm;margin:0 auto}h1{margin:0;padding:0 0 12px;border-bottom:2px solid #123f64;color:#123f64;font-size:19pt;letter-spacing:.01em;text-align:center}.subtitle{margin:22px 0 4px;font-size:13pt;font-weight:700;text-align:center}.date{margin:0 0 22px;text-align:center}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:9px 8px;border:1px solid #324a5c;text-align:left;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}th{color:#fff;background:#123f64;font-weight:700}th:first-child,td:first-child{width:6%;text-align:center}th:nth-child(2){width:25%}th:nth-child(3){width:20%}th:nth-child(4){width:17%}th:nth-child(5){width:32%}.empty{text-align:center;color:#52616d}footer{position:fixed;right:0;bottom:0;left:0;color:#56636d;font-size:9pt;text-align:center}.preview-actions{display:flex;justify-content:flex-end;gap:10px;max-width:269mm;margin:0 auto 18px}.preview-actions button{min-height:42px;padding:9px 15px;border:1px solid #123f64;border-radius:8px;font:700 10.5pt Arial;cursor:pointer}.close-preview{color:#123f64;background:#fff}.print-pdf{color:#fff;background:#123f64}@media print{.preview-actions{display:none}body{font-size:10.5pt}footer{position:fixed}}@media screen{body{padding:28px;background:#eef2f4}.document{min-height:180mm;padding:14mm;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.14)}}
    </style></head><body><div class="preview-actions"><button class="close-preview" type="button" onclick="window.close()">Tutup pratonton</button><button class="print-pdf" type="button" onclick="window.print()">Muat turun / Cetak PDF</button></div><main class="document"><h1>RUMUSAN KEBERADAAN GURU SMK AGAMA PAHANG</h1><p class="subtitle">Rumusan ketidakhadiran</p><p class="date">${escapeHtml(label)}</p><table><thead><tr><th>Bil.</th><th>Nama guru</th><th>Tarikh bercuti</th><th>Sebab</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></main><footer>Dijana daripada Portal SMKAP Digital</footer></body></html>`);
    preview.document.close();
  } catch (error) {
    preview.document.open();
    preview.document.write(`<title>Rumusan tidak tersedia</title><p style="font:16px Arial;padding:24px">${escapeHtml(error?.message || "Rumusan tidak dapat disediakan sekarang.")}</p>`);
    preview.document.close();
  }
};

const enhanceSummary = () => {
  const tools = root.querySelector(".history-tools");
  const dateInput = tools?.querySelector('input[type="date"]');
  const pdfButton = tools?.querySelector(".pdf-button");
  if (!tools || !dateInput || !pdfButton || tools.dataset.smkSummaryReady) return;
  tools.dataset.smkSummaryReady = "true";

  const modes = document.createElement("div");
  modes.className = "smk-summary-modes";
  modes.innerHTML = '<button type="button" data-mode="date">Ikut tarikh</button><button type="button" data-mode="all">Semua rekod</button>';
  tools.prepend(modes);
  const dateLabel = dateInput.closest("label");
  const dateSmall = dateLabel?.querySelector("small");
  if (dateSmall) dateSmall.textContent = "Pilih tarikh";
  const updateMode = () => {
    const selected = Boolean(dateInput.value);
    modes.querySelector('[data-mode="date"]').classList.toggle("active", selected);
    modes.querySelector('[data-mode="all"]').classList.toggle("active", !selected);
  };
  modes.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) return;
    if (button.dataset.mode === "all") setInputValue(dateInput, "");
    else if (!dateInput.value) dateInput.showPicker?.() || dateInput.focus();
    updateMode();
  });
  dateInput.addEventListener("change", updateMode);
  updateMode();
  pdfButton.textContent = "Pratonton / Muat turun PDF";
  pdfButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openSummaryPdf(dateInput.value);
  }, true);
};

const summaryObserver = new MutationObserver(enhanceSummary);
summaryObserver.observe(root, { childList: true, subtree: true });

const summaryStyle = document.createElement("style");
summaryStyle.textContent = `
  .teacher-review-panel{margin:20px 0;padding:20px;border:1px solid #8eaaa8;border-radius:16px;background:#f0f7f6;color:#173b43}
  .teacher-review-panel h2{font-size:22px}.teacher-review-panel p,.teacher-review-panel label,.teacher-review-panel summary{font-size:16px;line-height:1.5}
  .teacher-review-row{display:grid;gap:12px;padding:16px;margin-top:14px;border:1px solid #a9c5c3;border-radius:12px;background:#fff}
  .teacher-review-row strong{font-size:17px;overflow-wrap:anywhere}.teacher-review-row small{font-size:14px;overflow-wrap:anywhere}
  .teacher-review-row label{display:grid;gap:6px}.teacher-review-row select{width:100%;min-width:0;min-height:46px;padding:10px;font:inherit;border:1px solid #749591;border-radius:8px;color:#173b43;background:white}
  .teacher-review-panel button{min-height:44px;padding:10px 16px;font:700 15px/1.4 Arial;border:1px solid #337a72;border-radius:8px;color:#fff;background:#176b61;cursor:pointer}
  .teacher-review-panel button:disabled{opacity:.55;cursor:default}.teacher-review-actions{display:flex;gap:10px;flex-wrap:wrap}
  @media(max-width:640px){.teacher-review-panel{padding:14px}.teacher-review-actions button{width:100%}}
  .smk-summary-modes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .smk-summary-modes button{min-height:42px;padding:9px 14px;border:1px solid rgba(101,202,191,.42);border-radius:10px;color:#c8e5e1;background:#103946;font:700 14px/1.2 inherit;cursor:pointer}
  .smk-summary-modes button.active{color:#06303a;background:linear-gradient(135deg,#7bd8ce,#79c3df);border-color:transparent}
  @media(max-width:640px){.history-tools{align-items:stretch}.smk-summary-modes{width:100%}.smk-summary-modes button{flex:1}.history-tools .pdf-button{width:100%;justify-content:center}}
`;
document.head.append(summaryStyle);

const coordinatorStyle = document.createElement("style");
coordinatorStyle.textContent = `
  .smk-coordinator-admin,.smk-relief-pin-admin{padding:24px;margin:20px 0;background:#fff;border:1px solid #cadfd6;border-radius:16px;color:#173e36}.smk-coordinator-admin h2,.smk-relief-pin-admin h2{margin:0 0 8px;font-size:22px}.smk-coordinator-admin>p,.smk-relief-pin-admin>p{font-size:16px;line-height:1.5}.smk-coordinator-list{display:grid;gap:9px}.smk-coordinator-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.smk-coordinator-row input,.smk-coordinator-add input,.smk-relief-pin-admin input{min-width:0;min-height:44px;padding:9px 11px;border:1px solid #9bbfbc;border-radius:9px;color:#173b43;background:#fff;font:inherit}.smk-coordinator-row button,.smk-coordinator-add button,.smk-coordinator-save,.smk-relief-pin-admin button{min-height:44px;padding:10px 13px;border:1px solid #31776f;border-radius:9px;color:#fff;background:#176b61;font:800 14px Arial;cursor:pointer}.smk-coordinator-row button{border-color:#ae5660;background:#a6424e}.smk-coordinator-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:13px}.smk-coordinator-save{width:100%;margin-top:16px;background:#0f6070}.smk-coordinator-message,.smk-relief-pin-message{min-height:20px;margin-top:12px!important;color:#a03542;font-weight:700}.smk-coordinator-message.ok,.smk-relief-pin-message.ok{color:#176b61}.smk-relief-pin-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}.smk-relief-pin-fields label{display:grid;gap:5px;font-weight:700}.smk-relief-pin-admin button:disabled{opacity:.6;cursor:wait}@media(max-width:640px){.smk-coordinator-admin,.smk-relief-pin-admin{padding:16px}.smk-coordinator-add,.smk-relief-pin-fields{grid-template-columns:1fr}.smk-coordinator-add button{width:100%}}
`;
document.head.append(coordinatorStyle);

let savedCoordinators = [];
const coordinatorSelects = () => [...root.querySelectorAll("label.creator-field select, label.hub-coordinator select")].filter((select) => /Penyelaras bertugas/i.test(select.closest("label")?.textContent || ""));
const applyCoordinators = () => coordinatorSelects().forEach((select) => {
  if (!savedCoordinators.length || select.dataset.smkCoordinators === savedCoordinators.join("|")) return;
  const selected = select.value;
  select.replaceChildren(new Option(select.closest("label")?.classList.contains("creator-field") ? "Pilih nama penyelaras…" : "Pilih nama penyelaras", ""), ...savedCoordinators.map((name) => new Option(name, name)));
  select.dataset.smkCoordinators = savedCoordinators.join("|");
  if (savedCoordinators.includes(selected)) setInputValue(select, selected);
});
const loadCoordinators = async () => { try { const response = await fetch("/api/relief-legacy/coordinators", {cache:"no-store"}); const payload = await response.json(); savedCoordinators = Array.isArray(payload.coordinators) ? payload.coordinators : []; applyCoordinators(); } catch {} };
const coordinatorObserver = new MutationObserver(applyCoordinators);
coordinatorObserver.observe(root, {childList:true, subtree:true});

const addCoordinatorAdmin = () => {
  const target = root.querySelector(".summary-page.view-enter .admin-layout");
  if (!target || root.querySelector(".smk-coordinator-admin")) return;
  const panel = document.createElement("section"); panel.className = "smk-coordinator-admin";
  panel.innerHTML = `<h2>Penyelaras Relief</h2><p>Tambah, ubah atau buang nama penyelaras yang boleh dipilih semasa menjana jadual relief.</p><div class="smk-coordinator-list"></div><div class="smk-coordinator-add"><input aria-label="Nama penyelaras baharu" maxlength="120" placeholder="Nama penyelaras baharu"><button type="button">Tambah</button></div><p class="smk-coordinator-message" aria-live="polite"></p><button type="button" class="smk-coordinator-save">Simpan perubahan</button>`;
  target.before(panel);
  const list = panel.querySelector(".smk-coordinator-list"), message = panel.querySelector(".smk-coordinator-message"), input = panel.querySelector(".smk-coordinator-add input"), add = panel.querySelector(".smk-coordinator-add button"), save = panel.querySelector(".smk-coordinator-save");
  let names = [...savedCoordinators];
  const render = () => { list.replaceChildren(...names.map((name,index) => { const row=document.createElement("div"); row.className="smk-coordinator-row"; const field=document.createElement("input"); field.value=name; field.maxLength=120; field.setAttribute("aria-label",`Nama penyelaras ${index+1}`); field.oninput=()=>{names[index]=field.value;}; const remove=document.createElement("button"); remove.type="button"; remove.textContent="Buang"; remove.onclick=()=>{names=names.filter((_,i)=>i!==index);render();}; row.append(field,remove); return row; })); };
  const addName = () => {const value=input.value.trim().replace(/\s+/g," "); if(!value) return; names.push(value); input.value=""; render(); input.focus();}; add.onclick=addName; input.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();addName();}}; render();
  save.onclick = async () => { names = [...new Set(names.map((_,i)=>list.querySelectorAll("input")[i]?.value.trim().replace(/\s+/g," ")).filter(Boolean))]; if(!names.length){message.textContent="Tambah sekurang-kurangnya seorang penyelaras."; return;} const pin=window.prompt("Masukkan PIN pentadbir untuk simpan penyelaras relief:"); if(pin===null) return; save.disabled=true; message.className="smk-coordinator-message"; message.textContent="Menyimpan…"; try {const response=await fetch("/api/relief-legacy/coordinators",{method:"PUT",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({coordinators:names})}),payload=await response.json();if(!response.ok) throw new Error(payload.error||"Perubahan tidak dapat disimpan.");savedCoordinators=payload.coordinators||names;applyCoordinators();message.className="smk-coordinator-message ok";message.textContent="Senarai penyelaras telah dikemas kini.";}catch(error){message.textContent=error?.message||"Perubahan tidak dapat disimpan.";}finally{save.disabled=false;}};
};
const coordinatorAdminObserver = new MutationObserver(addCoordinatorAdmin);
coordinatorAdminObserver.observe(root, {childList:true, subtree:true});
const addReliefPinAdmin = () => {
  const target = root.querySelector(".summary-page.view-enter .admin-layout");
  if (!target || root.querySelector(".smk-relief-pin-admin")) return;
  const panel = document.createElement("section"); panel.className = "smk-relief-pin-admin";
  panel.innerHTML = `<h2>PIN E-Keberadaan &amp; E-Relief</h2><p>Satu PIN untuk akses penyelaras Relief dan fungsi pentadbir E-Keberadaan. Penukaran hanya boleh dibuat oleh pentadbir portal yang telah log masuk.</p><form autocomplete="off"><div class="smk-relief-pin-fields"><label>PIN semasa<input name="currentPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="off"></label><label>PIN baharu<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="new-password"></label><label>Ulang PIN baharu<input name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="new-password"></label></div><button type="submit">Tukar PIN</button><p class="smk-relief-pin-message" role="status" aria-live="polite"></p></form>`;
  target.before(panel);
  const form = panel.querySelector("form"), message = panel.querySelector(".smk-relief-pin-message"), button = panel.querySelector("button");
  form.onsubmit = async (event) => {
    event.preventDefault();
    const currentPin = form.elements.currentPin.value, newPin = form.elements.newPin.value;
    message.className = "smk-relief-pin-message";
    if (newPin !== form.elements.confirmPin.value) { message.textContent = "Ulangan PIN baharu tidak sepadan."; return; }
    button.disabled = true; message.textContent = "Menukar PIN…";
    try {
      const response = await fetch("/api/relief-pin", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPin,newPin})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "PIN tidak dapat ditukar.");
      form.reset(); message.className = "smk-relief-pin-message ok";
      message.textContent = "PIN berjaya ditukar. Masuk semula ke E-Keberadaan dan E-Relief menggunakan PIN baharu.";
    } catch (error) { message.textContent = error?.message || "PIN tidak dapat ditukar."; }
    finally { button.disabled = false; }
  };
};
const reliefPinAdminObserver = new MutationObserver(addReliefPinAdmin);
reliefPinAdminObserver.observe(root, {childList:true, subtree:true});
const addDeletePasswordAdmin = () => {
  const target = root.querySelector(".summary-page.view-enter .admin-layout");
  if (!target || root.querySelector(".smk-delete-password-admin")) return;
  const panel = document.createElement("section");
  panel.className = "smk-relief-pin-admin smk-delete-password-admin";
  panel.innerHTML = `<h2>Kata laluan utama E-Keberadaan</h2><p>Digunakan untuk memadam nama guru dan rekod ketidakhadiran. Hanya pentadbir portal boleh menukarnya. PIN E-Relief diurus secara berasingan.</p><form autocomplete="off"><div class="smk-relief-pin-fields"><label>Kata laluan semasa<input name="currentPassword" type="password" required autocomplete="current-password"></label><label>Kata laluan baharu<input name="newPassword" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label><label>Ulang kata laluan baharu<input name="confirmPassword" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label></div><button type="submit">Tukar kata laluan utama</button><p class="smk-relief-pin-message" role="status" aria-live="polite"></p></form>`;
  target.before(panel);
  const form = panel.querySelector("form"), message = panel.querySelector(".smk-relief-pin-message"), button = panel.querySelector("button");
  let configured = true;
  fetch("/api/relief-delete-password", {cache:"no-store"}).then(async (response) => {
    const state = await response.json();
    if (!response.ok) throw new Error(state.error || "Status kata laluan tidak dapat dibaca.");
    configured = state.configured;
    form.elements.currentPassword.required = configured;
    form.elements.currentPassword.closest("label").hidden = !configured;
    button.textContent = configured ? "Tukar kata laluan utama" : "Tetapkan kata laluan utama";
    if (!configured && !state.canInitialize) { button.disabled = true; message.textContent = "Pentadbir utama perlu menetapkan kata laluan dahulu."; }
  }).catch((error) => { button.disabled = true; message.textContent = error?.message || "Status kata laluan tidak dapat dibaca."; });
  form.onsubmit = async (event) => {
    event.preventDefault();
    const currentPassword = form.elements.currentPassword.value, newPassword = form.elements.newPassword.value;
    message.className = "smk-relief-pin-message";
    if (newPassword !== form.elements.confirmPassword.value) { message.textContent = "Ulangan kata laluan baharu tidak sepadan."; return; }
    button.disabled = true; message.textContent = "Menukar kata laluan…";
    try {
      const response = await fetch("/api/relief-delete-password", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({currentPassword,newPassword})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Kata laluan tidak dapat ditukar.");
      form.reset(); message.className = "smk-relief-pin-message ok";
      message.textContent = configured ? "Kata laluan utama berjaya ditukar. Gunakan kata laluan baharu untuk memadam rekod E-Keberadaan." : "Kata laluan utama berjaya ditetapkan. Kini rekod E-Keberadaan boleh dipadam dengan kata laluan ini.";
      configured = true; form.elements.currentPassword.required = true; form.elements.currentPassword.closest("label").hidden = false; button.textContent = "Tukar kata laluan utama";
    } catch (error) { message.textContent = error?.message || "Kata laluan tidak dapat ditukar."; }
    finally { button.disabled = false; }
  };
};
const deletePasswordAdminObserver = new MutationObserver(addDeletePasswordAdmin);
deletePasswordAdminObserver.observe(root, {childList:true, subtree:true});
void loadCoordinators();

try {
  const [{ default: App }, framework] = await Promise.all([
    import("/ekeberadaan-app/assets/page-MSybSbxR.js?v=master-password-2"),
    import("/ekeberadaan-app/assets/framework-CXnKph_e.js"),
  ]);
  const React = framework.i();
  window.SMKAPTeacherReview = createTeacherReview(React);
  window.SMKAPAttendanceControls = createAttendanceControls(React);
  const ReactDOMModule = framework.t();
  const ReactDOM = ReactDOMModule.default || ReactDOMModule;
  ReactDOM.hydrateRoot(root, React.createElement(App));
  enhanceSummary();
} catch (error) {
  console.error("E-Keberadaan gagal dimulakan", error);
  root.innerHTML = `<main class="access-loading"><span>!</span><p>Sistem tidak dapat dimulakan. Sila muat semula halaman.</p></main>`;
}
