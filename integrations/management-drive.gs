// Add dispatch after the existing OPR token check. Existing OPR handlers are unchanged.
function managementDrive_(body) {
  if (body.action === 'management_health') return json_({ok:true,service:'management-v1',rootName:DriveApp.getFolderById('1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE').getName()});
  if (body.action === 'management_download') {
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
  try {
    var folder=DriveApp.getFolderById('1KHC_CcBhuiInffmJj5mXJzFYh0X1ClCE');
    ['PENGURUSAN SEKOLAH'].concat(paths).forEach(function(name){var matches=folder.getFoldersByName(name);folder=matches.hasNext()?matches.next():folder.createFolder(name);});
    var name=String(body.requestId)+' - '+String(body.name||'Dokumen').replace(/[\\/:*?"<>|]/g,'-').slice(0,150),existing=folder.getFilesByName(name);
    var file=existing.hasNext()?existing.next():folder.createFile(Utilities.newBlob(bytes,body.mimeType,name));
    return json_({ok:true,id:file.getId(),url:file.getUrl(),folderUrl:folder.getUrl(),name:file.getName()});
  } finally {lock.releaseLock();}
}
