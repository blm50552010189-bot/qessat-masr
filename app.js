
/* =====================================
   QESSAT MASR - COMPLETE APP
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

const SUPABASE_URL = 'https://bhudyegwlztfslhkbdjf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TcmwO6zoiB2UbpkbAIjofA_UGxcBLgD';

if (!window.supabase) {
  alert('خطأ: مكتبة Supabase غير موجودة في index.html');
  throw new Error('Supabase missing');
}

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = id => document.getElementById(id);

if ($('year')) {
  $('year').textContent = new Date().getFullYear();
}

/* الموسيقى */

if (musicBtn && audio) {
  musicBtn.addEventListener('click', async () => {
    try {
      if (audio.paused) {
        await audio.play();
        musicBtn.textContent = 'Ⅱ إيقاف الموسيقى';
      } else {
        audio.pause();
        musicBtn.textContent = '▶ تشغيل الموسيقى';
      }
    } catch (e) {
      alert('تعذر تشغيل الموسيقى');
    }
  });
}

/* دخول الموقع */

if (enterBtn) {
  enterBtn.addEventListener('click', async () => {
    splash?.classList.add('hidden');
    app?.classList.remove('hidden');
    window.scrollTo(0, 0);

    if (audio) {
      audio.play().then(() => {
        if (musicBtn) musicBtn.textContent = 'Ⅱ إيقاف الموسيقى';
      }).catch(() => {});
    }

    await loadStories();
  });
}

/* تغيير اللغة */

if (langBtn) {
  langBtn.addEventListener('click', async () => {
    lang = lang === 'ar' ? 'en' : 'ar';

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-ar]').forEach(el => {
      const value = el.dataset[lang];
      if (value) el.textContent = value;
    });

    langBtn.textContent = lang === 'ar' ? 'EN' : 'عربي';

    await loadStories();
  });
}

/* تسجيل الدخول وإنشاء الحساب */

function showLogin() {
  if (!loginDialog) return;

  loginDialog.innerHTML = `
    <form class="dialog-card" id="authForm">
      <button type="button" class="close-btn" id="closeAuth">×</button>
      <p class="eyebrow">QESSAT MASR</p>
      <h2>تسجيل الدخول</h2>

      <label>البريد الإلكتروني
        <input id="authEmail" type="email" required>
      </label>

      <label>كلمة المرور
        <input id="authPassword" type="password" minlength="6" required>
      </label>

      <button class="gold-btn" type="submit">تسجيل الدخول</button>
      <button class="outline-btn" type="button" id="registerBtn">
        إنشاء حساب جديد
      </button>

      <p id="authMessage"></p>
    </form>
  `;

  loginDialog.showModal();

  $('closeAuth').onclick = () => loginDialog.close();

  $('registerBtn').onclick = async () => {
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    const msg = $('authMessage');

    if (!email || password.length < 6) {
      msg.textContent = 'اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل';
      return;
    }

    msg.textContent = 'جارٍ إنشاء الحساب...';

    const { error } = await db.auth.signUp({
      email,
      password
    });

    msg.textContent = error
      ? 'خطأ: ' + error.message
      : 'تم إنشاء الحساب. إذا طُلب تأكيد البريد، راجع بريدك الإلكتروني.';
  };

  $('authForm').onsubmit = async event => {
    event.preventDefault();

    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    const msg = $('authMessage');

    msg.textContent = 'جارٍ تسجيل الدخول...';

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      msg.textContent = 'تعذر الدخول: ' + error.message;
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

/* زر الحساب */

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    if (!currentUser) {
      showLogin();
    } else if (isAdmin) {
      showAdminPanel();
    } else {
      showUserMenu();
    }
  });
}

/* فحص المدير */

async function checkAdmin() {
  const { data: { user }, error: userError } = await db.auth.getUser();

  if (userError || !user) {
    currentUser = null;
    isAdmin = false;
    return;
  }

  currentUser = user;

  const { data, error } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  isAdmin = !error && !!data;
}

/* تحديث زر الحساب */

function updateLoginButton() {
  if (!loginBtn) return;

  loginBtn.textContent = currentUser
    ? (isAdmin ? 'لوحة التحكم' : 'حسابي')
    : (lang === 'ar' ? 'تسجيل الدخول' : 'Log in');
}

/* حساب المستخدم */

function showUserMenu() {
  if (!loginDialog) return;

  loginDialog.innerHTML = `
    <div class="dialog-card">
      <button class="close-btn" id="closeUser">×</button>
      <h2>حسابك</h2>
      <p id="userEmail"></p>
      <button class="gold-btn" id="logoutBtn">تسجيل الخروج</button>
    </div>
  `;

  $('userEmail').textContent = currentUser.email;
  loginDialog.showModal();

  $('closeUser').onclick = () => loginDialog.close();
  $('logoutBtn').onclick = logoutUser;
}

