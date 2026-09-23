// Cloudflare production only. Existing school Drive root; no scheduled jobs.
function doPost(e) {
 try {
 var secret=PropertiesService.getScriptProperties().getProperty('PRODUCTION_API_TOKEN');
 if(!secret || secret.length<32) return json_({ok:false,error:'Production not configured'});
 var body=JSON.parse(e.postData.contents);
 if(body.token!==secret) return json_({ok:false,error:'Unauthorized'});
 if(['management_health','management_upload','management_download','management_trash'].indexOf(body.action)>=0) return managementDrive_(body);
 if(body.action==='list') return listOprFiles_();
 if(body.action==='listRoot') return listOprRoot_(body);
 if(body.action==='ensureFolders') return ensureOprFolders_(body);
 if(body.action==='download') return readOprFile_(body);
 if(body.action==='delete') return trashOprFile_(body);
 if(body.action==='bundle') return bundleOprFiles_(body);
 if(body.category&&body.files) return uploadOprFiles_(body);
 if(body.action==='ekunjung_active') return listActiveEkunjung_();
 if(body.action==='ekunjung_create') return createEkunjung_(body);
 if(body.action==='ekunjung_checkout') return checkoutEkunjung_(body);
 if(body.action==='etempahan_list') return listEtempahan_(body);
 if(body.action==='etempahan_list_range') return listEtempahanRange_(body);
 if(body.action==='etempahan_create') return createEtempahan_(body);
 if(body.action==='etempahan_delete'||body.action==='etempahan_cancel') return deleteEtempahan_(body);
 return json_({ok:false,error:'Tindakan tidak sah'});
 } catch(error) {
   // Keep internal details in the Apps Script execution log, never in the API response.
   console.error('Production bridge request failed', error);
   return json_({ok:false,error:'Production bridge request failed'});
 }
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

function listEtempahanRange_(body) {
  const from = String(body.from || '').trim();
  const to = String(body.to || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
    return json_({ ok: false, error: 'Julat tarikh tidak sah' });
  }
  const values = getEtempahanSheet_().getDataRange().getDisplayValues();
  const bookings = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0] || normalizeDate_(row[6]) < from || normalizeDate_(row[4]) > to) continue;
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

// Existing school Drive folders. OPR operations are confined to these roots.
const OPR_FOLDERS = {
  'Pengurusan':'1-pCywDUogbiakrx_kU6mKsgaFCfQh1Uv',
  'Kurikulum':'1uO25sGR7CT1FaCBDIf1fLat2omyvcYZZ',
  'HEM':'1UxmjXQQrh4ks6AesymzDHmR9zPVvgpJk',
  'Kokurikulum':'15XRT0owC3FBG1wYeBqcYPKh9POLtdhNC',
  'Tingkatan Enam · Kurikulum':'1Xh3fRhcSaKq3oW0rEkAZG7mnGZSZNRJY',
  'Tingkatan Enam · HEM':'1s1Oab7XVoW-nrCPq97YmkqjCqlYo4Ojq',
  'Tingkatan Enam · Kokurikulum':'1AYwKHo0TvUHgqYs1QNnnVCgXheWvkYBE',
  'Lain-lain':'1eWyZqCmj5l3mZc0o7PgmuwP47K0MxKB2'
};

function oprCategory_(category) {
  var parts=String(category||'').trim().split(/\s*·\s*/).map(function(x){return x.trim().replace(/[\u0000-\u001f]/g,'');});
  if(!parts.length||parts.some(function(x){return !x||x.length>120||x==='.'||x==='..';}))throw new Error('Kategori OPR tidak sah');
  var root=parts[0],relative=parts.slice(1);
  if(root==='Tingkatan Enam') {
    if(relative[0]==='Hal Ehwal Murid Tingkatan Enam')root='Tingkatan Enam · HEM';
    else if(relative[0]==='Kokurikulum Tingkatan Enam')root='Tingkatan Enam · Kokurikulum';
    else root='Tingkatan Enam · Kurikulum';
  }
  if(!OPR_FOLDERS[root])throw new Error('Bidang OPR tidak sah');
  return {root:root,relative:relative};
}

function oprFolder_(category,create) {
  var target=oprCategory_(category),folder=DriveApp.getFolderById(OPR_FOLDERS[target.root]);
  target.relative.forEach(function(segment){var matches=folder.getFoldersByName(segment);if(matches.hasNext())folder=matches.next();else if(create)folder=folder.createFolder(segment);else throw new Error('Folder OPR tidak ditemui');});
  return folder;
}

function oprFile_(id) {
  if(!/^[A-Za-z0-9_-]{10,120}$/.test(String(id||'')))throw new Error('ID fail OPR tidak sah');
  var file=DriveApp.getFileById(String(id)),parents=file.getParents(),folder=parents.hasNext()?parents.next():null;
  for(var depth=0;folder&&depth<30;depth++){
    if(Object.keys(OPR_FOLDERS).some(function(key){return OPR_FOLDERS[key]===folder.getId();})){
      if(file.isTrashed())throw new Error('Fail OPR telah dipadam');
      return file;
    }
    var next=folder.getParents();folder=next.hasNext()?next.next():null;
  }
  throw new Error('Fail bukan dalam folder OPR sekolah');
}

