// Cloudflare production only. Existing school Drive root; no scheduled jobs.
function doPost(e) {
 try {
 var secret=PropertiesService.getScriptProperties().getProperty('PRODUCTION_API_TOKEN');
 if(!secret || secret.length<32) return json_({ok:false,error:'Production not configured'});
 var body=JSON.parse(e.postData.contents);
 if(body.token!==secret) return json_({ok:false,error:'Unauthorized'});
 if(['management_health','management_upload','management_download','management_trash'].indexOf(body.action)>=0) return managementDrive_(body);
 if(body.action==='ekunjung_active') return listActiveEkunjung_();
 if(body.action==='ekunjung_create') return createEkunjung_(body);
 if(body.action==='ekunjung_checkout') return checkoutEkunjung_(body);
 if(body.action==='etempahan_list') return listEtempahan_(body);
 if(body.action==='etempahan_create') return createEtempahan_(body);
 if(body.action==='etempahan_delete'||body.action==='etempahan_cancel') return deleteEtempahan_(body);
 return json_({ok:false,error:'Tindakan tidak sah'});
 } catch(error) { return json_({ok:false,error:'Staging Drive request failed'}); }
}
function doGet(){return json_({ok:false,error:'POST required'});}
function json_(body){return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);}
function managementDrive_(body) {
  if(body.action==='management_trash') {
    var target=DriveApp.getFileById(String(body.id||''));
    if(!/^[-a-f0-9]{36}$/i.test(String(body.requestId))||target.getName().indexOf(String(body.requestId)+' - ')!==0)throw new Error('Fail pengurusan tidak sah');
    if(target.isTrashed())return json_({ok:true});
    var ancestors=target.getParents(),current=ancestors.hasNext()?ancestors.next():null,valid=false;
    for(var n=0;current&&n<20;n++){if(current.getId()==='1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE'){valid=true;break;}var parents=current.getParents();current=parents.hasNext()?parents.next():null;}
    if(!valid)throw new Error('Fail bukan dalam Drive portal sekolah');
    target.setTrashed(true);return json_({ok:true});
  }

  if(body.action==='management_health')return json_({ok:true,service:'management-v1',rootName:DriveApp.getFolderById('1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE').getName()});
  if(body.action==='management_download'){
    var item=DriveApp.getFileById(String(body.id||'')),parents=item.getParents(),inside=false,folder=parents.hasNext()?parents.next():null;
    for(var depth=0;folder&&depth<20;depth++){if(folder.getId()==='1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE'){inside=true;break;}var next=folder.getParents();folder=next.hasNext()?next.next():null;}
    if(!inside||item.isTrashed()||item.getSize()>8000000)throw new Error('Fail tidak boleh dibaca');
    return json_({ok:true,name:item.getName(),mimeType:item.getMimeType(),base64:Utilities.base64Encode(item.getBlob().getBytes())});
  }
  if(body.action!=='management_upload')throw new Error('Tindakan pengurusan tidak sah');
  var paths=body.path,allowed=['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  if(!Array.isArray(paths)||paths.length<3||paths.length>10||!/^20[0-9]{2}$/.test(String(paths[0]))||!/^[-a-f0-9]{36}$/i.test(String(body.requestId))||allowed.indexOf(body.mimeType)<0||typeof body.base64!=='string'||body.base64.length>10666668)throw new Error('Fail tidak sah');
  paths=paths.map(function(p){return String(p).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').trim().slice(0,120);});
  if(paths.some(function(p){return !p||p==='.'||p==='..';}))throw new Error('Folder tidak sah');
  var bytes=Utilities.base64Decode(body.base64);if(!bytes.length||bytes.length>8000000)throw new Error('Saiz fail tidak sah');
  var lock=LockService.getScriptLock();if(!lock.tryLock(5000))return json_({ok:false,error:'Drive sedang sibuk. Cuba semula.'});
  try{
    var folder=DriveApp.getFolderById('1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE');
    ['PENGURUSAN SEKOLAH'].concat(paths).forEach(function(name){var matches=folder.getFoldersByName(name);folder=matches.hasNext()?matches.next():folder.createFolder(name);});
    var name=String(body.requestId)+' - '+String(body.name||'Dokumen').replace(/[\\/:*?"<>|]/g,'-').slice(0,150),existing=folder.getFilesByName(name);
    var file=existing.hasNext()?existing.next():folder.createFile(Utilities.newBlob(bytes,body.mimeType,name));
    return json_({ok:true,id:file.getId(),url:file.getUrl(),folderUrl:folder.getUrl(),name:file.getName()});
  }finally{lock.releaseLock();}
}

const EKUNJUNG_SHEET_ID = "1DEGqefi-3G9MVvLhgpXujn4KfWFLFyDFfS1BH5wW2_I";
const EKUNJUNG_PHOTO_PARENT_ID = "1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE";
const EKUNJUNG_SHEET_NAME = "REKOD_PELAWAT";

function cleanVisitorText_(value, maxLength) {
  var text = String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength || 180);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function createEkunjung_(body) {
  var required = ['date', 'timeIn', 'visitorName', 'phone', 'purpose', 'staff'];
  for (var i = 0; i < required.length; i++) {
    if (!cleanVisitorText_(body[required[i]], 220)) return json_({ ok: false, error: 'Maklumat wajib tidak lengkap' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !/^\d{2}:\d{2}$/.test(body.timeIn)) return json_({ ok: false, error: 'Tarikh atau masa tidak sah' });
  var photo = body.photo || {};
  if (['image/jpeg', 'image/png'].indexOf(photo.mimeType) === -1 || typeof photo.base64 !== 'string' || !photo.base64 || photo.base64.length > 7000000) return json_({ ok: false, error: 'Gambar tidak sah atau terlalu besar' });
  var id = 'EK-' + Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  var extension = photo.mimeType === 'image/png' ? 'png' : 'jpg';
  var blob = Utilities.newBlob(Utilities.base64Decode(photo.base64), photo.mimeType, id + '.' + extension);
  var imageFile = getEkunjungPhotoFolder_().createFile(blob);
  var sheet = SpreadsheetApp.openById(EKUNJUNG_SHEET_ID).getSheetByName(EKUNJUNG_SHEET_NAME);
  if (!sheet) throw new Error('Helaian rekod tidak ditemui');
  sheet.appendRow([
    id, cleanVisitorText_(body.date, 10), cleanVisitorText_(body.timeIn, 5), '',
    cleanVisitorText_(body.visitorName, 120), cleanVisitorText_(body.phone, 30),
    cleanVisitorText_(body.vehicleNo, 30).toUpperCase(), cleanVisitorText_(body.organisation, 120),
    cleanVisitorText_(body.purpose, 160), cleanVisitorText_(body.staff, 120),
    cleanVisitorText_(body.meetingPlace, 120), cleanVisitorText_(body.notes, 300),
    imageFile.getUrl(), 'DALAM KAWASAN'
  ]);
  return json_({ ok: true, id: id, status: 'DALAM KAWASAN', imageUrl: imageFile.getUrl() });
}

function listActiveEkunjung_() {
  var sheet = SpreadsheetApp.openById(EKUNJUNG_SHEET_ID).getSheetByName(EKUNJUNG_SHEET_NAME);
  var values = sheet.getDataRange().getDisplayValues();
  var records = [];
  for (var row = values.length - 1; row >= 1 && records.length < 100; row--) {
    if (values[row][13] === 'DALAM KAWASAN') records.push({ id: values[row][0], date: values[row][1], timeIn: values[row][2], name: values[row][4], vehicleNo: values[row][6] });
  }
  return json_({ ok: true, records: records });
}

function checkoutEkunjung_(body) {
  var id = cleanVisitorText_(body.id, 80);
  var timeOut = cleanVisitorText_(body.timeOut, 5);
  if (!id || !/^\d{2}:\d{2}$/.test(timeOut)) return json_({ ok: false, error: 'Rekod atau masa keluar tidak sah' });
  var sheet = SpreadsheetApp.openById(EKUNJUNG_SHEET_ID).getSheetByName(EKUNJUNG_SHEET_NAME);
  var values = sheet.getDataRange().getDisplayValues();
  for (var row = values.length - 1; row >= 1; row--) {
    if (values[row][0] === id && values[row][13] === 'DALAM KAWASAN') {
      sheet.getRange(row + 1, 4).setValue(timeOut);
      sheet.getRange(row + 1, 14).setValue('SELESAI');
      return json_({ ok: true, id: id, name: values[row][4], timeOut: timeOut, status: 'SELESAI' });
    }
  }
  return json_({ ok: false, error: 'Rekod aktif tidak ditemui' });
}


function getEkunjungPhotoFolder_() {
  var properties = PropertiesService.getScriptProperties();
  var savedId = properties.getProperty('EKUNJUNG_PHOTO_FOLDER_ID');
  if (savedId) {
    try { return DriveApp.getFolderById(savedId); } catch (ignored) {}
  }
  var parent = DriveApp.getFolderById(EKUNJUNG_PHOTO_PARENT_ID);
  var folder = parent.createFolder('GAMBAR E-KUNJUNG - SISTEM');
  properties.setProperty('EKUNJUNG_PHOTO_FOLDER_ID', folder.getId());
  return folder;
}



const ETEMPAHAN_SHEET_ID = "1DEGqefi-3G9MVvLhgpXujn4KfWFLFyDFfS1BH5wW2_I";
const ETEMPAHAN_SHEET_NAME = "REKOD_TEMPAHAN";

function getEtempahanSheet_() {
  const book = SpreadsheetApp.openById(ETEMPAHAN_SHEET_ID);
  let sheet = book.getSheetByName(ETEMPAHAN_SHEET_NAME);
  if (!sheet) throw new Error("Helaian tempahan tidak ditemui");
  const headers = ["ID","Bilik","Nama Pemohon","E-mel","Tarikh Mula","Masa Mula","Tarikh Tamat","Masa Tamat","Tujuan","Jumlah Peserta","Status","Dicipta Pada"];
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function listEtempahan_(body) {
  const date = String(body.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json_({ ok: false, error: "Tarikh tidak sah" });
  const sheet = getEtempahanSheet_();
  const values = sheet.getDataRange().getDisplayValues();
  const bookings = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0] || date < normalizeDate_(row[4]) || date > normalizeDate_(row[6])) continue;
    bookings.push(rowToBooking_(row));
  }
  return json_({ ok: true, bookings: bookings });
}

function createEtempahan_(body) {
  const room = clean_(body.room);
  const applicantName = clean_(body.applicantName);
  const email = clean_(body.email).toLowerCase();
  const startDate = clean_(body.startDate || body.date);
  const startTime = normalizeTime_(body.startTime || body.time);
  const endDate = clean_(body.endDate || body.date);
  const endTime = normalizeTime_(body.endTime || body.time);
  const purpose = clean_(body.purpose);
  const participants = Number(body.participants);
  if (!room || !applicantName || !email || !startDate || !startTime || !endDate || !endTime || !purpose || !participants) {
    return json_({ ok: false, error: "Maklumat tempahan tidak lengkap atau tidak sah" });
  }
  const requestedStart = new Date(startDate + "T" + startTime + ":00+08:00");
  const requestedEnd = new Date(endDate + "T" + endTime + ":00+08:00");
  if (!isFinite(requestedStart.getTime()) || !isFinite(requestedEnd.getTime()) || requestedEnd <= requestedStart) {
    return json_({ ok: false, error: "Tarikh dan waktu akhir mestilah selepas tarikh dan waktu mula" });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getEtempahanSheet_();
    const values = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (!row[0] || clean_(row[1]) !== room || clean_(row[10]).toLowerCase() === "dibatalkan") continue;
      const existingStart = new Date(normalizeDate_(row[4]) + "T" + normalizeTime_(row[5]) + ":00+08:00");
      const existingEnd = new Date(normalizeDate_(row[6]) + "T" + normalizeTime_(row[7]) + ":00+08:00");
      if (requestedStart < existingEnd && requestedEnd > existingStart) {
        return json_({ ok: false, error: "Tempahan bertindih dengan tempahan sedia ada bagi bilik ini." });
      }
    }
    const now = new Date();
    const id = "ET-" + Utilities.formatDate(now, "Asia/Kuala_Lumpur", "yyyyMMdd-HHmmss") + "-" + Utilities.getUuid().slice(0,6).toUpperCase();
    sheet.appendRow([id, room, applicantName, email, startDate, startTime, endDate, endTime, purpose, participants, "Diluluskan", Utilities.formatDate(now, "Asia/Kuala_Lumpur", "yyyy-MM-dd HH:mm:ss")]);
    SpreadsheetApp.flush();
    let emailSent = false;
    try {
      MailApp.sendEmail({
        to: email,
        subject: "Tempahan berjaya - " + room,
        htmlBody: "<p>Assalamualaikum dan salam sejahtera,</p><p>Tempahan anda telah berjaya.</p><p><b>" + escapeHtml_(room) + "</b><br>" + escapeHtml_(startDate) + " " + escapeHtml_(startTime) + " hingga " + escapeHtml_(endDate) + " " + escapeHtml_(endTime) + "<br>Tujuan: " + escapeHtml_(purpose) + "</p><p>Portal Rasmi SMK Agama Pahang</p>"
      });
      emailSent = true;
    } catch (mailError) {}
    return json_({ ok: true, id: id, status: "Diluluskan", count: countDates_(startDate, endDate), emailSent: emailSent });
  } finally {
    lock.releaseLock();
  }
}

function deleteEtempahan_(body) {
  const id = clean_(body.id || body.bookingId);
  if (!id) return json_({ ok: false, error: "ID tempahan diperlukan" });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getEtempahanSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return json_({ ok: false, error: "Tempahan tidak ditemui" });
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) {
        sheet.getRange(i + 2, 11).setValue("Dibatalkan");
        SpreadsheetApp.flush();
        return json_({ ok: true, deletedId: id });
      }
    }
    return json_({ ok: false, error: "Tempahan tidak ditemui" });
  } finally {
    lock.releaseLock();
  }
}

function rowToBooking_(row) {
  return { id: String(row[0]), room: String(row[1]), applicantName: String(row[2]), email: String(row[3]), ownerEmail: String(row[3]), startDate: normalizeDate_(row[4]), startTime: normalizeTime_(row[5]), endDate: normalizeDate_(row[6]), endTime: normalizeTime_(row[7]), purpose: String(row[8]), participants: Number(row[9]) || 0, status: String(row[10] || "Diluluskan") };
}
function normalizeDate_(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  return match ? match[3] + "-" + match[2].padStart(2,"0") + "-" + match[1].padStart(2,"0") : text.slice(0,10);
}
function normalizeTime_(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  return match ? match[1].padStart(2,"0") + ":" + match[2] : text.slice(0,5);
}
function countDates_(startDate, endDate) {
  const start = new Date(startDate + "T12:00:00+08:00");
  const end = new Date(endDate + "T12:00:00+08:00");
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}
function clean_(value) { return String(value == null ? "" : value).trim(); }
function escapeHtml_(value) { return clean_(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
