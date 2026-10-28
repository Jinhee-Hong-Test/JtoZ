(() => {
  const cfg=window.TOZ_WORKS_SOURCE;if(!cfg)return;
  
  const key='to-z-works-hours-session-v1',cacheKey='to-z-works-hours-cache-v1';
  let session=null,cache=null,busy=false,remember=false,refreshing=null;
  const controls=document.createElement('div');controls.className='cloud-controls';
  controls.innerHTML='<span id="works-hours-status" role="status">WORKs 시간 연동 안 됨</span><button id="works-hours-connect">WORKs 시간 연결</button><button id="works-hours-disconnect" hidden>시간 연동 해제</button>';
  document.querySelector('.sidebar-actions').prepend(controls);
  const dialog=document.createElement('dialog');dialog.innerHTML='<form id="works-hours-form" class="fields"><h2>WORKs 시간 자동 연동</h2><p>WORKs 계정으로 로그인하면 출근·퇴근 시간만 가져옵니다. WORKs 데이터는 수정하지 않습니다.</p><label class="field">이메일<input name="email" type="email" autocomplete="username" required></label><label class="field">비밀번호<input name="password" type="password" autocomplete="current-password" required></label><label><input name="remember" type="checkbox"> 로그인 상태 유지</label><p id="works-hours-message" role="status"></p><div class="form-actions"><button type="button" id="works-hours-cancel">취소</button><button type="submit" class="primary">연결</button></div></form>';document.body.append(dialog);
  const $=id=>document.getElementById(id),form=$('works-hours-form');
  function validHours(h){return h&&['start','end'].every(k=>typeof h[k]==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(h[k]))&&h.start<h.end;}
  function extract(payload){
    const fallback=payload.workHours||{start:'10:00',end:'19:00'};
    if(!validHours(fallback))throw Error('WORKs 기본 시간 형식을 확인해주세요.');
    const dates={};for(const [date,h] of Object.entries(payload.workHoursByDate||{})){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!validHours(h))throw Error('WORKs 날짜별 시간 형식을 확인해주세요.');
      dates[date]={start:h.start,end:h.end};
    }
    return {defaultHours:{start:fallback.start,end:fallback.end},dates};
  }
  window.TOZWorksHours={connected:()=>!!session&&!!cache,forDate:date=>session&&cache?(cache.dates[date]||cache.defaultHours):null};
  function status(text){$('works-hours-status').textContent=text;$('works-hours-connect').textContent=session?'지금 시간 새로고침':'WORKs 시간 연결';$('works-hours-disconnect').hidden=!session;}
  function persist(){const target=remember?localStorage:sessionStorage,other=remember?sessionStorage:localStorage;target.setItem(key,JSON.stringify(session));other.removeItem(key);}
  async function request(path,body,token){
    const res=await fetch(cfg.url+path,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const data=await res.json();if(!res.ok){const e=Error(res.status===401?'WORKs에 다시 로그인해주세요.':res.status===403?'WORKs 계정 권한 또는 배포 주소 허용 설정을 확인해주세요.':'WORKs 연결에 실패했습니다.');e.status=res.status;throw e;}return data;
  }
  function saveSession(data){session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600),userId:data.user?.id||session?.userId};persist();}
  async function token(){
    if(session.expires_at*1000<Date.now()+60000){if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(saveSession).finally(()=>{refreshing=null;});await refreshing;}
    return session.access_token;
  }
  async function sync(){
    if(!session||busy)return;busy=true;
    try{
      const result=await request('/functions/v1/pworks-sync',{action:'read'},await token());
      if(!result.ok||!result.data?.payload)throw Error('WORKs 응답을 확인해주세요.');
      const next=extract(result.data.payload);cache=next;
      try{localStorage.setItem(cacheKey,JSON.stringify({userId:session.userId,...next}));}catch{}
      status('WORKs 시간 연동 중 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));window.TOZRefreshHours?.();
    }catch(e){status(e.status===401?'WORKs 재로그인 필요':'시간 갱신 실패 · 마지막 설정 유지');if(e.status===401){session=null;cache=null;localStorage.removeItem(key);sessionStorage.removeItem(key);window.TOZRefreshHours?.();}throw e;}
    finally{busy=false;}
  }
  function open(){if(location.protocol==='file:'){
    alert('자동 연동은 배포한 TO Z에서 사용할 수 있습니다. 현재 로컬 HTML은 WORKs 서버의 허용 주소가 아닙니다. TO Z를 WORKs와 같은 GitHub 계정의 Pages에 배포한 뒤 연결해주세요.');return;
  }form.reset();$('works-hours-message').textContent='';dialog.showModal();}
  $('works-hours-connect').onclick=()=>{if(session)sync().catch(e=>{$('works-hours-message').textContent=e.message;if(!session)open();});else open();};
  $('works-hours-cancel').onclick=()=>{form.elements.password.value='';dialog.close();};
  dialog.addEventListener('close',()=>{form.elements.password.value='';});
  $('works-hours-disconnect').onclick=()=>{session=null;cache=null;for(const storage of [localStorage,sessionStorage])storage.removeItem(key);localStorage.removeItem(cacheKey);status('WORKs 시간 연동 안 됨');window.TOZRefreshHours?.();};
  form.onsubmit=async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;remember=form.elements.remember.checked;
    try{const data=await request('/auth/v1/token?grant_type=password',{email:form.elements.email.value.trim(),password:form.elements.password.value});form.elements.password.value='';saveSession(data);cache=null;await sync();dialog.close();}
    catch(error){$('works-hours-message').textContent=error.message;}
    finally{submit.disabled=false;}
  };
  try{const persistent=localStorage.getItem(key);remember=!!persistent;session=JSON.parse(persistent||sessionStorage.getItem(key)||'null');if(session){const saved=JSON.parse(localStorage.getItem(cacheKey)||'null');if(saved?.userId===session.userId)cache=saved;window.TOZRefreshHours?.();sync().catch(()=>{});}}catch{session=null;cache=null;}
  setInterval(()=>{if(session&&!document.hidden)sync().catch(()=>{});},60000);
  window.addEventListener('focus',()=>{if(session)sync().catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{if(session&&!document.hidden)sync().catch(()=>{});});
})();
