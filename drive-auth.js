// v5.13: retain only unexpired Drive credentials across browser sessions.
// GIS token flow still requires a user gesture after Google's actual expiry.
(function(){
  'use strict';
  // Deliberately outside md_: even older clients must never back up this key.
  const TOKEN_KEY='maritime-drill:drive-auth:v1';
  let memoryToken=null,memoryOnly=false,gisPromise=null,authPromise=null,cancelAuth=null;
  let generation=0,initialized=false;
  window.__mdDriveAuthGeneration=()=>generation;
  const originalRefresh=driveSyncRefreshPanel;
  const originalStatus=driveSyncPanelStatus;
  const originalManaged=isManagedStorageKey;
  isManagedStorageKey=function(key){
    return key!==TOKEN_KEY&&!String(key).startsWith('md_drive_sync_token')&&originalManaged(key);
  };
  function read(storage,key){try{return JSON.parse(storage.getItem(key)||'null')}catch(e){return null}}
  function remove(storage,key){try{storage.removeItem(key)}catch(e){}}
  function valid(token){
    return !!token&&typeof token.access_token==='string'&&token.access_token.length>0&&
      Number.isFinite(Number(token.expiresAt))&&Date.now()<Number(token.expiresAt);
  }
  function persist(token){
    memoryToken=token;
    try{localStorage.setItem(TOKEN_KEY,JSON.stringify(token));memoryOnly=false;return true}catch(e){
      memoryOnly=true;
      try{sessionStorage.setItem(DRIVE_SYNC_SESSION_TOKEN_KEY,JSON.stringify(token))}catch(e){}
      return false;
    }
  }
  driveSyncLoadSessionToken=function(){
    const saved=read(localStorage,TOKEN_KEY);
    if(saved&&!valid(saved))remove(localStorage,TOKEN_KEY);
    if(valid(saved)&&(!memoryOnly||!valid(memoryToken)))memoryToken=saved;
    if(!valid(memoryToken))memoryToken=null;
    // Migrate the previous tab-only format without changing its expiry.
    const legacy=read(sessionStorage,DRIVE_SYNC_SESSION_TOKEN_KEY);
    if(!memoryToken&&valid(legacy))persist(legacy);
    if(valid(read(localStorage,TOKEN_KEY))||!valid(legacy))remove(sessionStorage,DRIVE_SYNC_SESSION_TOKEN_KEY);
    return memoryToken;
  };
  driveSyncSaveSessionToken=function(response){
    const seconds=Number(response&&response.expires_in);
    if(!response||!response.access_token||!Number.isFinite(seconds)||seconds<=0)
      throw new Error('Google 연결 유효기간을 확인하지 못했습니다. 다시 연결하세요.');
    if(persist({access_token:response.access_token,expiresAt:Date.now()+seconds*1000}))
      remove(sessionStorage,DRIVE_SYNC_SESSION_TOKEN_KEY);
  };
  driveSyncClearSessionToken=function(expectedToken){
    // A delayed 401 for an older request must not erase a newer connection.
    const current=driveSyncLoadSessionToken();
    if(expectedToken&&current&&current.access_token!==expectedToken)return;
    memoryToken=null;memoryOnly=false;
    remove(localStorage,TOKEN_KEY);
    remove(sessionStorage,DRIVE_SYNC_SESSION_TOKEN_KEY);
  };
  const gisReady=()=>!!(globalThis.google&&google.accounts&&google.accounts.oauth2);
  driveSyncLoadGIS=function(){
    if(gisReady())return Promise.resolve();
    if(gisPromise)return gisPromise;
    gisPromise=new Promise((resolve,reject)=>{
      let script=document.querySelector('script[data-md-gis="1"]');
      if(script)script.remove();
      script=document.createElement('script');
      script.src='https://accounts.google.com/gsi/client';
      script.async=true;script.dataset.mdGis='1';
      const timer=setTimeout(()=>finish(new Error('Google 연결 준비 시간이 초과되었습니다. 다시 누르세요.')),12000);
      function finish(error){
        clearTimeout(timer);script.onload=script.onerror=null;
        if(error){script.remove();reject(error)}else resolve();
      }
      script.onload=()=>finish(gisReady()?null:new Error('Google 로그인 모듈을 불러오지 못했습니다.'));
      script.onerror=()=>finish(new Error('Google 로그인 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하세요.'));
      document.head.appendChild(script);
    }).finally(()=>{gisPromise=null});
    return gisPromise;
  };
  driveSyncRequestToken=function(interactive=true){
    const existing=driveSyncLoadSessionToken();
    if(existing)return Promise.resolve(existing.access_token);
    if(authPromise)return authPromise;
    if(!interactive)return Promise.reject(new Error('Google Drive 연결 갱신이 필요합니다.'));
    // Preload at startup; if it is still loading, preserve popup user activation.
    if(!gisReady())return driveSyncLoadGIS().then(()=>{
      throw new Error('Google 연결 준비가 끝났습니다. 연결 버튼을 한 번 더 눌러주세요.');
    });
    const epoch=generation;
    let resolveAuth,rejectAuth,settled=false;
    authPromise=new Promise((resolve,reject)=>{resolveAuth=resolve;rejectAuth=reject});
    const pending=authPromise;
    const timer=setTimeout(()=>finish(new Error('Google 연결 시간이 초과되었습니다. 다시 연결하세요.')),120000);
    function finish(error,response){
      if(settled)return;settled=true;clearTimeout(timer);cancelAuth=null;authPromise=null;
      if(!error&&epoch!==generation)error=new Error('Google 연결을 취소했습니다.');
      if(!error){
        try{
          if(!google.accounts.oauth2.hasGrantedAllScopes(response,DRIVE_SYNC_SCOPE))
            throw new Error('학습 기록을 동기화하려면 Drive 앱 데이터 권한이 필요합니다.');
          driveSyncSaveSessionToken(response);driveSyncLastError='';
        }catch(e){error=e}
      }
      if(error)rejectAuth(error);else resolveAuth(response.access_token);
      driveSyncRefreshPanel();
    }
    cancelAuth=()=>finish(new Error('Google 연결을 취소했습니다.'));
    try{
      driveSyncTokenClient=google.accounts.oauth2.initTokenClient({
        client_id:DRIVE_SYNC_CLIENT_ID,scope:DRIVE_SYNC_SCOPE,
        callback:response=>finish(response&&response.access_token?null:new Error('Google Drive 연결을 승인하지 못했습니다. 다시 연결하세요.'),response),
        error_callback:error=>finish(new Error(error&&error.type==='popup_failed_to_open'
          ?'Google 로그인 팝업이 차단되었습니다. 이 사이트의 팝업을 허용하고 다시 연결하세요.'
          :error&&error.type==='popup_closed'?'Google 로그인 창을 닫았습니다. 연결 버튼으로 다시 시도할 수 있습니다.'
          :'Google 로그인 창을 열지 못했습니다. 다시 연결하세요.'))
      });
      // No forced account chooser on every renewal. No background popup attempts.
      driveSyncTokenClient.requestAccessToken({prompt:''});
    }catch(error){finish(error)}
    driveSyncRefreshPanel();
    return pending;
  };
  driveSyncFetch=async function(url,options={}){
    for(let attempt=0;attempt<2;attempt++){
      const token=driveSyncLoadSessionToken();
      if(!token)throw new Error('Google Drive 연결 갱신이 필요합니다.');
      const headers=new Headers(options.headers||{});
      headers.set('Authorization','Bearer '+token.access_token);
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      let response;
      try{response=await fetch(url,Object.assign({},options,{headers,signal:controller.signal}))}
      catch(error){
        if(error&&error.name==='AbortError')throw new Error('Drive 응답이 늦어 중단했습니다. 연결되면 자동으로 다시 시도합니다.');
        throw error;
      }finally{clearTimeout(timeout)}
      if(response.status===401){
        const latest=driveSyncLoadSessionToken();
        if(attempt===0&&latest&&latest.access_token!==token.access_token)continue;
        driveSyncClearSessionToken(token.access_token);driveSyncRefreshPanel();
        throw new Error('Google Drive 연결 갱신이 필요합니다.');
      }
      if(!response.ok){
        let detail='';try{detail=(await response.json())?.error?.message||''}catch(e){}
        throw new Error(detail||`Google Drive 요청 실패 (${response.status})`);
      }
      return response;
    }
  };
  window.connectGoogleDriveSync=async function(){
    const epoch=generation;
    try{
      await driveSyncRequestToken(true);
      if(epoch!==generation)return;
      // Read AFTER OAuth: studying in another tab may have changed the metadata.
      const state=driveSyncLoadState();state.enabled=true;
      if(!driveSyncSaveState(state))throw new Error('동기화 설정을 저장하지 못했습니다. 사이트 저장 공간을 확인하세요.');
      driveSyncLastError='';
      await driveSyncOnce({interactive:false,showNotice:true});
    }catch(error){
      if(epoch!==generation)return;
      driveSyncLastError=(error&&error.message)||'Google Drive 연결에 실패했습니다.';
      backupNotice(driveSyncLastError);
    }finally{driveSyncRefreshPanel()}
  };
  window.disconnectGoogleDriveSync=function(){
    generation++;if(cancelAuth)cancelAuth();
    const state=driveSyncLoadState();state.enabled=false;
    if(!driveSyncSaveState(state)){
      driveSyncLastError='연결 해제 설정을 저장하지 못했습니다.';driveSyncRefreshPanel();return;
    }
    driveSyncClearSessionToken();driveSyncLastError='';driveSyncRefreshPanel();
    // Pausing this browser must not revoke the phone's grant as a side effect.
    backupNotice('이 브라우저의 자동 동기화를 껐습니다. 다른 기기와 Drive 기록은 유지합니다.');
  };
  driveSyncPanelStatus=function(){
    if(authPromise)return {label:'Google 연결 확인 중…',tone:'#2563EB'};
    const state=driveSyncLoadState();
    if(state.enabled&&!navigator.onLine)return {label:'오프라인 · 동기화 대기',tone:'#D97706'};
    if(state.enabled&&!driveSyncHasToken())return {label:'연결 갱신 필요 · 동기화 일시 중지',tone:'#D97706'};
    return originalStatus();
  };
  function refreshBanner(){
    if(!document.body)return;
    let banner=document.getElementById('md-drive-auth-banner');
    const needed=driveSyncLoadState().enabled&&!driveSyncHasToken()&&navigator.onLine;
    if(!needed){if(banner)banner.remove();return}
    if(!banner){
      banner=document.createElement('div');banner.id='md-drive-auth-banner';
      banner.setAttribute('role','status');
      banner.style.cssText='position:sticky;top:0;z-index:1000;padding:10px 14px;background:#FEF3C7;color:#78350F;font-size:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
      const text=document.createElement('span');text.style.flex='1';
      text.textContent='Drive 동기화가 일시 중지되었습니다. 연결을 갱신하면 기기에 저장된 기록을 동기화합니다.';
      const button=document.createElement('button');button.type='button';button.className='btn btn-accent';
      button.onclick=()=>connectGoogleDriveSync();banner.append(text,button);document.body.prepend(banner);
    }
    const button=banner.querySelector('button');button.disabled=!!authPromise;
    button.textContent=authPromise?'Google 확인 중…':'연결 갱신';
  }
  driveSyncRefreshPanel=function(){
    originalRefresh();
    const button=document.getElementById('md-drive-connect-btn');
    if(button){button.disabled=!!authPromise;if(authPromise)button.textContent='Google 확인 중…'}
    refreshBanner();
  };
  function tick(){
    driveSyncRefreshPanel();
    if(document.visibilityState!=='visible')return;
    const state=driveSyncLoadState();
    if(state.enabled&&driveSyncHasToken()&&navigator.onLine)driveSyncOnce({interactive:false});
  }
  function init(){
    if(initialized)return;initialized=true;
    // The original init installs storage hooks first; replace its silent-expiry poll.
    if(driveSyncTimer)clearInterval(driveSyncTimer);
    driveSyncTimer=setInterval(tick,DRIVE_SYNC_POLL_MS);
    driveSyncLoadSessionToken();
    // Loading GIS does not request a token or open a Google window.
    driveSyncLoadGIS().catch(()=>{});
    window.addEventListener('storage',event=>{
      if(event.key===TOKEN_KEY||event.key===DRIVE_SYNC_STATE_KEY||event.key===null){
        if(event.key===DRIVE_SYNC_STATE_KEY){
          // Sync metadata changes every poll. Only enabled changes are auth events;
          // otherwise two open tabs would trigger each other's sync indefinitely.
          try{if(!!JSON.parse(event.oldValue||'null')?.enabled===!!JSON.parse(event.newValue||'null')?.enabled)return}catch(e){}
        }
        if(event.key===TOKEN_KEY||event.key===null){memoryToken=null;memoryOnly=false;remove(sessionStorage,DRIVE_SYNC_SESSION_TOKEN_KEY)}
        if(!driveSyncLoadState().enabled){generation++;if(cancelAuth)cancelAuth()}
        driveSyncLastError='';tick();
      }
    });
    window.addEventListener('pageshow',tick);
    tick();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
