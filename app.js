
/* =====================================
   QESSAT MASR - MAIN APP
   Supabase Authentication & Admin
===================================== */

const splash = document.getElementById('splash');
const app = document.getElementById('app');
const audio = document.getElementById('introAudio');
const musicBtn = document.getElementById('musicBtn');
const enterBtn = document.getElementById('enterBtn');
const loginDialog = document.getElementById('loginDialog');
const loginBtn = document.getElementById('loginBtn');
const langBtn = document.getElementById('langBtn');

let lang = 'ar';
let currentUser = null;
let isAdmin = false;

const QESSAT_SUPABASE_URL =
  'https://bhudyegwlztfslhkbdjf.supabase.co';

const QESSAT_SUPABASE_KEY =
  'sb_publishable_TcmwO6zoiB2UbpkbAIjofA_UGxcBLgD';

if (!window.supabase) {
  alert('مكتبة Supabase لم يتم تحميلها. راجع index.html');
  throw new Error('Supabase library missing');
}

const qessatClient = window.supabase.createClient(
  QESSAT_SUPABASE_URL,
  QESSAT_SUPABASE_KEY
);

// السنة
const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// الموسيقى
if (musicBtn && audio) {
  musicBtn.addEventListener('click', async () => {
    if (audio.paused) {
      try {
        await audio.play();
        musicBtn.textContent = 'Ⅱ إيقاف الموسيقى';
      } catch (error) {
        console.error(error);
      }
    } else {
      audio.pause();
      musicBtn.textContent = '▶ تشغيل الموسيقى';
    }
  });
}

// الدخول للموقع
if (enterBtn) {
  enterBtn.addEventListener('click', async () => {
    splash?.classList.add('hidden');
    app?.classList.remove('hidden');
    window.scrollTo(0, 0);

    if (audio) {
      try {
        await audio.play();
        if (musicBtn) {
          musicBtn.textContent = 'Ⅱ إيقاف الموسيقى';
        }
      } catch (error) {
        console.log('تعذر تشغيل الموسيقى');
      }
    }

    loadStories();
  });
}

// تغيير اللغة
if (langBtn) {
  langBtn.addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';

    document.documentElement.lang = lang;
    document.documentElement.dir =
      lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-ar]').forEach(el => {
      const translation = el.dataset[lang];
      if (translation) el.textContent = translation;
    });

    langBtn.textContent = lang === 'ar' ? 'EN' : 'عربي';

    if (loginBtn) {
      loginBtn.textContent =
        lang === 'ar' ? 'تسجيل الدخول' : 'Log in';
    }
  });
}

// واجهة تسجيل الدخول
function showLogin() {
  if (!loginDialog) return;

  loginDialog.innerHTML = `
    <form class="dialog-card" id="authForm">
      <button type="button" class="close-btn" id="closeAuth">×</button>
      <p class="eyebrow">قصة عن مصر</p>
      <h2>تسجيل الدخول</h2>

      <label>
        البريد الإلكتروني
        <input id="authEmail" type="email"
          placeholder="name@example.com" required>
      </label>

      <label>
        كلمة المرور
        <input id="authPassword" type="password"
          placeholder="كلمة المرور" required minlength="6">
      </label>

      <button class="gold-btn" type="submit" id="authSubmit">
        تسجيل الدخول
      </button>

      <button type="button" class="outline-btn"
        id="registerBtn">
        إنشاء حساب جديد
      </button>

      <p id="authMessage" class="muted"></p>
    </form>
  `;

  loginDialog.showModal();

  document.getElementById('closeAuth').onclick = () => {
    loginDialog.close();
  };

  document.getElementById('registerBtn').onclick = async () => {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const message = document.getElementById('authMessage');

    if (!email || password.length < 6) {
      message.textContent =
        'اكتب البريد الإلكتروني وكلمة مرور من 6 أحرف على الأقل';
      return;
    }

    message.textContent = 'جارٍ إنشاء الحساب...';

    const { error } = await qessatClient.auth.signUp({
      email,
      password
    });

    message.textContent = error
      ? error.message
      : 'تم إنشاء الحساب. راجع بريدك الإلكتروني إذا طُلب تأكيده.';
  };

  document.getElementById('authForm').onsubmit =
    async (event) => {
      event.preventDefault();

      const email =
        document.getElementById('authEmail').value.trim();

      const password =
        document.getElementById('authPassword').value;

      const message =
        document.getElementById('authMessage');

      message.textContent = 'جارٍ تسجيل الدخول...';

      const { data, error } =
        await qessatClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        message.textContent = 'تعذر تسجيل الدخول: ' + error.message;
        return;
      }

      currentUser = data.user;
      await checkAdmin();

      loginDialog.close();
      updateLoginButton();

      if (isAdmin) {
        showAdminPanel();
      } else {
        alert('تم تسجيل الدخول بنجاح');
      }
    };
}

