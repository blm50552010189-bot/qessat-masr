
/* =====================================
   QESSAT MASR - CLEAN COMPLETE APP
   Auth + Admin + Story Folders
===================================== */

const SUPABASE_URL = 'https://bhudyegwlztfslhkbdjf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Tcmw6zoiB2UbpkbAIjofA_UGxcBLgD';

const $ = id => document.getElementById(id);

let lang = 'ar';
let currentUser = null;
let isAdmin = false;
let allStories = [];

const FOLDERS = [
  { id: 'ancient', ar: 'مصر القديمة', en: 'Ancient Egypt', icon: '𓂀' },
  { id: 'greek', ar: 'العصر اليوناني والروماني', en: 'Greek and Roman Egypt', icon: '⌘' },
  { id: 'coptic', ar: 'مصر القبطية', en: 'Coptic Egypt', icon: '✥' },
  { id: 'islamic', ar: 'مصر الإسلامية', en: 'Islamic Egypt', icon: '☾' },
  { id: 'modern', ar: 'العصر الحديث', en: 'Modern Egypt', icon: '⚜' },
  { id: 'figures', ar: 'شخصيات مصرية', en: 'Egyptian Figures', icon: '✦' }
];

if (!window.supabase) {
  alert('مكتبة Supabase غير محملة. راجع index.html');
  throw new Error('Supabase library missing');
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function showError(message) {
  console.error(message);
  alert(message);
}

/* السنة */

if ($('year')) {
  $('year').textContent = new Date().getFullYear();
}

/* الموسيقى */

const audio = $('introAudio');
const musicBtn = $('musicBtn');

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
    } catch (error) {
      showError('تعذر تشغيل الموسيقى');
    }
  });
}

/* دخول الموقع */

const splash = $('splash');
const app = $('app');
const enterBtn = $('enterBtn');

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

const langBtn = $('langBtn');

if (langBtn) {
  langBtn.addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-ar]').forEach(element => {
      const value = element.dataset[lang];
      if (value) element.textContent = value;
    });

    langBtn.textContent = lang === 'ar' ? 'EN' : 'عربي';

    renderStories();
  });
}

/* تسجيل الدخول */

const loginDialog = $('loginDialog');
const loginBtn = $('loginBtn');

function showLogin() {
  if (!loginDialog) {
    showError('نافذة تسجيل الدخول غير موجودة في index.html');
    return;
  }

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
      <button class="outline-btn" type="button" id="registerBtn">إنشاء حساب جديد</button>
      <p id="authMessage"></p>
    </form>
  `;

  loginDialog.showModal();

  $('closeAuth').onclick = () => loginDialog.close();

  $('registerBtn').onclick = async () => {
    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    const message = $('authMessage');

    if (!email || password.length < 6) {
      message.textContent = 'اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل';
      return;
    }

    message.textContent = 'جارٍ إنشاء الحساب...';

    const { error } = await db.auth.signUp({ email, password });

    message.textContent = error
      ? 'خطأ: ' + error.message
      : 'تم إنشاء الحساب. راجع بريدك إذا طُلب التأكيد.';
  };

  $('authForm').onsubmit = async event => {
    event.preventDefault();

    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    const message = $('authMessage');

    message.textContent = 'جارٍ تسجيل الدخول...';

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      message.textContent = 'تعذر الدخول: ' + error.message;
      return;
    }

    currentUser = data.user;
    await checkAdmin();

    loginDialog.close();
    updateLoginButton();

    if (isAdmin) showAdminPanel();
    else alert('تم تسجيل الدخول بنجاح');
  };
}

/* زر الحساب */

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    if (!currentUser) showLogin();
    else if (isAdmin) showAdminPanel();
    else showUserMenu();
  });
}

/* التحقق من المدير */

async function checkAdmin() {
  const { data: { user }, error: authError } = await db.auth.getUser();

  if (authError || !user) {
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
    showError(error.message);
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

      <label>اختر مجلد القصة
        <select id="storyCategory" required>
          ${FOLDERS.map(folder =>
            `<option value="${folder.ar}">${folder.ar}</option>`
          ).join('')}
        </select>
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

    <button type="button" class="outline-btn" id="refreshStories">تحديث القصص</button>
    <button type="button" class="outline-btn" id="adminLogout">تسجيل الخروج</button>
  `;

  $('storyForm').onsubmit = saveStory;
  $('adminLogout').onclick = logoutUser;
  $('refreshStories').onclick = loadAdminStories;

  panel.scrollIntoView({ behavior: 'smooth' });
  loadAdminStories();
}

