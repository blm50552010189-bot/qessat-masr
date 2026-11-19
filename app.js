
/* =====================================
   QESSAT MASR - COMPLETE APP
   Auth + Admin + Folder Navigation
   Full Screen Story Reader
===================================== */

const SUPABASE_URL = 'https://bhudyegwlztfslhkbdjf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodWR5ZWd3bHp0ZnNsaGtiZGpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMzA0NjYsImV4cCI6MjExMDYwNjQ2Nn0.NPEPXXZ5RL0LHHAcjEdE4ljEK2s_ekPjtPSfJDzTktI';

const $ = id => document.getElementById(id);

let lang = 'ar';
let currentUser = null;
let isAdmin = false;
let allStories = [];
let currentFolder = null;
let explorerOpen = false;

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

    if (explorerOpen) {
      renderExplorer();
    }
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

/* أدوات عرض النصوص */

function storyTitle(story) {
  return lang === 'ar'
    ? (story.title_ar || story.title_en || '')
    : (story.title_en || story.title_ar || '');
}

function storyContent(story) {
  return lang === 'ar'
    ? (story.content_ar || story.content_en || '')
    : (story.content_en || story.content_ar || '');
}

function folderTitle(folder) {
  return lang === 'ar' ? folder.ar : folder.en;
}

function getFolderStories(folder) {
  return allStories.filter(story => {
    const category = (story.category || '').trim();

    return category === folder.ar || category === folder.en;
  });
}

/* إنشاء شاشة عرض القصص */

function createExplorer() {
  if ($('storyExplorer')) return;

  const style = document.createElement('style');

  style.id = 'storyExplorerStyle';
  style.textContent = `
    #storyExplorer {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #17130d;
      color: #f5ead1;
      overflow-y: auto;
      display: none;
      font-family: inherit;
    }

    #storyExplorer.active {
      display: block;
    }

    #storyExplorer .explorer-header {
      position: sticky;
      top: 0;
      z-index: 5;
      background: rgba(23,19,13,.97);
      border-bottom: 1px solid rgba(212,175,100,.25);
      padding: 15px 18px;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    #storyExplorer .explorer-back {
      border: 1px solid #b99755;
      background: transparent;
      color: #e6c681;
      border-radius: 10px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 15px;
    }

    #storyExplorer .explorer-title {
      color: #e6c681;
      font-size: 19px;
      margin: 0;
    }

    #storyExplorer .explorer-content {
      max-width: 950px;
      margin: auto;
      padding: 22px;
    }

    #storyExplorer .explorer-story-list {
      display: grid;
      grid-template-columns: repeat(auto-fit,minmax(230px,1fr));
      gap: 18px;
    }

    #storyExplorer .explorer-story-card {
      background: #262016;
      border: 1px solid rgba(212,175,100,.25);
      border-radius: 15px;
      overflow: hidden;
      cursor: pointer;
      transition: .2s;
    }

    #storyExplorer .explorer-story-card:hover {
      border-color: #d5b36c;
      transform: translateY(-3px);
    }

    #storyExplorer .explorer-story-card img {
      display: block;
      width: 100%;
      height: 175px;
      object-fit: cover;
    }

    #storyExplorer .explorer-story-info {
      padding: 15px;
    }

    #storyExplorer .explorer-story-info h3 {
      color: #e6c681;
      margin: 0 0 10px;
    }

    #storyExplorer .explorer-story-info p {
      color: #d4c9b2;
      line-height: 1.7;
      margin: 0;
    }

    #storyExplorer .explorer-reader {
      max-width: 850px;
      margin: auto;
      padding: 20px;
    }

    #storyExplorer .reader-cover {
      display: block;
      width: 100%;
      max-height: 440px;
      object-fit: cover;
      border-radius: 16px;
      margin: 0 auto 25px;
    }

    #storyExplorer .reader-title {
      color: #e6c681;
      font-size: clamp(25px,5vw,38px);
      line-height: 1.5;
      margin: 15px 0;
    }

    #storyExplorer .reader-category {
      color: #bda16c;
      margin-bottom: 25px;
    }

    #storyExplorer .reader-text {
      color: #f0e6d4;
      font-size: 19px;
      line-height: 2.1;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding-bottom: 50px;
    }

    #storyExplorer .explorer-empty {
      text-align: center;
      padding: 55px 15px;
      color: #d5c39e;
      line-height: 2;
    }

    #eras .era-grid .era-card {
      cursor: pointer;
    }

    #eras .era-grid .era-card .folder-stories {
      display: none !important;
    }

    @media(max-width:600px) {
      #storyExplorer .explorer-content {
        padding: 15px;
      }

      #storyExplorer .explorer-reader {
        padding: 15px;
      }

      #storyExplorer .reader-text {
        font-size: 17px;
      }

      #storyExplorer .reader-cover {
        max-height: 300px;
      }
    }
  `;

  document.head.appendChild(style);

  const explorer = document.createElement('div');
  explorer.id = 'storyExplorer';
  explorer.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.body.appendChild(explorer);
}