/* تسجيل الخروج */

async function logoutUser() {
  const { error } = await db.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;
  isAdmin = false;

  updateLoginButton();
  loginDialog?.close();
  $('adminPanel')?.remove();

  alert('تم تسجيل الخروج');
}

/* لوحة الإدارة */

function showAdminPanel() {
  if (!isAdmin || !app) {
    alert('هذه الصفحة للمدير فقط');
    return;
  }

  let panel = $('adminPanel');

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

      <label>رابط صورة الغلاف
        <input id="storyImage" type="url">
      </label>

      <label>
        <input id="storyPublished" type="checkbox">
        نشر القصة مباشرة
      </label>

      <button class="gold-btn" type="submit">حفظ القصة</button>
      <p id="storyMessage"></p>
    </form>

    <h3>إدارة القصص</h3>
    <div id="adminStories">جارٍ تحميل القصص...</div>

    <button class="outline-btn" id="refreshStories">تحديث القصص</button>
    <button class="outline-btn" id="adminLogout">تسجيل الخروج</button>
  `;

  $('storyForm').onsubmit = saveStory;
  $('adminLogout').onclick = logoutUser;
  $('refreshStories').onclick = loadAdminStories;

  panel.scrollIntoView({ behavior: 'smooth' });

  loadAdminStories();
}

/* إضافة قصة */

async function saveStory(event) {
  event.preventDefault();

  if (!isAdmin) {
    alert('غير مسموح');
    return;
  }

  const msg = $('storyMessage');
  msg.textContent = 'جارٍ حفظ القصة...';

  const story = {
    title_ar: $('storyTitleAr').value.trim(),
    title_en: $('storyTitleEn').value.trim(),
    content_ar: $('storyContentAr').value.trim(),
    content_en: $('storyContentEn').value.trim(),
    category: $('storyCategory').value.trim() || 'تاريخ مصر',
    cover_image: $('storyImage').value.trim() || null,
    published: $('storyPublished').checked
  };

  const { error } = await db.from('stories').insert([story]);

  if (error) {
    msg.textContent = 'فشل الحفظ: ' + error.message;
    return;
  }

  msg.textContent = 'تم حفظ القصة بنجاح';
  $('storyForm').reset();
  $('storyCategory').value = 'تاريخ مصر';

  await loadAdminStories();
  await loadStories();
}

/* عرض القصص المنشورة */

async function loadStories() {
  const { data, error } = await db
    .from('stories')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('خطأ تحميل القصص:', error.message);
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

/* عرض قصص الإدارة وأزرار النشر والحذف */

async function loadAdminStories() {
  if (!isAdmin) return;

  const container = $('adminStories');
  if (!container) return;

  container.textContent = 'جارٍ تحميل القصص...';

  const { data, error } = await db
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.textContent = 'خطأ تحميل القصص: ' + error.message;
    return;
  }

  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.textContent = 'لا توجد قصص حتى الآن';
    return;
  }

  data.forEach(story => {
    const item = document.createElement('article');
    item.className = 'era-card';

    const title = document.createElement('h3');
    title.textContent = story.title_ar;

    const status = document.createElement('p');
    status.textContent = story.published ? 'الحالة: منشورة' : 'الحالة: مسودة';

    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.className = 'gold-btn';
    publishButton.textContent = story.published
      ? 'إرجاع إلى المسودات'
      : 'نشر القصة';

    publishButton.onclick = async () => {
      publishButton.disabled = true;
      publishButton.textContent = 'جارٍ التحديث...';

      const { data: updated, error: updateError } = await db
        .from('stories')
        .update({ published: !story.published })
        .eq('id', story.id)
        .select('id, published');

      if (updateError || !updated || updated.length === 0) {
        alert('تعذر تغيير حالة القصة: ' +
          (updateError?.message || 'لم يتم تحديث أي سجل. راجع صلاحيات قاعدة البيانات.'));
        publishButton.disabled = false;
        publishButton.textContent = story.published
          ? 'إرجاع إلى المسودات'
          : 'نشر القصة';
        return;
      }

      await loadAdminStories();
      await loadStories();
    };

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'outline-btn';
    deleteButton.textContent = 'حذف القصة';

    deleteButton.onclick = async () => {
      if (!confirm('هل تريد حذف هذه القصة نهائيًا؟')) return;

      const { error: deleteError } = await db
        .from('stories')
        .delete()
        .eq('id', story.id);

      if (deleteError) {
        alert('تعذر الحذف: ' + deleteError.message);
        return;
      }

      await loadAdminStories();
      await loadStories();
    };

    item.append(title, status, publishButton, deleteButton);
    container.appendChild(item);
  });
}

/* استعادة الجلسة */

async function initializeApp() {
  await checkAdmin();
  updateLoginButton();
  await loadStories();
}

initializeApp();

console.log('Qessat Masr - New Admin System Loaded');
