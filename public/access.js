export async function accessFetch(input,options){
 const response=await fetch(input,options);
 if(response.status===401){window.dispatchEvent(new Event('talacard-session-expired'));location.assign('/login');throw Error('نشست ورود تمام شده است.')}
 return response;
}
export async function mountAccess({editor=false}={}){
 const response=await accessFetch('/api/auth/me',{cache:'no-store'});if(response.status===404)return {required:false,role:editor?'editor':'viewer',storage:'static'};if(!response.ok)throw Error('دریافت دسترسی انجام نشد.');const session=await response.json();
 if(!session.required)return session;
 const canEdit=['admin','editor'].includes(session.role);
 if(editor&&!canEdit){location.replace('/');throw Error('این حساب فقط اجازهٔ مشاهده دارد.')}
 if(!editor&&canEdit&&/^#edit(?:-home)?$/.test(location.hash)){location.replace('/edit.html'+location.search+location.hash);return session}
 const controls=document.createElement('div');controls.className='access-controls';const label=document.createElement('span');label.className='access-role';label.textContent=editor?'مدیر':canEdit?'مدیر · حالت نمایش':'بیننده';controls.append(label);
 if(canEdit){const link=document.createElement('a');link.className='access-editor';link.href=editor?'/':'/edit.html#edit-home';link.textContent=editor?'مشاهدهٔ پرزنت':'ویرایش';controls.append(link)}
 const logout=document.createElement('button');logout.type='button';logout.textContent='خروج';logout.onclick=async()=>{if(editor)window.dispatchEvent(new Event('talacard-before-logout'));logout.disabled=true;try{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw Error();location.replace('/login')}catch{logout.disabled=false;logout.textContent='تلاش دوباره برای خروج'}};controls.append(logout);
 const toolbar=document.querySelector('.toolbar'),place=()=>{const floating=document.body.classList.contains('home-open')&&!document.body.classList.contains('home-editing');controls.classList.toggle('access-floating',floating);const parent=floating?document.body:toolbar;if(parent&&controls.parentElement!==parent)parent.append(controls)};place();new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']});return session;
}