/* حفظ القصة */

async function saveStory(event) {
  event.preventDefault();

  if (!isAdmin) {
    alert('غير مسموح');
    return;
  }

  const message = $('storyMessage');
  message.textContent = 'جارٍ حفظ القصة...';

  const story = {
    title_ar: $('storyTitleAr').value.trim(),
    title_en: $('storyTitleEn').value.trim(),
    content_ar: $('storyContentAr').value.trim(),
    content_en: $('storyContentEn').value.trim(),
    category: $('storyCategory').value,
    cover_image: $('storyImage').value.trim() || null,
    published: $('storyPublished').checked
  };

  const { error } = await db.from('stories').insert([story]);

  if (error) {
    message.textContent = 'فشل الحفظ: ' + error.message;
    return;
  }

  message.textContent = 'تم حفظ القصة بنجاح';
  $('storyForm').reset();

  await loadAdminStories();
  await loadStories();
}

/* تحميل القصص */

async function loadStories() {
  const { data, error } = await db
    .from('stories')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Stories:', error.message);
    return;
  }

  allStories = data || [];
  renderStories();
}

/* بطاقة القصة */

function createStoryCard(story) {
  const card = document.createElement('article');
  card.className = 'era-card';

  if (story.cover_image) {
    const image = document.createElement('img');
    image.src = story.cover_image;
    image.alt = lang === 'ar' ? story.title_ar : story.title_en;
    image.style.width = '100%';
    image.style.borderRadius = '12px';
    image.loading = 'lazy';
    card.appendChild(image);
  }

  const title = document.createElement('h3');
  title.textContent = lang === 'ar'
    ? story.title_ar
    : (story.title_en || story.title_ar);

  const content = document.createElement('p');
  content.textContent = lang === 'ar'
    ? story.content_ar
    : (story.content_en || story.content_ar);

  const category = document.createElement('small');
  category.textContent = story.category || '';

  card.append(title, category, content);
  return card;
}

/* عرض القصص */

function renderStories() {
  const latest = document.querySelector('.latest .empty-state');

  if (latest) {
    latest.innerHTML = '';

    if (allStories.length === 0) {
      latest.innerHTML = `
        <span>📜</span>
        <h3>${lang === 'ar' ? 'الحكايات قادمة' : 'Stories are coming soon'}</h3>
        <p>${lang === 'ar' ? 'ستظهر هنا القصص المنشورة قريبًا.' : 'Published stories will appear here soon.'}</p>
      `;
    } else {
      allStories.slice(0, 6).forEach(story => {
        latest.appendChild(createStoryCard(story));
      });
    }
  }

  const eraCards = document.querySelectorAll('#eras .era-grid .era-card');

  FOLDERS.forEach((folder, index) => {
    const folderStories = allStories.filter(story =>
      (story.category || '').trim() === folder.ar ||
      (story.category || '').trim() === folder.en
    );

    const originalCard = eraCards[index];
    if (!originalCard) return;

    let container = originalCard.querySelector('.folder-stories');

    if (!container) {
      container = document.createElement('div');
      container.className = 'folder-stories';
      originalCard.appendChild(container);
    }

    container.innerHTML = '';

    if (folderStories.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = lang === 'ar'
        ? 'لا توجد قصص في هذا المجلد حتى الآن.'
        : 'No stories in this folder yet.';
      container.appendChild(empty);
    } else {
      folderStories.forEach(story => {
        container.appendChild(createStoryCard(story));
      });
    }
  });
}

/* إدارة القصص */

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

    const category = document.createElement('p');
    category.textContent = 'المجلد: ' + story.category;

    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.className = 'gold-btn';
    publishButton.textContent = story.published ? 'إرجاع للمسودات' : 'نشر القصة';

    publishButton.onclick = async () => {
      const { data: updated, error: updateError } = await db
        .from('stories')
        .update({ published: !story.published })
        .eq('id', story.id)
        .select('id');

      if (updateError || !updated?.length) {
        alert('تعذر تحديث القصة: ' + (updateError?.message || 'لم يتم التحديث'));
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
      if (!confirm('هل تريد حذف القصة نهائيًا؟')) return;

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

    item.append(title, status, category, publishButton, deleteButton);
    container.appendChild(item);
  });
}

/* استعادة الجلسة */

async function initializeApp() {
  try {
    const { data: { user } } = await db.auth.getUser();

    if (user) {
      await checkAdmin();
    }

    updateLoginButton();
    await loadStories();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

initializeApp();

console.log('Qessat Masr - Clean App Loaded');
