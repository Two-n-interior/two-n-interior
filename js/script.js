document.addEventListener('DOMContentLoaded', () => {
  /* ===== Sticky navbar shadow ===== */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll);

  /* ===== Scroll progress bar ===== */
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    const updateProgress = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      scrollProgress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress);
    window.addEventListener('resize', updateProgress);
  }

  /* ===== Animated stat counters (count up when scrolled into view) ===== */
  const counterEls = document.querySelectorAll('.hero__stat strong');
  if (counterEls.length && 'IntersectionObserver' in window) {
    const animateCounter = (el) => {
      const raw = el.textContent.trim();
      const match = raw.match(/^(\d+)(.*)$/);
      if (!match) return;
      const target = Number(match[1]);
      const suffix = match[2];
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counterEls.forEach((el) => counterObserver.observe(el));
  }

  /* ===== Hero slider (auto-playing full-screen image slideshow) ===== */
  const heroSlides = document.querySelectorAll('.hero-slider__slide');
  const heroDots = document.querySelectorAll('.hero-slider__dot');

  if (heroSlides.length) {
    let heroIndex = 0;
    let heroTimer = null;

    const showHeroSlide = (index) => {
      heroIndex = index;
      heroSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
      heroDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    };

    const startHeroTimer = () => {
      clearInterval(heroTimer);
      heroTimer = setInterval(() => {
        showHeroSlide((heroIndex + 1) % heroSlides.length);
      }, 5000);
    };

    heroDots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        showHeroSlide(i);
        startHeroTimer();
      });
    });

    startHeroTimer();
  }

  /* ===== Mobile menu toggle ===== */
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');

  hamburger.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  navMenu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ===== Portfolio page (full gallery + modal) ===== */
  const isEN = document.documentElement.lang === 'en';
  const portfolioGrid = document.getElementById('portfolioGrid');

  const mapDocToProject = (doc) => {
    const d = doc.data();
    const labels = isEN ? CATEGORY_LABELS.en : CATEGORY_LABELS.th;
    return {
      id: doc.id,
      category: d.category,
      categoryLabel: labels[d.category] || d.category,
      year: isEN ? String(d.year) : String(Number(d.year) + 543),
      title: (isEN ? d.title_en : d.title_th) || d.title_th || d.title_en,
      location: (isEN ? d.location_en : d.location_th) || d.location_th || d.location_en,
      area: (isEN ? d.area_en : d.area_th) || d.area_th || d.area_en,
      duration: (isEN ? d.duration_en : d.duration_th) || d.duration_th || d.duration_en,
      type: (isEN ? d.type_en : d.type_th) || d.type_th || d.type_en,
      desc: (isEN ? d.desc_en : d.desc_th) || d.desc_th || d.desc_en,
      specs: (isEN ? d.specs_en : d.specs_th) && (isEN ? d.specs_en : d.specs_th).length
        ? (isEN ? d.specs_en : d.specs_th)
        : (d.specs_th || d.specs_en || []),
      images: (d.images || []).map((src) => (isEN && src.startsWith('images/') ? `../${src}` : src))
    };
  };

  const loadPortfolioProjects = async () => {
    try {
      const snapshot = await db.collection('portfolio').get();
      return snapshot.docs.map(mapDocToProject);
    } catch (err) {
      console.error('Could not load portfolio from Firestore.', err);
      return [];
    }
  };

  if (portfolioGrid) {
    loadPortfolioProjects().then(initPortfolioUI);
  }

  function initPortfolioUI(projects) {
    const emptyMsg = document.getElementById('portfolioEmpty');
    const searchInput = document.getElementById('portfolioSearch');
    const pageFilterBtns = document.querySelectorAll('.portfolio-page .portfolio-filter__btn');
    let activeFilter = 'all';

    const requestedFilter = new URLSearchParams(window.location.search).get('filter');
    if (requestedFilter && Array.from(pageFilterBtns).some((b) => b.getAttribute('data-filter') === requestedFilter)) {
      activeFilter = requestedFilter;
    }

    const pinIcon = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>';

    const renderCards = () => {
      const term = (searchInput?.value || '').trim().toLowerCase();
      portfolioGrid.innerHTML = '';
      let count = 0;

      projects.forEach((p) => {
        const matchFilter = activeFilter === 'all' || p.category === activeFilter;
        const matchSearch = !term || p.title.toLowerCase().includes(term) || p.location.toLowerCase().includes(term);
        if (!matchFilter || !matchSearch) return;
        count++;

        const card = document.createElement('div');
        card.className = 'portfolio-item';
        card.setAttribute('data-reveal', '');
        card.innerHTML = `
          <div class="portfolio-item__media">
            <img src="${p.images[0]}" alt="${p.title}" loading="lazy">
            <span class="portfolio-item__badge portfolio-item__badge--category">${p.categoryLabel}</span>
            <span class="portfolio-item__badge portfolio-item__badge--year">${isEN ? p.year : `พ.ศ. ${p.year}`}</span>
            <div class="portfolio-item__overlay">
              <span class="portfolio-item__view">${isEN ? 'View Photos &amp; Details' : 'ดูรูปและรายละเอียด'}</span>
            </div>
            <div class="portfolio-item__meta">
              <span>${pinIcon} ${p.location}</span>
              <span>${p.area}</span>
            </div>
          </div>
          <div class="portfolio-item__body">
            <h3>${p.title}</h3>
            <p>${p.desc}</p>
          </div>`;
        card.addEventListener('click', () => openModal(p));
        portfolioGrid.appendChild(card);
        card.classList.add('is-visible');
      });

      if (emptyMsg) emptyMsg.hidden = count > 0;
    };

    pageFilterBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-filter') === activeFilter);
      btn.addEventListener('click', () => {
        pageFilterBtns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeFilter = btn.getAttribute('data-filter');
        renderCards();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', renderCards);
    }

    /* Modal */
    const modal = document.getElementById('portfolioModal');
    const modalImage = document.getElementById('modalImage');
    const modalThumbs = document.getElementById('modalThumbs');
    const modalCounter = document.getElementById('modalCounter');
    const modalCategory = document.getElementById('modalCategory');
    const modalYear = document.getElementById('modalYear');
    const modalTitle = document.getElementById('modalTitle');
    const modalMetaRow = document.getElementById('modalMetaRow');
    const modalDesc = document.getElementById('modalDesc');
    const modalSpecs = document.getElementById('modalSpecs');
    let currentProject = null;
    let currentIndex = 0;

    const renderModalImage = () => {
      if (!currentProject) return;
      modalImage.src = currentProject.images[currentIndex];
      modalImage.alt = currentProject.title;
      modalCounter.textContent = `${currentIndex + 1} / ${currentProject.images.length}`;
      modalThumbs.querySelectorAll('img').forEach((img, i) => {
        img.classList.toggle('is-active', i === currentIndex);
      });
    };

    function openModal(project) {
      currentProject = project;
      currentIndex = 0;
      modalCategory.textContent = project.categoryLabel;
      modalYear.textContent = isEN ? project.year : `พ.ศ. ${project.year}`;
      modalTitle.textContent = project.title;
      modalDesc.textContent = project.desc;
      modalMetaRow.innerHTML = isEN
        ? `<span>${pinIcon} ${project.location}</span>
        <span>Area: ${project.area}</span>
        <span>Duration: ${project.duration}</span>
        <span>Type: ${project.type}</span>`
        : `<span>${pinIcon} ${project.location}</span>
        <span>พื้นที่: ${project.area}</span>
        <span>ระยะเวลาส่งมอบ: ${project.duration}</span>
        <span>ประเภท: ${project.type}</span>`;
      modalSpecs.innerHTML = project.specs.map((s) => `<div>✓ ${s}</div>`).join('');
      modalThumbs.innerHTML = project.images
        .map((src, i) => `<img src="${src}" alt="" data-index="${i}">`)
        .join('');
      modalThumbs.querySelectorAll('img').forEach((img) => {
        img.addEventListener('click', () => {
          currentIndex = Number(img.getAttribute('data-index'));
          renderModalImage();
        });
      });
      renderModalImage();
      modal.hidden = false;
      document.body.classList.add('modal-open');
    }

    const closeModal = () => {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    };

    document.getElementById('portfolioModalClose')?.addEventListener('click', closeModal);
    document.getElementById('portfolioModalBackdrop')?.addEventListener('click', closeModal);
    document.getElementById('modalBack')?.addEventListener('click', closeModal);
    document.getElementById('modalPrev')?.addEventListener('click', () => {
      if (!currentProject) return;
      currentIndex = (currentIndex - 1 + currentProject.images.length) % currentProject.images.length;
      renderModalImage();
    });
    document.getElementById('modalNext')?.addEventListener('click', () => {
      if (!currentProject) return;
      currentIndex = (currentIndex + 1) % currentProject.images.length;
      renderModalImage();
    });
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') document.getElementById('modalPrev')?.click();
      if (e.key === 'ArrowRight') document.getElementById('modalNext')?.click();
    });

    /* Swipe/drag through modal images (touch and mouse) */
    const modalCarousel = document.querySelector('.portfolio-modal__carousel');
    if (modalCarousel) {
      let dragStartX = null;
      modalCarousel.addEventListener('pointerdown', (e) => {
        dragStartX = e.clientX;
      });
      modalCarousel.addEventListener('pointerup', (e) => {
        if (dragStartX === null) return;
        const delta = e.clientX - dragStartX;
        dragStartX = null;
        if (Math.abs(delta) < 40) return;
        if (delta < 0) document.getElementById('modalNext')?.click();
        else document.getElementById('modalPrev')?.click();
      });
      modalCarousel.addEventListener('pointercancel', () => {
        dragStartX = null;
      });
    }

    renderCards();
  }

  /* ===== Image lightbox (click any content photo to view full size) ===== */
  const LIGHTBOX_SELECTOR = [
    '.about-split__media img',
    '.reason-card__media img',
    '.portfolio-modal__carousel img'
  ].join(', ');

  const lightboxTargets = document.querySelectorAll(LIGHTBOX_SELECTOR);

  if (lightboxTargets.length) {
    let lightbox = document.getElementById('imgLightbox');

    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'imgLightbox';
      lightbox.className = 'img-lightbox';
      lightbox.hidden = true;
      lightbox.innerHTML = `
        <div class="img-lightbox__backdrop"></div>
        <button type="button" class="img-lightbox__close" aria-label="${isEN ? 'Close' : 'ปิด'}">✕</button>
        <img class="img-lightbox__img" alt="">
      `;
      document.body.appendChild(lightbox);
    }

    const lightboxImg = lightbox.querySelector('.img-lightbox__img');

    const openLightbox = (src, alt) => {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.hidden = false;
      document.body.classList.add('modal-open');
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.classList.remove('modal-open');
    };

    lightbox.querySelector('.img-lightbox__backdrop').addEventListener('click', closeLightbox);
    lightbox.querySelector('.img-lightbox__close').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (!lightbox.hidden && e.key === 'Escape') closeLightbox();
    });

    lightboxTargets.forEach((img) => {
      img.addEventListener('click', () => openLightbox(img.currentSrc || img.src, img.alt));
    });
  }

  /* ===== Contact modal ===== */
  const contactModal = document.getElementById('contactModal');

  if (contactModal) {
    const openContactModal = () => {
      contactModal.hidden = false;
      document.body.classList.add('modal-open');
    };

    const closeContactModal = () => {
      contactModal.hidden = true;
      document.body.classList.remove('modal-open');
    };

    document.querySelectorAll('a[href="#contact"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openContactModal();
      });
    });

    document.getElementById('contactModalClose')?.addEventListener('click', closeContactModal);
    document.getElementById('contactModalBackdrop')?.addEventListener('click', closeContactModal);
    document.addEventListener('keydown', (e) => {
      if (!contactModal.hidden && e.key === 'Escape') closeContactModal();
    });
  }

  /* ===== Back to top button ===== */
  const backToTop = document.getElementById('backToTop');

  if (backToTop) {
    const toggleBackToTop = () => {
      backToTop.classList.toggle('is-visible', window.scrollY > 400);
    };
    toggleBackToTop();
    window.addEventListener('scroll', toggleBackToTop);
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ===== Reveal on scroll ===== */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }
});
