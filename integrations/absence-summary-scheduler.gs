// Add as a separate file in the existing school Apps Script project.
// Uses the existing OPR_SECRET; no credential is copied into this file.
function smkapSummaryRequest_(mode) {
  var response=UrlFetchApp.fetch('https://portal-smkap-muadzam.sekolah-2508.chatgpt.site/api/absence-summary-job',{
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+OPR_SECRET},
    payload:JSON.stringify({mode:mode||'run'}),muteHttpExceptions:true
  });
  var result;
  try{result=JSON.parse(response.getContentText());}catch(e){throw new Error('Portal tidak memberi jawapan sah. Kod '+response.getResponseCode());}
  if(response.getResponseCode()!==200||!result.ok)throw new Error(result.error||'Rumusan gagal.');
  return result;
}
function smkapDailyAbsenceSummary() {
  var now=new Date(),zone='Asia/Kuala_Lumpur',date=Utilities.formatDate(now,zone,'yyyy-MM-dd');
  if(Utilities.formatDate(now,zone,'HH:mm')<'12:30')return;
  var props=PropertiesService.getScriptProperties();
  if(props.getProperty('SMKAP_SUMMARY_DONE_DATE')===date)return;
  // A user lock avoids blocking management_upload's script lock during the callback.
  var lock=LockService.getUserLock();if(!lock.tryLock(1000))return;
  try{
    if(props.getProperty('SMKAP_SUMMARY_DONE_DATE')===date)return;
    var result=smkapSummaryRequest_('run');
    if(['archived','already_archived','previously_deleted'].indexOf(result.status)>=0){
      props.setProperty('SMKAP_SUMMARY_DONE_DATE',date);
      props.setProperty('SMKAP_SUMMARY_LAST_RESULT',JSON.stringify(result));
    }
    console.log(JSON.stringify(result));
  }finally{lock.releaseLock();}
}
function setupSmkapAbsenceSummary() {
  console.log(JSON.stringify(smkapSummaryRequest_('check')));
  var found=ScriptApp.getProjectTriggers().some(function(t){return t.getHandlerFunction()==='smkapDailyAbsenceSummary';});
  if(!found)ScriptApp.newTrigger('smkapDailyAbsenceSummary').timeBased().everyMinutes(1).create();
  console.log('Penjadual aktif: semakan setiap minit; satu rumusan sehari selepas 12:30 Asia/Kuala_Lumpur.');
  smkapDailyAbsenceSummary();
}
