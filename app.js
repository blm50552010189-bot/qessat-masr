const splash=document.getElementById('splash');
const app=document.getElementById('app');
const audio=document.getElementById('introAudio');
const musicBtn=document.getElementById('musicBtn');
const enterBtn=document.getElementById('enterBtn');
const loginDialog=document.getElementById('loginDialog');

let lang='ar';

document.getElementById('year').textContent=new Date().getFullYear();

musicBtn.addEventListener('click',async()=>{
  if(audio.paused){
    try{
      await audio.play();
      musicBtn.textContent='Ⅱ إيقاف الموسيقى';
      musicBtn.setAttribute('aria-pressed','true');
    }catch(e){
      musicBtn.textContent='تعذر التشغيل — جرّب مرة أخرى';
    }
  }else{
    audio.pause();
    musicBtn.textContent='▶ تشغيل الموسيقى';
    musicBtn.setAttribute('aria-pressed','false');
  }
});

enterBtn.addEventListener('click',async()=>{
  splash.classList.add('hidden');
  app.classList.remove('hidden');
  window.scrollTo(0,0);

  try{
    await audio.play();
    musicBtn.textContent='Ⅱ إيقاف الموسيقى';
    musicBtn.setAttribute('aria-pressed','true');
  }catch(e){
    musicBtn.textContent='▶ تشغيل الموسيقى';
    musicBtn.setAttribute('aria-pressed','false');
  }
});

document.getElementById('loginBtn').addEventListener('click',()=>loginDialog.showModal());

loginDialog.querySelector('.close-btn').addEventListener('click',()=>loginDialog.close());

document.getElementById('langBtn').addEventListener('click',()=>{
  lang=lang==='ar'?'en':'ar';

  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';

  document.querySelectorAll('[data-ar]').forEach(el=>{
    el.textContent=el.dataset[lang];
  });

  document.getElementById('langBtn').textContent=lang==='ar'?'EN':'عربي';
  document.getElementById('loginBtn').textContent=lang==='ar'?'تسجيل الدخول':'Log in';
});
