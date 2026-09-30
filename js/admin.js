document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const dashboard = document.getElementById('dashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginSubmit = document.getElementById('loginSubmit');
  const userEmailLabel = document.getElementById('userEmailLabel');
  const logoutBtn = document.getElementById('logoutBtn');

  const listLoading = document.getElementById('listLoading');
  const projectList = document.getElementById('projectList');
  const emptyState = document.getElementById('emptyState');
  const addProjectBtn = document.getElementById('addProjectBtn');
  const categoryFilters = document.getElementById('categoryFilters');
  let activeCategory = 'all';

  const formModal = document.getElementById('formModal');
  const formModalBackdrop = document.getElementById('formModalBackdrop');
  const formModalClose = document.getElementById('formModalClose');
  const formModalTitle = document.getElementById('formModalTitle');
  const projectForm = document.getElementById('projectForm');
  const formError = document.getElementById('formError');
  const formCancelBtn = document.getElementById('formCancelBtn');
  const formSubmitBtn = document.getElementById('formSubmitBtn');

  const imageList = document.getElementById('imageList');
  const imageInput = document.getElementById('imageInput');
  const uploadBox = document.getElementById('uploadBox');
  const toast = document.getElementById('toast');

  const CATEGORY_TH = {
    construction: 'รับเหมาก่อสร้าง/ต่อเติม',
    interior: 'ตกแต่งภายใน',
    furniture: 'เฟอร์นิเจอร์ Built-in',
    garden: 'จัดสวน',
    design: 'ออกแบบ (แบบเสนองาน/คอนเซปต์)'
  };

  let currentImages = [];
  let allProjects = [];

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toast.hidden = true; }, 2600);
  };

  /* ===== Auth ===== */
  auth.onAuthStateChanged((user) => {
    if (user) {
      loginScreen.hidden = true;
      dashboard.hidden = false;
      userEmailLabel.textContent = user.email;
      loadProjects();
    } else {
      loginScreen.hidden = false;
      dashboard.hidden = true;
    }
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.textContent = '';
    loginSubmit.disabled = true;
    loginSubmit.textContent = 'กำลังเข้าสู่ระบบ...';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    auth.signInWithEmailAndPassword(email, password)
      .catch((err) => {
        loginError.textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        console.error(err);
      })
      .finally(() => {
        loginSubmit.disabled = false;
        loginSubmit.textContent = 'เข้าสู่ระบบ';
      });
  });

  logoutBtn.addEventListener('click', () => auth.signOut());

  /* ===== Load & render project list ===== */
  async function loadProjects() {
    listLoading.hidden = false;
    projectList.innerHTML = '';
    try {
      const snapshot = await db.collection('portfolio').get();
      allProjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      emptyState.hidden = allProjects.length > 0;

      const CATEGORY_ORDER = ['construction', 'interior', 'furniture', 'garden', 'design'];
      const groups = new Map();
      CATEGORY_ORDER.forEach((cat) => groups.set(cat, []));
      allProjects.forEach((p) => {
        if (!groups.has(p.category)) groups.set(p.category, []);
        groups.get(p.category).push(p);
      });

      groups.forEach((projects, category) => {
        if (!projects.length) return;

        const section = document.createElement('div');
        section.className = 'admin-group';
        section.dataset.category = category;
        section.innerHTML = `
          <div class="admin-group__head">
            <h2>${CATEGORY_TH[category] || category}</h2>
            <span class="admin-group__count">${projects.length} รายการ</span>
          </div>
          <div class="admin-cards"></div>`;

        const cardsWrap = section.querySelector('.admin-cards');
        projects.forEach((p) => {
          const card = document.createElement('div');
          card.className = 'admin-card';
          card.innerHTML = `
            <div class="admin-card__thumb-wrap">
              <img class="admin-card__thumb" src="${(p.images && p.images[0]) || ''}" alt="">
            </div>
            <div class="admin-card__body">
              <h3>${p.title_th || p.title_en || '(ไม่มีชื่อ)'}</h3>
              <div class="admin-card__meta">
                <span>ปี ${p.year}</span>
                <span>${p.location_th || p.location_en || ''}</span>
              </div>
            </div>
            <div class="admin-card__actions">
              <button type="button" class="admin-btn admin-btn--outline" data-edit="${p.id}">แก้ไข</button>
              <button type="button" class="admin-btn admin-btn--danger" data-delete="${p.id}">ลบ</button>
            </div>`;
          cardsWrap.appendChild(card);
        });

        projectList.appendChild(section);
      });

      projectList.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => openForm(btn.getAttribute('data-edit')));
      });
      projectList.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', () => deleteProject(btn.getAttribute('data-delete')));
      });

      applyCategoryFilter();
    } catch (err) {
      console.error(err);
      showToast('โหลดข้อมูลผิดพลาด: ' + err.message);
    } finally {
      listLoading.hidden = true;
    }
  }

  function applyCategoryFilter() {
    const groupsEl = projectList.querySelectorAll('.admin-group');
    let visibleCount = 0;
    groupsEl.forEach((el) => {
      const match = activeCategory === 'all' || el.dataset.category === activeCategory;
      el.hidden = !match;
      if (match) visibleCount++;
    });
    emptyState.hidden = visibleCount > 0;
    emptyState.textContent = allProjects.length === 0
      ? 'ยังไม่มีผลงาน กดปุ่ม "+ เพิ่มผลงานใหม่" เพื่อเริ่มเพิ่มข้อมูล'
      : 'ยังไม่มีผลงานในหมวดหมู่นี้';
  }

  categoryFilters.querySelectorAll('.admin-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryFilters.querySelectorAll('.admin-filter').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCategory = btn.getAttribute('data-filter');
      applyCategoryFilter();
    });
  });

  async function deleteProject(id) {
    if (!confirm('ยืนยันลบผลงานนี้? การลบไม่สามารถย้อนกลับได้')) return;
    try {
      await db.collection('portfolio').doc(id).delete();
      showToast('ลบผลงานเรียบร้อย');
      loadProjects();
    } catch (err) {
      console.error(err);
      showToast('ลบไม่สำเร็จ: ' + err.message);
    }
  }

  /* ===== Add / Edit form ===== */
  addProjectBtn.addEventListener('click', () => openForm(null));
  formModalClose.addEventListener('click', closeForm);
  formModalBackdrop.addEventListener('click', closeForm);
  formCancelBtn.addEventListener('click', closeForm);

  function openForm(id) {
    formError.textContent = '';
    projectForm.reset();
    currentImages = [];

    if (id) {
      const p = allProjects.find((x) => x.id === id);
      formModalTitle.textContent = 'แก้ไขผลงาน';
      document.getElementById('projectId').value = id;
      document.getElementById('fieldCategory').value = p.category || 'interior';
      document.getElementById('fieldYear').value = p.year || new Date().getFullYear();
      document.getElementById('fieldTitleTh').value = p.title_th || '';
      document.getElementById('fieldLocationTh').value = p.location_th || '';
      document.getElementById('fieldAreaTh').value = p.area_th || '';
      document.getElementById('fieldDurationTh').value = p.duration_th || '';
      document.getElementById('fieldTypeTh').value = p.type_th || '';
      document.getElementById('fieldDescTh').value = p.desc_th || '';
      document.getElementById('fieldSpecsTh').value = (p.specs_th || []).join('\n');
      document.getElementById('fieldTitleEn').value = p.title_en || '';
      document.getElementById('fieldLocationEn').value = p.location_en || '';
      document.getElementById('fieldAreaEn').value = p.area_en || '';
      document.getElementById('fieldDurationEn').value = p.duration_en || '';
      document.getElementById('fieldTypeEn').value = p.type_en || '';
      document.getElementById('fieldDescEn').value = p.desc_en || '';
      document.getElementById('fieldSpecsEn').value = (p.specs_en || []).join('\n');
      currentImages = [...(p.images || [])];
    } else {
      formModalTitle.textContent = 'เพิ่มผลงานใหม่';
      document.getElementById('projectId').value = '';
      document.getElementById('fieldYear').value = new Date().getFullYear();
    }

    renderImageList();
    formModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeForm() {
    formModal.hidden = true;
    document.body.style.overflow = '';
  }

  function renderImageList() {
    imageList.innerHTML = '';
    currentImages.forEach((url, i) => {
      const item = document.createElement('div');
      item.className = 'admin-image-item' + (i === 0 ? ' admin-image-item--cover' : '');
      item.innerHTML = `<img src="${url}" alt=""><button type="button" data-remove="${i}">✕</button>`;
      imageList.appendChild(item);
    });
    imageList.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentImages.splice(Number(btn.getAttribute('data-remove')), 1);
        renderImageList();
      });
    });
  }

  uploadBox.addEventListener('click', (e) => {
    if (e.target === imageInput) return;
  });

  imageInput.addEventListener('change', async () => {
    const files = Array.from(imageInput.files || []);
    if (!files.length) return;
    uploadBox.textContent = `กำลังอัปโหลด ${files.length} รูป...`;
    try {
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        currentImages.push(url);
        renderImageList();
      }
      showToast('อัปโหลดรูปสำเร็จ');
    } catch (err) {
      console.error(err);
      showToast('อัปโหลดรูปผิดพลาด: ' + err.message);
    } finally {
      uploadBox.textContent = '+ อัปโหลดรูปภาพ (เลือกได้หลายรูป)';
      uploadBox.appendChild(imageInput);
      imageInput.value = '';
    }
  });

  async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const data = await res.json();
    return data.secure_url;
  }

  const splitLines = (value) => value.split('\n').map((s) => s.trim()).filter(Boolean);

  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';

    if (currentImages.length === 0) {
      formError.textContent = 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป';
      return;
    }

    const id = document.getElementById('projectId').value;
    const data = {
      category: document.getElementById('fieldCategory').value,
      year: Number(document.getElementById('fieldYear').value),
      title_th: document.getElementById('fieldTitleTh').value.trim(),
      location_th: document.getElementById('fieldLocationTh').value.trim(),
      area_th: document.getElementById('fieldAreaTh').value.trim(),
      duration_th: document.getElementById('fieldDurationTh').value.trim(),
      type_th: document.getElementById('fieldTypeTh').value.trim(),
      desc_th: document.getElementById('fieldDescTh').value.trim(),
      specs_th: splitLines(document.getElementById('fieldSpecsTh').value),
      title_en: document.getElementById('fieldTitleEn').value.trim(),
      location_en: document.getElementById('fieldLocationEn').value.trim(),
      area_en: document.getElementById('fieldAreaEn').value.trim(),
      duration_en: document.getElementById('fieldDurationEn').value.trim(),
      type_en: document.getElementById('fieldTypeEn').value.trim(),
      desc_en: document.getElementById('fieldDescEn').value.trim(),
      specs_en: splitLines(document.getElementById('fieldSpecsEn').value),
      images: currentImages,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    formSubmitBtn.disabled = true;
    formSubmitBtn.textContent = 'กำลังบันทึก...';

    try {
      if (id) {
        await db.collection('portfolio').doc(id).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('portfolio').add(data);
      }
      showToast('บันทึกผลงานเรียบร้อย');
      closeForm();
      loadProjects();
    } catch (err) {
      console.error(err);
      formError.textContent = 'บันทึกไม่สำเร็จ: ' + err.message;
    } finally {
      formSubmitBtn.disabled = false;
      formSubmitBtn.textContent = 'บันทึก';
    }
  });

});