function walkOpr_(folder,root,relative,records,depth) {
  if(depth>20)throw new Error('Struktur folder OPR terlalu dalam');
  var files=folder.getFilesByType(MimeType.PDF),category=root.indexOf('Tingkatan Enam ·')===0?['Tingkatan Enam'].concat(relative).join(' · '):[root].concat(relative).join(' · ');
  while(files.hasNext()){
    var file=files.next();if(file.isTrashed())continue;
    records.push({id:file.getId(),name:file.getName(),category:category,createdAt:file.getDateCreated().toISOString(),updatedAt:file.getLastUpdated().toISOString(),viewUrl:file.getUrl(),previewUrl:'https://drive.google.com/file/d/'+file.getId()+'/preview',downloadUrl:'https://drive.google.com/uc?export=download&id='+file.getId()});
  }
  var folders=folder.getFolders();while(folders.hasNext()){var child=folders.next();walkOpr_(child,root,relative.concat([child.getName()]),records,depth+1);}
}

function listOprFiles_() {
  var records=[];Object.keys(OPR_FOLDERS).forEach(function(root){walkOpr_(DriveApp.getFolderById(OPR_FOLDERS[root]),root,[],records,0);});
  records.sort(function(a,b){return b.updatedAt.localeCompare(a.updatedAt);});
  return json_({ok:true,files:records});
}

function listOprRoot_(body) {
  var root=String(body.root||'');if(!Object.prototype.hasOwnProperty.call(OPR_FOLDERS,root))throw new Error('Bidang OPR tidak sah');
  var records=[];walkOpr_(DriveApp.getFolderById(OPR_FOLDERS[root]),root,[],records,0);
  records.sort(function(a,b){return b.updatedAt.localeCompare(a.updatedAt);});
  return json_({ok:true,files:records});
}

function ensureOprFolders_(body) {
  var categories=Array.isArray(body.categories)?body.categories.slice(0,250):[];
  if(!categories.length)return json_({ok:false,error:'Senarai kategori diperlukan'});
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{categories.forEach(function(category){oprFolder_(category,true);});return json_({ok:true,ensured:categories.length});}finally{lock.releaseLock();}
}

function uploadOprFiles_(body) {
  var files=Array.isArray(body.files)?body.files:[];
  if(!files.length||files.length>7)throw new Error('Bilangan fail OPR tidak sah');
  var category=String(body.category||''),isAchievement=category==='Lain-lain · Arkib Kejayaan';
  if(!isAchievement&&files[0].mimeType!=='application/pdf')throw new Error('PDF OPR diperlukan');
  var bytes=[],total=0;
  files.forEach(function(file){
    if(!file||['application/pdf','image/jpeg','image/png'].indexOf(file.mimeType)<0||typeof file.base64!=='string'||file.base64.length>8500000)throw new Error('Jenis atau saiz fail OPR tidak sah');
    var data=Utilities.base64Decode(file.base64);total+=data.length;if(!data.length||total>20000000)throw new Error('Jumlah fail OPR terlalu besar');bytes.push(data);
  });
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var folder=oprFolder_(category,true),created=[];
    files.forEach(function(file,index){var name=String(file.name||'fail-opr').replace(/[\\/:*?"<>|]/g,'-').slice(0,180),saved=folder.createFile(Utilities.newBlob(bytes[index],file.mimeType,name));created.push({id:saved.getId(),url:saved.getUrl(),name:saved.getName()});});
    return json_({ok:true,files:created});
  }finally{lock.releaseLock();}
}

function readOprFile_(body) {
  var file=oprFile_(body.id);if(file.getSize()>8000000)throw new Error('Fail OPR terlalu besar');
  var blob=file.getBlob();return json_({ok:true,name:file.getName(),mimeType:blob.getContentType(),base64:Utilities.base64Encode(blob.getBytes())});
}

function trashOprFile_(body) {var file=oprFile_(body.id);file.setTrashed(true);return json_({ok:true,id:String(body.id)});}

function bundleOprFiles_(body) {
  var ids=Array.isArray(body.ids)?body.ids.slice(0,100):[];if(!ids.length)throw new Error('Tiada fail OPR dipilih');
  var blobs=[],total=0;ids.forEach(function(id){var file=oprFile_(id);total+=file.getSize();if(total>15000000)throw new Error('Jumlah bundle OPR terlalu besar');blobs.push(file.getBlob().setName(file.getName()));});
  var name=String(body.name||'Bundle-SMKAP.zip').replace(/[\\/:*?"<>|]/g,'-').slice(0,120),zip=Utilities.zip(blobs,name);
  return json_({ok:true,name:name,mimeType:'application/zip',base64:Utilities.base64Encode(zip.getBytes())});
}