// زر تسجيل الدخول
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    if (currentUser) {
      if (isAdmin) {
        showAdminPanel();
      } else {
        showUserMenu();
      }
    } else {
      showLogin();
    }
  });
}

// فحص صلاحية المدير
async function checkAdmin() {
  const { data: { user } } =
    await qessatClient.auth.getUser();

  currentUser = user;

  if (!user) {
    isAdmin = false;
    return;
  }

  const { data, error } = await qessatClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  isAdmin = !error && !!data;
}

// تحديث زر الدخول
function updateLoginButton() {
  if (!loginBtn) return;

  loginBtn.textContent = currentUser
    ? (isAdmin ? 'لوحة التحكم' : 'حسابي')
    : (lang === 'ar' ? 'تسجيل الدخول' : 'Log in');
}

// قائمة المستخدم
function showUserMenu() {
  if (!loginDialog) return;

  loginDialog.innerHTML = `
    <div class="dialog-card">
      <button class="close-btn" id="closeUser">×</button>
      <h2>حسابك</h2>
      <p>${currentUser.email}</p>
      <button class="gold-btn" id="logoutBtn">تسجيل الخروج</button>
    </div>
  `;

  loginDialog.showModal();

  document.getElementById('closeUser').onclick =
    () => loginDialog.close();

  document.getElementById('logoutBtn').onclick =
    logoutUser;
}

// تسجيل الخروج
async function logoutUser() {
  const { error } = await qessatClient.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;
  isAdmin = false;
  updateLoginButton();
  loginDialog.close();
  document.getElementById('adminPanel')?.remove();
  alert('تم تسجيل الخروج');
}

