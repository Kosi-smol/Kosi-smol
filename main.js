/* =========================================================
   KOSI — общий скрипт для всех страниц
   ========================================================= */

/* ---------- Регистрация service worker (нужно для установки сайта как приложения) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* если что-то пошло не так — сайт продолжит работать как обычно */
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Хедер: тень при скролле + мобильное меню ---------- */
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    mainNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Появление блоков при скролле ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Слайдер работ на главной ---------- */
  const slider = document.querySelector('[data-works-slider]');
  if (slider) {
    const track = slider.querySelector('.works-track');
    const slides = Array.from(slider.querySelectorAll('.works-slide'));
    const dotsWrap = slider.querySelector('.works-dots');
    const prevBtn = slider.querySelector('[data-works-prev]');
    const nextBtn = slider.querySelector('[data-works-next]');
    let index = 0;
    let timer = null;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Показать фото работы ${i + 1}`);
      if (i === 0) dot.setAttribute('aria-current', 'true');
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function render() {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, i) => {
        if (i === index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
    }
    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    nextBtn && nextBtn.addEventListener('click', () => { next(); restart(); });
    prevBtn && prevBtn.addEventListener('click', () => { prev(); restart(); });

    function start() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      timer = setInterval(next, 4500);
    }
    function restart() {
      clearInterval(timer);
      start();
    }
    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', start);
    start();
  }

  /* ---------- Отправка формы заявки на Formspree ---------- */
  document.querySelectorAll('[data-order-form]').forEach(form => {
    const status = form.querySelector('[data-form-status]');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (status) { status.textContent = 'Отправляем заявку…'; status.dataset.state = ''; }
      if (submitBtn) submitBtn.disabled = true;

      try {
        const data = new FormData(form);
        const response = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          if (status) {
            status.textContent = 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.';
            status.dataset.state = 'ok';
          }
          form.reset();
        } else {
          let message = 'Не удалось отправить заявку. Попробуйте ещё раз или напишите нам в Telegram.';
          try {
            const errData = await response.json();
            if (errData && errData.message) message = errData.message;
          } catch (_) { /* ответ не в JSON — оставляем сообщение по умолчанию */ }
          throw new Error(message);
        }
      } catch (err) {
        if (status) {
          status.textContent = err.message && err.message !== 'Failed to fetch'
            ? err.message
            : 'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз, либо напишите нам в Telegram.';
          status.dataset.state = 'error';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });

  /* ---------- Раскрытие текста «О владельце» ---------- */
  const bioText = document.querySelector('[data-bio-text]');
  const bioToggle = document.querySelector('[data-bio-toggle]');
  if (bioText && bioToggle) {
    bioToggle.addEventListener('click', () => {
      const expanded = bioText.classList.toggle('is-expanded');
      bioToggle.setAttribute('aria-expanded', String(expanded));
      bioToggle.querySelector('[data-bio-toggle-label]').textContent = expanded ? 'Свернуть' : 'Читать полностью';
    });
  }

  /* ---------- Лайтбокс каталога ---------- */
  const lightbox = document.querySelector('[data-lightbox]');
  if (lightbox) {
    const mediaEl = lightbox.querySelector('[data-lightbox-media]');
    const trackEl = lightbox.querySelector('[data-lightbox-track]');
    const prevBtn = lightbox.querySelector('[data-lightbox-prev]');
    const nextBtn = lightbox.querySelector('[data-lightbox-next]');
    const dotsWrap = lightbox.querySelector('[data-lightbox-dots]');
    const eyebrowEl = lightbox.querySelector('[data-lightbox-eyebrow]');
    const titleEl = lightbox.querySelector('[data-lightbox-title]');
    const descEl = lightbox.querySelector('[data-lightbox-desc]');
    const specsEl = lightbox.querySelector('[data-lightbox-specs]');
    const priceEl = lightbox.querySelector('[data-lightbox-price]');
    const closeBtn = lightbox.querySelector('[data-lightbox-close]');
    const tabs = Array.from(lightbox.querySelectorAll('[data-lightbox-tab]'));
    const panels = Array.from(lightbox.querySelectorAll('[data-lightbox-panel]'));
    let lastFocused = null;
    let slideIndex = 0;
    let slideCount = 0;

    function setTab(name) {
      tabs.forEach(t => {
        const active = t.dataset.lightboxTab === name;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      panels.forEach(p => {
        p.classList.toggle('is-active', p.dataset.lightboxPanel === name);
      });
    }

    /* ---- Слайдер фото товара ---- */
    function renderSlider() {
      trackEl.style.transform = `translateX(-${slideIndex * 100}%)`;
      Array.from(dotsWrap.children).forEach((d, i) => {
        if (i === slideIndex) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }
    function goToSlide(i) {
      if (!slideCount) return;
      slideIndex = (i + slideCount) % slideCount;
      renderSlider();
    }
    function nextSlide() { goToSlide(slideIndex + 1); }
    function prevSlide() { goToSlide(slideIndex - 1); }

    function buildSlider(images, fallbackText) {
      trackEl.innerHTML = '';
      dotsWrap.innerHTML = '';
      slideIndex = 0;

      if (!images.length) {
        trackEl.innerHTML = `<div class="lightbox-slide"><span>${fallbackText || 'Фото товара'}</span></div>`;
        slideCount = 1;
      } else {
        images.forEach(img => {
          const slide = document.createElement('div');
          slide.className = 'lightbox-slide';
          slide.appendChild(img.cloneNode(true));
          trackEl.appendChild(slide);
        });
        slideCount = images.length;
      }

      images.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Показать фото ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        dotsWrap.appendChild(dot);
      });

      mediaEl.classList.toggle('is-single', slideCount <= 1);
      renderSlider();
    }

    prevBtn && prevBtn.addEventListener('click', prevSlide);
    nextBtn && nextBtn.addEventListener('click', nextSlide);
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });

    /* Свайп/перетаскивание фото пальцем или мышью */
    let dragStartX = null;
    let dragDeltaX = 0;
    let dragging = false;

    function dragStart(x) {
      if (slideCount <= 1) return;
      dragging = true;
      dragStartX = x;
      dragDeltaX = 0;
      trackEl.style.transition = 'none';
    }
    function dragMove(x) {
      if (!dragging) return;
      dragDeltaX = x - dragStartX;
      const percent = (dragDeltaX / trackEl.clientWidth) * 100;
      trackEl.style.transform = `translateX(calc(-${slideIndex * 100}% + ${percent}%))`;
    }
    function dragEnd() {
      if (!dragging) return;
      dragging = false;
      trackEl.style.transition = '';
      const threshold = trackEl.clientWidth * 0.15;
      if (dragDeltaX > threshold) prevSlide();
      else if (dragDeltaX < -threshold) nextSlide();
      else renderSlider();
    }

    trackEl.addEventListener('touchstart', (e) => dragStart(e.touches[0].clientX), { passive: true });
    trackEl.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX), { passive: true });
    trackEl.addEventListener('touchend', dragEnd);

    trackEl.addEventListener('mousedown', (e) => { e.preventDefault(); dragStart(e.clientX); });
    window.addEventListener('mousemove', (e) => dragMove(e.clientX));
    window.addEventListener('mouseup', dragEnd);

    function openFrom(card) {
      const mediaSource = card.querySelector('.product-card__media');
      const images = mediaSource ? Array.from(mediaSource.querySelectorAll('img')) : [];
      buildSlider(images, mediaSource?.textContent.trim());

      eyebrowEl.textContent = card.querySelector('.product-card__eyebrow')?.textContent || '';
      titleEl.textContent = card.querySelector('.product-card__title')?.textContent || '';
      descEl.textContent = card.querySelector('.product-card__desc')?.textContent || '';

      const specsSource = card.querySelector('.product-card__specs');
      if (specsEl) specsEl.innerHTML = specsSource ? specsSource.innerHTML : '';

      priceEl.textContent = card.querySelector('.product-card__price')?.textContent || '';
      setTab('desc');
      lastFocused = document.activeElement;
      lightbox.classList.add('is-open');
      closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    document.querySelectorAll('[data-open-lightbox]').forEach(card => {
      card.addEventListener('click', () => openFrom(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFrom(card); }
      });
    });
    tabs.forEach(tab => {
      tab.addEventListener('click', () => setTab(tab.dataset.lightboxTab));
    });
    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) close();
    });
  }

  

});


