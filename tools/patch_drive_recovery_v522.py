"""Apply interrupted Drive creation recovery without changing release metadata."""
from argparse import ArgumentParser
from pathlib import Path
import re


FIND_AND_DOWNLOAD = '''async function driveSyncFindRemoteFile(){
  const matches=[],snapshots=[];let pageToken='';
  do{
  const params=new URLSearchParams({
    spaces:'appDataFolder',
    q:"trashed = false and (name = '"+DRIVE_SYNC_FILE.replace(/'/g,"\\\\'")+"' or appProperties has { key='kind' and value='maritime-drill-device-v1' })",
    pageSize:'100',
    fields:'nextPageToken,files(id,name,modifiedTime,size,appProperties)',
    ...(pageToken?{pageToken}:{})
  });
  const res=await driveSyncFetch('https://www.googleapis.com/drive/v3/files?'+params.toString());
  const data=await res.json();
  const files=Array.isArray(data.files)?data.files:[];
  matches.push(...files.filter(f=>f&&typeof f.id==='string'&&f.name===DRIVE_SYNC_FILE));
  snapshots.push(...files.filter(f=>f&&typeof f.id==='string'&&f.appProperties?.kind==='maritime-drill-device-v1'));
  pageToken=data.nextPageToken||'';
  }while(pageToken);
  const empty=file=>file.size==='0'||file.size===0;
  // v5.22: an interrupted legacy creation must not hide an existing full file.
  matches.sort((a,b)=>Number(empty(a))-Number(empty(b))||String(b.modifiedTime||'').localeCompare(String(a.modifiedTime||''))||String(a.id||'').localeCompare(String(b.id||'')));
  snapshots.sort((a,b)=>Number(empty(a))-Number(empty(b))||String(b.modifiedTime||'').localeCompare(String(a.modifiedTime||''))||String(a.id).localeCompare(String(b.id)));
  window.__mdDriveDeviceSnapshots.files=snapshots;
  const aggregate=matches.find(file=>!empty(file));
  const primary=aggregate||snapshots.find(file=>!empty(file))||matches[0]||snapshots[0];
  return primary?{...primary,candidates:[...matches,...snapshots],aggregateFileId:aggregate?.id||null}:null;
}
window.__mdDriveDeviceSnapshots={kind:'maritime-drill-device-v1',files:[]};
async function driveSyncDownloadPayload(fileId){
  const res=await driveSyncFetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media');
  const raw=await res.text();
  if(raw.length===0){
    const error=new Error('Drive의 동기화 파일이 비어 있습니다.');
    error.mdEmptyDriveFile=true;
    throw error;
  }
  const payload=JSON.parse(raw);
  if(!payload||payload.app!=='Maritime Drill'||!payload.items||typeof payload.items!=='object'||Array.isArray(payload.items)){
    throw new Error('Drive의 동기화 파일 형식이 올바르지 않습니다.');
  }
  return payload;
}
'''

CREATE = '''async function driveSyncCreateRemote(payload){
  // v5.22: create metadata and contents together; failed uploads cannot leave
  // a named zero-byte file that blocks every later synchronization attempt.
  const metadata=JSON.stringify({name:DRIVE_SYNC_FILE,parents:['appDataFolder'],mimeType:'application/json'});
  const content=JSON.stringify(payload);
  let boundary;
  do{boundary='md_drive_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)}
  while(metadata.includes(boundary)||content.includes(boundary));
  const body=[
    '--'+boundary,'Content-Type: application/json; charset=UTF-8','',metadata,
    '--'+boundary,'Content-Type: application/json; charset=UTF-8','',content,
    '--'+boundary+'--',''
  ].join('\\r\\n');
  const res=await driveSyncFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',{
    method:'POST',
    headers:{'Content-Type':'multipart/related; boundary='+boundary},
    body
  });
  const meta=await res.json();
  if(!meta.id) throw new Error('Drive 동기화 파일을 만들지 못했습니다.');
  return meta.id;
}
'''


def patch_html(text):
    start = text.index('async function driveSyncFindRemoteFile(){')
    end = text.index('function driveSyncBuildPayload(state){', start)
    text = text[:start] + FIND_AND_DOWNLOAD + text[end:]
    start = text.index('async function driveSyncCreateRemote(payload){')
    end = text.index('async function driveSyncUploadRemote(fileId,payload){', start)
    text = text[:start] + CREATE + text[end:]
    if not re.search(r'<script src="drive-state-codec\.js(?:\?v=[^"]*)?"></script>', text):
        pattern = r'(?=<script src="keyboard-controls\.js(?:\?v=[^"]*)?"></script>)'
        text, count = re.subn(pattern, '<script src="drive-state-codec.js?v=5.22"></script>\n', text, count=1)
        if count != 1:
            raise ValueError('missing Drive state codec loader anchor')
    return text


if __name__ == '__main__':
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('index.html'))
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    source = args.input.read_text(encoding='utf-8-sig')
    (args.output or args.input).write_text(patch_html(source), encoding='utf-8')
    print('Drive atomic creation and empty-file recovery patch applied')