// لوحة المدير
function showAdminPanel() {
  if (!isAdmin) {
    alert('هذه الصفحة للمدير فقط');
    return;
  }

  let panel = document.getElementById('adminPanel');

  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'adminPanel';
    panel.className = 'section';

    app.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="eyebrow">الإدارة</p>
        <h2>لوحة التحكم</h2>
      </div>
    </div>

    <form id="storyForm" class="dialog-card">
      <h3>إضافة حكاية جديدة</h3>

      <label>عنوان القصة بالعربية
        <input id="storyTitleAr" required>
      </label>

      <label>عنوان القصة بالإنجليزية
        <input id="storyTitleEn">
      </label>

      <label>محتوى القصة بالعربية
        <textarea id="storyContentAr" required rows="6"></textarea>
      </label>

      <label>محتوى القصة بالإنجليزية
        <textarea id="storyContentEn" rows="6"></textarea>
      </label>

      <label>التصنيف
        <input id="storyCategory" value="تاريخ مصر">
      </label>

      <label>رابط صورة الغلاف (اختياري)
        <input id="storyImage" type="url">
      </label>

      <label>
        <input id="storyPublished" type="checkbox">
        نشر القصة مباشرة
      </label>

      <button class="gold-btn" type="submit">
        حفظ القصة
      </button>

      <p id="storyMessage"></p>
    </form>

    <h3>القصص الموجودة</h3>
    <div id="adminStories">جارٍ تحميل القصص...</div>

    <button class="outline-btn" id="adminLogout">
      تسجيل الخروج
    </button>
  `;

  panel.scrollIntoView({ behavior: 'smooth' });

  document.getElementById('storyForm').onsubmit =
    saveStory;

  document.getElementById('adminLogout').onclick =
    logoutUser;

  loadAdminStories();
}

// إضافة قصة
async function saveStory(event) {
  event.preventDefault();

  if (!isAdmin) {
    alert('غير مسموح');
    return;
  }

  const message = document.getElementById('storyMessage');
  message.textContent = 'جارٍ حفظ القصة...';

  const story = {
    title_ar: document.getElementById('storyTitleAr').value.trim(),
    title_en: document.getElementById('storyTitleEn').value.trim(),
    content_ar: document.getElementById('storyContentAr').value.trim(),
    content_en: document.getElementById('storyContentEn').value.trim(),
    category: document.getElementById('storyCategory').value.trim(),
    cover_image: document.getElementById('storyImage').value.trim() || null,
    published: document.getElementById('storyPublished').checked
  };

  const { error } = await qessatClient
    .from('stories')
    .insert([story]);

  if (error) {
    message.textContent = 'حدث خطأ: ' + error.message;
    return;
  }

  message.textContent = 'تم حفظ القصة بنجاح';
  document.getElementById('storyForm').reset();
  document.getElementById('storyCategory').value = 'تاريخ مصر';

  loadAdminStories();
  loadStories();
}

// تحميل القصص المنشورة
async function loadStories() {
  const { data, error } = await qessatClient
    .from('stories')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Stories error:', error.message);
    return;
  }

  const container = document.querySelector('.latest .empty-state');
  if (!container) return;

  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = `
      <span>📜</span>
      <h3>الحكايات قادمة</h3>
      <p>ستظهر هنا القصص المنشورة قريبًا.</p>
    `;
    return;
  }

  data.forEach(story => {
    const card = document.createElement('article');
    card.className = 'era-card';

    const title = document.createElement('h3');
    title.textContent = lang === 'ar'
      ? story.title_ar
      : (story.title_en || story.title_ar);

    const category = document.createElement('p');
    category.textContent = story.category || 'تاريخ مصر';

    const content = document.createElement('p');
    content.textContent = lang === 'ar'
      ? story.content_ar
      : (story.content_en || story.content_ar);

    card.append(title, category, content);
    container.appendChild(card);
  });
}

// تحميل قصص لوحة المدير
async function loadAdminStories() {
  if (!isAdmin) return;

  const container = document.getElementById('adminStories');
  if (!container) return;

  const { data, error } = await qessatClient
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.textContent =
      'تعذر تحميل القصص: ' + error.message;
    return;
  }

  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.textContent = 'لا توجد قصص حتى الآن';
    return;
  }

  data.forEach(story => {
    const item = document.createElement('div');
    item.className = 'era-card';

    const title = document.createElement('h3');
    title.textContent = story.title_ar;

    const status = document.createElement('p');
    status.textContent = story.published ? 'منشورة' : 'مسودة';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'outline-btn';
    deleteButton.textContent = 'حذف القصة';

    deleteButton.onclick = async () => {
      if (!confirm('هل تريد حذف هذه القصة؟')) return;

      const { error: deleteError } = await qessatClient
        .from('stories')
        .delete()
        .eq('id', story.id);

      if (deleteError) {
        alert(deleteError.message);
      } else {
        loadAdminStories();
        loadStories();
      }
    };

    item.append(title, status, deleteButton);
    container.appendChild(item);
  });
}

// استعادة الجلسة عند فتح الموقع
async function initializeApp() {
  await checkAdmin();
  updateLoginButton();
  loadStories();
}

initializeApp();

console.log('Qessat Masr initialized');
