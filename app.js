
/* =========================================
   QESSAT MASR
   Complete App - Stable Version
   Supabase + Auth + Admin + Stories
   Folders + Full Screen Story Reader
========================================= */

const SUPABASE_URL = 'https://bhudyegwlztfslhkbdjf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TcmwO6zoiB2UbpkbAIjofA_UGxcBLgD';

const $ = id => document.getElementById(id);

let lang = 'ar';
let currentUser = null;
let isAdmin = false;
let allStories = [];
let currentFolder = null;
let currentStory = null;
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

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

function showError(message) {
  console.error(message);
  alert(message);
}

function text(ar, en) {
  return lang === 'ar' ? ar : en;
}

/* =========================================
   السنة
========================================= */

if ($('year')) {
  $('year').textContent = new Date().getFullYear();
}

/* =========================================
   الموسيقى
========================================= */

const audio = $('introAudio');
const musicBtn = $('musicBtn');

if (musicBtn && audio) {
  musicBtn.addEventListener('click', async () => {
    try {
      if (audio.paused) {
        await audio.play();
        musicBtn.textContent = text('Ⅱ إيقاف الموسيقى', 'Ⅱ Pause Music');
      } else {
        audio.pause();
        musicBtn.textContent = text('▶ تشغيل الموسيقى', '▶ Play Music');
      }
    } catch (error) {
      showError('تعذر تشغيل الموسيقى');
    }
  });
}

/* =========================================
   دخول الموقع
========================================= */

const splash = $('splash');
const app = $('app');
const enterBtn = $('enterBtn');

if (enterBtn) {
  enterBtn.addEventListener('click', async () => {
    splash?.classList.add('hidden');
    app?.classList.remove('hidden');

    window.scrollTo(0, 0);

    if (audio && audio.paused) {
      audio.play().then(() => {
        if (musicBtn) {
          musicBtn.textContent = text(
            'Ⅱ إيقاف الموسيقى',
            'Ⅱ Pause Music'
          );
        }
      }).catch(() => {});
    }

    await loadStories();
  });
}

/* =========================================
   تغيير اللغة
========================================= */

const langBtn = $('langBtn');

function updateLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-ar]').forEach(element => {
    const value = element.dataset[lang];

    if (value) {
      element.textContent = value;
    }
  });

  if (langBtn) {
    langBtn.textContent = lang === 'ar' ? 'EN' : 'عربي';
  }

  updateLoginButton();

  if (explorerOpen) {
    renderExplorer();
  }
}

if (langBtn) {
  langBtn.addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    updateLanguage();
  });
}

/* =========================================
   تسجيل الدخول
========================================= */

const loginDialog = $('loginDialog');
const loginBtn = $('loginBtn');

