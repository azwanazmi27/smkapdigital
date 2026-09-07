const root = document.getElementById("relief-root");

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

const openSummaryPdf = async (selectedDate) => {
  const preview = window.open("", "_blank");
  if (!preview) return;
  preview.document.write("<title>Menyediakan PDF…</title><p style=\"font:16px Arial;padding:24px\">Menyediakan rumusan…</p>");
  try {
    const response = await fetch("/api/ekeberadaan?resource=absences", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error || "Data tidak dapat dibaca.");
    const records = (payload.records || []).filter((record) => !selectedDate || record.absenceDate === selectedDate);
    const label = selectedDate ? `Tarikh: ${formatDate(selectedDate)}` : "Semua rekod ketidakhadiran";
    const rows = records.map((record, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(record.teacherName)}</td><td>${escapeHtml(reportDate(record))}</td><td>${escapeHtml(record.reason || "—")}</td></tr>`).join("")
      || '<tr><td colspan="4" class="empty">Tiada ketidakhadiran direkodkan.</td></tr>';
    preview.document.open();
    preview.document.write(`<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rumusan Keberadaan Guru SMK Agama Pahang</title><style>
      @page{size:A4 portrait;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#101820;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.35}.document{max-width:178mm;margin:0 auto}h1{margin:0;padding:0 0 12px;border-bottom:2px solid #123f64;color:#123f64;font-size:19pt;letter-spacing:.01em;text-align:center}.subtitle{margin:22px 0 4px;font-size:13pt;font-weight:700;text-align:center}.date{margin:0 0 22px;text-align:center}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:9px 8px;border:1px solid #324a5c;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{color:#fff;background:#123f64;font-weight:700}th:first-child,td:first-child{width:11%;text-align:center}th:nth-child(2){width:37%}th:nth-child(3){width:27%}th:nth-child(4){width:25%}.empty{text-align:center;color:#52616d}footer{position:fixed;right:0;bottom:0;left:0;color:#56636d;font-size:9pt;text-align:center}.preview-actions{display:flex;justify-content:flex-end;gap:10px;max-width:178mm;margin:0 auto 18px}.preview-actions button{min-height:42px;padding:9px 15px;border:1px solid #123f64;border-radius:8px;font:700 10.5pt Arial;cursor:pointer}.close-preview{color:#123f64;background:#fff}.print-pdf{color:#fff;background:#123f64}@media print{.preview-actions{display:none}body{font-size:10.5pt}footer{position:fixed}}@media screen{body{padding:28px;background:#eef2f4}.document{min-height:250mm;padding:16mm;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.14)}}
    </style></head><body><div class="preview-actions"><button class="close-preview" type="button" onclick="window.close()">Tutup pratonton</button><button class="print-pdf" type="button" onclick="window.print()">Muat turun / Cetak PDF</button></div><main class="document"><h1>RUMUSAN KEBERADAAN GURU SMK AGAMA PAHANG</h1><p class="subtitle">Rumusan ketidakhadiran</p><p class="date">${escapeHtml(label)}</p><table><thead><tr><th>Bil.</th><th>Nama guru</th><th>Tarikh bercuti</th><th>Sebab</th></tr></thead><tbody>${rows}</tbody></table></main><footer>Dijana daripada Portal SMKAP Digital</footer></body></html>`);
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
  .smk-summary-modes{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .smk-summary-modes button{min-height:42px;padding:9px 14px;border:1px solid rgba(101,202,191,.42);border-radius:10px;color:#c8e5e1;background:#103946;font:700 14px/1.2 inherit;cursor:pointer}
  .smk-summary-modes button.active{color:#06303a;background:linear-gradient(135deg,#7bd8ce,#79c3df);border-color:transparent}
  @media(max-width:640px){.history-tools{align-items:stretch}.smk-summary-modes{width:100%}.smk-summary-modes button{flex:1}.history-tools .pdf-button{width:100%;justify-content:center}}
`;
document.head.append(summaryStyle);

try {
  const [{ default: App }, framework] = await Promise.all([
    import("/ekeberadaan-app/assets/page-MSybSbxR.js"),
    import("/ekeberadaan-app/assets/framework-CXnKph_e.js"),
  ]);
  const React = framework.i();
  const ReactDOMModule = framework.t();
  const ReactDOM = ReactDOMModule.default || ReactDOMModule;
  ReactDOM.hydrateRoot(root, React.createElement(App));
  enhanceSummary();
} catch (error) {
  console.error("E-Keberadaan gagal dimulakan", error);
  root.innerHTML = `<main class="access-loading"><span>!</span><p>Sistem tidak dapat dimulakan. Sila muat semula halaman.</p></main>`;
}
