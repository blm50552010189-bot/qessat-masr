
const splash = document.getElementById('splash');
const app = document.getElementById('app');
const audio = document.getElementById('introAudio');
const musicBtn = document.getElementById('musicBtn');
const enterBtn = document.getElementById('enterBtn');
const loginDialog = document.getElementById('loginDialog');

let lang = 'ar';

// تحديث السنة لو العنصر موجود
const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// زر الموسيقى
if (musicBtn && audio) {
  musicBtn.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        musicBtn.textContent = 'Ⅱ إيقاف الموسيقى';
      } catch (error) {
        musicBtn.textContent = '▶ تشغيل الموسيقى';
      }
    } else {
      audio.pause();
      musicBtn.textContent = '▶ تشغيل الموسيقى';
    }
  });
}

// الدخول إلى الحكاية وتشغيل الموسيقى
if (enterBtn) {
  enterBtn.addEventListener('click', async () => {
    if (splash) splash.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    window.scrollTo(0, 0);

    if (audio) {
      try {
        await audio.play();
        if (musicBtn) musicBtn.textContent = 'Ⅱ إيقاف الموسيقى';
      } catch (error) {
        console.log('تعذر تشغيل الموسيقى');
      }
    }
  });
}

// تسجيل الدخول
const loginBtn = document.getElementById('loginBtn');

if (loginBtn && loginDialog) {
  loginBtn.addEventListener('click', () => {
    loginDialog.showModal();
  });
}

// إغلاق نافذة تسجيل الدخول
if (loginDialog) {
  const closeBtn = loginDialog.querySelector('.close-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      loginDialog.close();
    });
  }
}

// تغيير اللغة
const langBtn = document.getElementById('langBtn');

if (langBtn) {
  langBtn.addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-ar]').forEach(el => {
      const translation = el.dataset[lang];

      if (translation) {
        el.textContent = translation;
      }
    });

    langBtn.textContent = lang === 'ar' ? 'EN' : 'عربي';

    if (loginBtn) {
      loginBtn.textContent =
        lang === 'ar' ? 'تسجيل الدخول' : 'Log in';
    }
  });
}