function showLogin() {
  if (!loginDialog) {
    showError('نافذة تسجيل الدخول غير موجودة');
    return;
  }

  loginDialog.innerHTML = `
    <form class="dialog-card" id="authForm">
      <button type="button" class="close-btn" id="closeAuth">×</button>

      <p class="eyebrow">QESSAT MASR</p>
      <h2>${text('تسجيل الدخول', 'Login')}</h2>

      <label>
        ${text('البريد الإلكتروني', 'Email')}
        <input id="authEmail" type="email" required>
      </label>

      <label>
        ${text('كلمة المرور', 'Password')}
        <input id="authPassword" type="password" minlength="6" required>
      </label>

      <button class="gold-btn" type="submit">
        ${text('تسجيل الدخول', 'Login')}
      </button>

      <button class="outline-btn" type="button" id="registerBtn">
        ${text('إنشاء حساب جديد', 'Create Account')}
      </button>

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
      message.textContent = text(
        'اكتب بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل',
        'Enter a valid email and a password of at least 6 characters'
      );
      return;
    }

    message.textContent = text(
      'جارٍ إنشاء الحساب...',
      'Creating account...'
    );

    const { error } = await db.auth.signUp({
      email,
      password
    });

    message.textContent = error
      ? text('خطأ: ', 'Error: ') + error.message
      : text(
          'تم إنشاء الحساب. راجع بريدك إذا طُلب التأكيد.',
          'Account created. Check your email if confirmation is required.'
        );
  };

  $('authForm').onsubmit = async event => {
    event.preventDefault();

    const email = $('authEmail').value.trim();
    const password = $('authPassword').value;
    const message = $('authMessage');

    message.textContent = text(
      'جارٍ تسجيل الدخول...',
      'Signing in...'
    );

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      message.textContent = text(
        'تعذر الدخول: ',
        'Login failed: '
      ) + error.message;
      return;
    }

    currentUser = data.user;

    await checkAdmin();

    loginDialog.close();
    updateLoginButton();

    if (isAdmin) {
      showAdminPanel();
    } else {
      alert(text('تم تسجيل الدخول بنجاح', 'Login successful'));
    }
  };
}

/* =========================================
   زر الحساب
========================================= */

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

/* =========================================
   التحقق من المدير
========================================= */

async function checkAdmin() {
  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) {
    currentUser = null;
    isAdmin = false;
    return;
  }

  currentUser = authData.user;

  const { data, error } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', currentUser.id)
    .maybeSingle();

  isAdmin = !error && !!data;
}

/* =========================================
   تحديث زر الحساب
========================================= */

function updateLoginButton() {
  if (!loginBtn) return;

  if (!currentUser) {
    loginBtn.textContent = text('تسجيل الدخول', 'Log in');
  } else if (isAdmin) {
    loginBtn.textContent = text('لوحة التحكم', 'Admin Panel');
  } else {
    loginBtn.textContent = text('حسابي', 'My Account');
  }
}

/* =========================================
   قائمة المستخدم
========================================= */

function showUserMenu() {
  loginDialog.innerHTML = `
    <div class="dialog-card">
      <button class="close-btn" id="closeUser">×</button>

      <h2>${text('حسابك', 'Your Account')}</h2>
      <p id="userEmail"></p>

      <button class="gold-btn" id="logoutBtn">
        ${text('تسجيل الخروج', 'Log out')}
      </button>
    </div>
  `;

  $('userEmail').textContent = currentUser.email;

  loginDialog.showModal();

  $('closeUser').onclick = () => loginDialog.close();
  $('logoutBtn').onclick = logoutUser;
}

/* =========================================
   تسجيل الخروج
========================================= */

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

  alert(text('تم تسجيل الخروج', 'Logged out successfully'));
}

/* =========================================
   لوحة الإدارة
========================================= */

function showAdminPanel() {
  if (!isAdmin || !app) {
    alert(text('هذه الصفحة للمدير فقط', 'Admin access only'));
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
      <p class="eyebrow">${text('الإدارة', 'Administration')}</p>
      <h2>${text('لوحة التحكم', 'Admin Panel')}</h2>
    </div>

    <form id="storyForm" class="dialog-card">

      <h3>${text('إضافة حكاية جديدة', 'Add New Story')}</h3>

      <label>
        ${text('عنوان القصة بالعربية', 'Arabic Story Title')}
        <input id="storyTitleAr" required>
      </label>

      <label>
        ${text('عنوان القصة بالإنجليزية', 'English Story Title')}
        <input id="storyTitleEn">
      </label>

      <label>
        ${text('محتوى القصة بالعربية', 'Arabic Story Content')}
        <textarea id="storyContentAr" required rows="6"></textarea>
      </label>

      <label>
        ${text('محتوى القصة بالإنجليزية', 'English Story Content')}
        <textarea id="storyContentEn" rows="6"></textarea>
      </label>

      <label>
        ${text('اختر مجلد القصة', 'Choose Story Folder')}
        <select id="storyCategory" required>
          ${FOLDERS.map(folder => `
            <option value="${folder.ar}">
              ${folderTitle(folder)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        ${text('رابط صورة الغلاف', 'Cover Image URL')}
        <input id="storyImage" type="url">
      </label>

      <label>
        <input id="storyPublished" type="checkbox">
        ${text('نشر القصة مباشرة', 'Publish immediately')}
      </label>

      <button class="gold-btn" type="submit">
        ${text('حفظ القصة', 'Save Story')}
      </button>

      <p id="storyMessage"></p>
    </form>

    <h3>${text('إدارة القصص', 'Manage Stories')}</h3>

    <div id="adminStories">
      ${text('جارٍ تحميل القصص...', 'Loading stories...')}
    </div>

    <button type="button" class="outline-btn" id="refreshStories">
      ${text('تحديث القصص', 'Refresh Stories')}
    </button>

    <button type="button" class="outline-btn" id="adminLogout">
      ${text('تسجيل الخروج', 'Log out')}
    </button>
  `;

  $('storyForm').onsubmit = saveStory;
  $('adminLogout').onclick = logoutUser;
  $('refreshStories').onclick = loadAdminStories;

  panel.scrollIntoView({ behavior: 'smooth' });

  loadAdminStories();
}

/* =========================================
   حفظ قصة جديدة
========================================= */

async function saveStory(event) {
  event.preventDefault();

  if (!isAdmin) {
    alert('غير مسموح');
    return;
  }

  const message = $('storyMessage');

  message.textContent = text(
    'جارٍ حفظ القصة...',
    'Saving story...'
  );

  const story = {
    title_ar: $('storyTitleAr').value.trim(),
    title_en: $('storyTitleEn').value.trim(),
    content_ar: $('storyContentAr').value.trim(),
    content_en: $('storyContentEn').value.trim(),
    category: $('storyCategory').value,
    cover_image: $('storyImage').value.trim() || null,
    published: $('storyPublished').checked
  };

  const { error } = await db
    .from('stories')
    .insert([story]);

  if (error) {
    message.textContent = text(
      'فشل الحفظ: ',
      'Save failed: '
    ) + error.message;
    return;
  }

  message.textContent = text(
    'تم حفظ القصة بنجاح',
    'Story saved successfully'
  );

  $('storyForm').reset();

  await loadAdminStories();
  await loadStories();
}

/* =========================================
   تحميل القصص المنشورة
========================================= */

async function loadStories() {
  const { data, error } = await db
    .from('stories')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Stories loading error:', error.message);
    return;
  }

  allStories = data || [];

  renderStories();
}

/* =========================================
   أدوات اللغة والقصص
========================================= */

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

    return category === folder.ar ||
           category === folder.en ||
           category === folder.id;
  });
}

/* =========================================
   إنشاء شاشة القصص
========================================= */

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
      background: rgba(23,19,13,.98);
      border-bottom: 1px solid rgba(212,175,100,.3);
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

/* =========================================
   فتح مجلد
========================================= */

function openFolder(folder) {
  if (!folder) return;

  currentFolder = folder;
  currentStory = null;
  explorerOpen = true;

  createExplorer();

  $('storyExplorer').classList.add('active');

  renderExplorer();

  window.scrollTo(0, 0);
}

/* =========================================
   إغلاق شاشة القصص
========================================= */

function closeExplorer() {
  explorerOpen = false;
  currentFolder = null;
  currentStory = null;

  $('storyExplorer')?.classList.remove('active');
}

/* =========================================
   عرض المجلد أو القصة
========================================= */

function renderExplorer() {
  const explorer = $('storyExplorer');

  if (!explorer || !currentFolder) return;

  explorer.dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (currentStory) {
    renderReader();
    return;
  }

  const stories = getFolderStories(currentFolder);

  explorer.innerHTML = `
    <div class="explorer-header">
      <button class="explorer-back" id="explorerBack">
        ${text('← رجوع', '← Back')}
      </button>

      <h2 class="explorer-title">
        ${folderTitle(currentFolder)}
      </h2>
    </div>

    <div class="explorer-content">
      <div class="explorer-story-list" id="explorerStoryList"></div>
    </div>
  `;

  $('explorerBack').onclick = closeExplorer;

  const list = $('explorerStoryList');

  if (!stories.length) {
    list.innerHTML = `
      <div class="explorer-empty">
        <div style="font-size:45px">📜</div>
        <h3>
          ${text(
            'لا توجد قصص في هذا المجلد حتى الآن',
            'No stories in this folder yet'
          )}
        </h3>
      </div>
    `;
    return;
  }

  stories.forEach(story => {
    const card = document.createElement('article');
    card.className = 'explorer-story-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    if (story.cover_image) {
      const image = document.createElement('img');
      image.src = story.cover_image;
      image.alt = storyTitle(story);
      image.loading = 'lazy';
      image.onerror = () => image.remove();

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

    card.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openStory(story);
      }
    };

    list.appendChild(card);
  });
}

/* =========================================
   فتح القصة
========================================= */

function openStory(story) {
  if (!story) return;

  currentStory = story;

  renderReader();
}

/* =========================================
   قارئ القصة كامل الشاشة
========================================= */

function renderReader() {
  const explorer = $('storyExplorer');

  if (!explorer || !currentStory) return;

  explorer.innerHTML = `
    <div class="explorer-header">
      <button class="explorer-back" id="readerBack">
        ${text('← رجوع للقصص', '← Back to stories')}
      </button>

      <h2 class="explorer-title">
        ${text('قراءة القصة', 'Read Story')}
      </h2>
    </div>

    <article class="explorer-reader" id="readerContent"></article>
  `;

  $('readerBack').onclick = () => {
    currentStory = null;
    renderExplorer();
  };

  const reader = $('readerContent');
  const story = currentStory;

  if (story.cover_image) {
    const image = document.createElement('img');
    image.className = 'reader-cover';
    image.src = story.cover_image;
    image.alt = storyTitle(story);
    image.onerror = () => image.remove();

    reader.appendChild(image);
  }

  const title = document.createElement('h1');
  title.className = 'reader-title';
  title.textContent = storyTitle(story);

  const category = document.createElement('div');
  category.className = 'reader-category';
  category.textContent = folderTitle(currentFolder);

  const content = document.createElement('div');
  content.className = 'reader-text';
  content.textContent = storyContent(story);

  reader.append(title, category, content);

  explorer.scrollTop = 0;
}

/* =========================================
   ربط مجلدات العصور
========================================= */

function setupFolderNavigation() {
  const eraGrid = document.querySelector('#eras .era-grid');

  if (!eraGrid || eraGrid.dataset.navigationReady === 'true') {
    return;
  }

  eraGrid.dataset.navigationReady = 'true';

  eraGrid.addEventListener('click', event => {
    const card = event.target.closest('.era-card');

    if (!card || !eraGrid.contains(card)) return;

    const cards = Array.from(eraGrid.children)
      .filter(element => element.classList.contains('era-card'));

    const index = cards.indexOf(card);

    if (index === -1 || !FOLDERS[index]) return;

    event.preventDefault();

    openFolder(FOLDERS[index]);
  });

  eraGrid.querySelectorAll('.era-card').forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      card.click();
    });
  });
}

/* =========================================
   عرض المكتبة
========================================= */

function renderStories() {
  const latest = document.querySelector('.latest');

  if (latest) {
    latest.style.display = 'none';
  }

  document.querySelectorAll(
    '#eras .era-grid .folder-stories'
  ).forEach(element => element.remove());

  setupFolderNavigation();
}

/* =========================================
   إدارة القصص
========================================= */

async function loadAdminStories() {
  if (!isAdmin) return;

  const container = $('adminStories');

  if (!container) return;

  container.textContent = text(
    'جارٍ تحميل القصص...',
    'Loading stories...'
  );

  const { data, error } = await db
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.textContent =
      text('خطأ تحميل القصص: ', 'Loading error: ') +
      error.message;
    return;
  }

  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.textContent = text(
      'لا توجد قصص حتى الآن',
      'No stories yet'
    );
    return;
  }

  data.forEach(story => {
    const item = document.createElement('article');
    item.className = 'era-card';

    const title = document.createElement('h3');
    title.textContent = story.title_ar || story.title_en;

    const status = document.createElement('p');
    status.textContent = story.published
      ? text('الحالة: منشورة', 'Status: Published')
      : text('الحالة: مسودة', 'Status: Draft');

    const category = document.createElement('p');
    category.textContent =
      text('المجلد: ', 'Folder: ') + story.category;

    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.className = 'gold-btn';

    publishButton.textContent = story.published
      ? text('إرجاع للمسودات', 'Unpublish')
      : text('نشر القصة', 'Publish Story');

    publishButton.onclick = async () => {
      if (!isAdmin) return;

      publishButton.disabled = true;

      const { data: updated, error: updateError } = await db
        .from('stories')
        .update({ published: !story.published })
        .eq('id', story.id)
        .select('id');

      if (updateError || !updated?.length) {
        alert(
          text('تعذر تحديث القصة: ', 'Update failed: ') +
          (updateError?.message || 'لم يتم التحديث')
        );

        publishButton.disabled = false;
        return;
      }

      await loadAdminStories();
      await loadStories();
    };

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'outline-btn';
    deleteButton.textContent = text('حذف القصة', 'Delete Story');

    deleteButton.onclick = async () => {
      if (!isAdmin) return;

      if (!confirm(text(
        'هل تريد حذف القصة نهائيًا؟',
        'Do you want to permanently delete this story?'
      ))) {
        return;
      }

      const { error: deleteError } = await db
        .from('stories')
        .delete()
        .eq('id', story.id);

      if (deleteError) {
        alert(
          text('تعذر الحذف: ', 'Delete failed: ') +
          deleteError.message
        );
        return;
      }

      await loadAdminStories();
      await loadStories();
    };

    item.append(
      title,
      status,
      category,
      publishButton,
      deleteButton
    );

    container.appendChild(item);
  });
}

/* =========================================
   استعادة الجلسة وبدء التطبيق
========================================= */

async function initializeApp() {
  try {
    const { data, error } = await db.auth.getUser();

    if (error) {
      console.warn('Auth:', error.message);
    }

    if (data?.user) {
      await checkAdmin();
    }

    updateLanguage();
    updateLoginButton();
    setupFolderNavigation();

    await loadStories();

  } catch (error) {
    console.error('Initialization error:', error);
  }
}

/* =========================================
   اختصار زر الرجوع في الهاتف
========================================= */

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && explorerOpen) {
    closeExplorer();
  }
});

/* =========================================
   تشغيل التطبيق
========================================= */

initializeApp();

console.log('Qessat Masr - App Ready');