/* فتح مجلد */

function openFolder(folder) {
  currentFolder = folder;
  explorerOpen = true;

  createExplorer();

  const explorer = $('storyExplorer');
  explorer.classList.add('active');

  renderExplorer();

  window.scrollTo(0, 0);
}

/* إغلاق شاشة العرض */

function closeExplorer() {
  explorerOpen = false;
  currentFolder = null;

  $('storyExplorer')?.classList.remove('active');
}

/* رسم شاشة المجلد أو القصة */

function renderExplorer() {
  const explorer = $('storyExplorer');
  if (!explorer || !currentFolder) return;

  explorer.dir = lang === 'ar' ? 'rtl' : 'ltr';

  const stories = getFolderStories(currentFolder);

  explorer.innerHTML = `
    <div class="explorer-header">
      <button class="explorer-back" id="explorerBack">
        ${lang === 'ar' ? '← رجوع' : '← Back'}
      </button>
      <h2 class="explorer-title">${folderTitle(currentFolder)}</h2>
    </div>

    <div class="explorer-content" id="explorerContent">
      <div class="explorer-story-list" id="explorerStoryList"></div>
    </div>
  `;

  $('explorerBack').onclick = closeExplorer;

  const list = $('explorerStoryList');

  if (!stories.length) {
    list.innerHTML = `
      <div class="explorer-empty">
        <div style="font-size:45px">📜</div>
        <h3>${lang === 'ar' ? 'لا توجد قصص في هذا المجلد حتى الآن' : 'No stories in this folder yet'}</h3>
      </div>
    `;
    return;
  }

  stories.forEach(story => {
    const card = document.createElement('article');
    card.className = 'explorer-story-card';

    if (story.cover_image) {
      const image = document.createElement('img');
      image.src = story.cover_image;
      image.alt = storyTitle(story);
      image.loading = 'lazy';
      card.appendChild(image);
    }

    const info = document.createElement('div');
    info.className = 'explorer-story-info';

    const title = document.createElement('h3');
    title.textContent = storyTitle(story);

    const preview = document.createElement('p');
    const content = storyContent(story);
    preview.textContent = content.length > 110
      ? content.slice(0, 110) + '...'
      : content;

    info.append(title, preview);
    card.appendChild(info);

    card.onclick = () => openStory(story);

    list.appendChild(card);
  });
}

/* فتح القصة في صفحة مستقلة */

function openStory(story) {
  const explorer = $('storyExplorer');
  if (!explorer) return;

  explorer.innerHTML = `
    <div class="explorer-header">
      <button class="explorer-back" id="readerBack">
        ${lang === 'ar' ? '← رجوع للقصص' : '← Back to stories'}
      </button>
      <h2 class="explorer-title">
        ${lang === 'ar' ? 'قراءة القصة' : 'Read Story'}
      </h2>
    </div>

    <article class="explorer-reader" id="readerContent"></article>
  `;

  $('readerBack').onclick = renderExplorer;

  const reader = $('readerContent');

  if (story.cover_image) {
    const image = document.createElement('img');
    image.className = 'reader-cover';
    image.src = story.cover_image;
    image.alt = storyTitle(story);
    reader.appendChild(image);
  }

  const title = document.createElement('h1');
  title.className = 'reader-title';
  title.textContent = storyTitle(story);

  const category = document.createElement('div');
  category.className = 'reader-category';
  category.textContent = currentFolder
    ? folderTitle(currentFolder)
    : (story.category || '');

  const content = document.createElement('div');
  content.className = 'reader-text';
  content.textContent = storyContent(story);

  reader.append(title, category, content);

  explorer.scrollTop = 0;
}

/* ربط مجلدات العصور */

function setupFolderNavigation() {
  const eraGrid = document.querySelector('#eras .era-grid');

  if (!eraGrid || eraGrid.dataset.navigationReady === 'true') return;

  eraGrid.dataset.navigationReady = 'true';

  eraGrid.addEventListener('click', event => {
    const card = event.target.closest('.era-card');

    if (!card) return;

    const cards = Array.from(eraGrid.querySelectorAll(':scope > .era-card'));
    const index = cards.indexOf(card);

    if (index < 0 || index >= FOLDERS.length) return;

    event.preventDefault();
    event.stopPropagation();

    openFolder(FOLDERS[index]);
  });
}

/* عرض القصص: إخفاء العرض القديم */

function renderStories() {
  const latest = document.querySelector('.latest');

  if (latest) {
    latest.style.display = 'none';
  }

  document.querySelectorAll('#eras .era-grid .era-card').forEach(card => {
    const oldStories = card.querySelector('.folder-stories');

    if (oldStories) {
      oldStories.remove();
    }
  });

  setupFolderNavigation();
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
    setupFolderNavigation();
    await loadStories();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

initializeApp();

console.log('Qessat Masr - Folder Navigation Loaded');
