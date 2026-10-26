const form=document.querySelector('#login-form'),button=document.querySelector('#login-submit'),error=document.querySelector('#login-error'),password=document.querySelector('#password');
document.querySelector('#show-password').onclick=event=>{const visible=password.type==='password';password.type=visible?'text':'password';event.currentTarget.textContent=visible?'پنهان':'نمایش';event.currentTarget.setAttribute('aria-pressed',String(visible));event.currentTarget.setAttribute('aria-label',visible?'پنهان‌کردن رمز عبور':'نمایش رمز عبور')};
form.onsubmit=async event=>{
 event.preventDefault();error.hidden=true;button.disabled=true;button.textContent='در حال ورود…';
 try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.username.value,password:password.value})});const result=await response.json();if(!response.ok)throw Error(result.error||'ورود انجام نشد.');password.value='';location.replace(result.redirect==='/edit.html#edit-home'?result.redirect:'/')}
 catch(cause){error.textContent=cause.message||'ارتباط برقرار نشد؛ دوباره تلاش کنید.';error.hidden=false;button.disabled=false;button.textContent='ورود به پرزنتیشن ←'}
};
