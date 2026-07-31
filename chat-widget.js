/* =========================================================
   KOSI — чат-помощник (кнопка-кружок + окно чата)
   Работает без сервера и без внешнего ИИ: отвечает по базе
   знаний о товарах и частых вопросах. Если вопрос не понят —
   предлагает оставить заявку или написать в телефон/почту.
   Историю переписки хранит в localStorage, поэтому диалог
   не теряется при переходе между страницами сайта.
   ========================================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'kosiChatHistoryV1';
  var MAX_MESSAGES = 60;

  /* ---------------------------------------------------------
     БАЗА ЗНАНИЙ
     Чтобы поменять цену/срок/материал или добавить товар —
     редактируйте только этот массив.
  --------------------------------------------------------- */
  var PRODUCTS = [
    {
      name: '3D стикеры',
      keys: ['3d стикер', 'стикер', 'наклейк'],
      price: 'от 75 ₽', material: 'эпоксидная смола, УФ-печать',
      size: '30×30 мм по вашему макету', tirazh: 'от 2 шт.', term: '2–4 дня'
    },
    {
      name: 'Альбом-брелок',
      keys: ['альбом-брелок', 'альбом брелок', 'мини альбом', 'мини-альбом'],
      price: 'от 380 ₽', material: 'пластик, алюминий',
      size: 'мини-альбом на 28 фото', tirazh: 'от 1 шт.', term: '2–4 дня'
    },
    {
      name: 'Именные ручки',
      keys: ['ручк', 'именн'],
      price: 'от 85 ₽', material: 'пластик',
      size: 'печать имени или логотипа', tirazh: 'от 2 шт.', term: '2–4 дня'
    },
    {
      name: 'Клиентский шоколад',
      keys: ['шоколад'],
      price: 'от 20 ₽', material: 'шоколад, брендированная упаковка',
      size: '5 г', tirazh: 'от 10 шт.', term: '2–7 дней'
    },
    {
      name: 'Магнит с подставкой',
      keys: ['магнит с подставкой', 'подставк'],
      price: 'от 120 ₽', material: 'акрил/дерево',
      size: 'по вашему макету', tirazh: 'от 1 шт.', term: '2–4 дня'
    },
    {
      name: 'Магнит',
      keys: ['магнит'],
      price: 'от 95 ₽', material: 'акрил, магнитный винил',
      size: 'по макету с вашим фото', tirazh: 'от 1 шт.', term: '1–3 дня'
    },
    {
      name: 'Кулон',
      keys: ['кулон', 'подвеск'],
      price: 'от 249 ₽', material: 'металл/эпоксидная смола',
      size: 'фото по желанию', tirazh: 'от 1 шт.', term: '2–4 дня'
    },
    {
      name: 'Куб с фотографиями',
      keys: ['куб'],
      price: 'от 750 ₽', material: 'акрил, пластик, крутящий элемент',
      size: 'до 6 фото', tirazh: 'от 1 шт.', term: '2–5 дней'
    },
    {
      name: 'Брелок',
      keys: ['брелок', 'брелк'],
      price: 'от 75 ₽', material: 'акрил/металл',
      size: 'фото, имя, дата, логотип', tirazh: 'от 1 шт.', term: '1–3 дня'
    }
  ];

  var CONTACT = {
    phone: '+7 (996) 346-21-68',
    phoneHref: 'tel:+79963462168',
    email: 'Kosi-smol@yandex.ru',
    city: 'г. Смоленск'
  };

  var QUICK_MAIN = ['Цены на товары', 'Сроки изготовления', 'Как оформить заказ', 'Связаться с оператором'];

  /* ---------------------------------------------------------
     Утилиты
  --------------------------------------------------------- */
  function norm(s) {
    return (s || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9 ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function has(text, arr) {
    for (var i = 0; i < arr.length; i++) {
      if (text.indexOf(arr[i]) !== -1) return true;
    }
    return false;
  }

  function findProducts(text) {
    var found = [];
    for (var i = 0; i < PRODUCTS.length; i++) {
      var p = PRODUCTS[i];
      for (var k = 0; k < p.keys.length; k++) {
        if (text.indexOf(p.keys[k]) !== -1) { found.push(p); break; }
      }
    }
    return found;
  }

  function productLine(p, opts) {
    opts = opts || {};
    var line = p.name.trim() + ' — ' + p.price + ', тираж ' + p.tirazh + ', срок ' + p.term + '.';
    if (opts.full) {
      line = p.name.trim() + '\nЦена: ' + p.price +
        '\nМатериал: ' + p.material +
        '\nРазмер/формат: ' + p.size +
        '\nМинимальный тираж: ' + p.tirazh +
        '\nСрок изготовления: ' + p.term;
    }
    return line;
  }

  function allProductsList() {
    return PRODUCTS.map(function (p) { return '• ' + p.name.trim() + ' — ' + p.price; }).join('\n');
  }

  /* ---------------------------------------------------------
     Определение намерения и генерация ответа
  --------------------------------------------------------- */
  function getReply(raw) {
    var text = norm(raw);

    // Оператор / живой человек
    if (has(text, ['оператор', 'менеджер', 'живой человек', 'живого человека', 'человек ', 'с человеком', 'реальный человек', 'поддержк', 'сотрудник'])) {
      return {
        text: 'На данный момент операторы недоступны — с вами общается бот-помощник Kosi, и он постарается ответить сам. ' +
          'Если нужен именно живой человек, быстрее всего оставить заявку в форме ниже или написать нам напрямую:\n' +
          '📞 ' + CONTACT.phone + '\n✉️ ' + CONTACT.email + '\nМы отвечаем в течение рабочего дня.',
        quick: ['Оставить заявку', 'Цены на товары']
      };
    }

    // Приветствие
    if (has(text, ['привет', 'здравствуй', 'добрый день', 'добрый вечер', 'доброе утро', 'хай', 'ку']) && text.length < 40) {
      return {
        text: 'Здравствуйте! 👋 Чем могу помочь — расскажу про товары, цены, сроки или помогу с заказом.',
        quick: QUICK_MAIN
      };
    }

    // Благодарность
    if (has(text, ['спасибо', 'благодар']) && text.length < 40) {
      return { text: 'Пожалуйста! Если появятся ещё вопросы — я здесь 🙂', quick: QUICK_MAIN };
    }

    // Прощание
    if (has(text, ['пока', 'до свидания', 'всего доброго']) && text.length < 30) {
      return { text: 'До встречи! Будем рады видеть вас снова 🌿', quick: QUICK_MAIN };
    }

    // Конкретные товары
    var matched = findProducts(text);
    if (matched.length) {
      if (matched.length === 1) {
        var wantsDetails = has(text, ['материал', 'из чего', 'состав', 'размер', 'формат', 'тираж', 'минимальн', 'подробн', 'характеристик']);
        return {
          text: productLine(matched[0], { full: wantsDetails }),
          quick: ['Как оформить заказ', 'Сроки изготовления', 'Все товары']
        };
      }
      var lines = matched.slice(0, 5).map(function (p) { return productLine(p); });
      return { text: lines.join('\n'), quick: ['Как оформить заказ', 'Все товары'] };
    }

    // Список всех товаров / каталог / ассортимент
    if (has(text, ['какие товар', 'весь каталог', 'ассортимент', 'что у вас есть', 'что вы делаете', 'список товар', 'каталог'])) {
      return {
        text: 'Вот что мы изготавливаем:\n' + allProductsList() + '\n\nПолные фото и характеристики — в разделе «Товары».',
        quick: ['Как оформить заказ', 'Сроки изготовления']
      };
    }

    // Цена в целом (без конкретного товара)
    if (has(text, ['цена', 'цены', 'стоимост', 'сколько стоит', 'почем', 'прайс'])) {
      return {
        text: 'Цены на основные позиции:\n' + allProductsList() + '\n\nТочная стоимость зависит от тиража и макета — уточним в заявке.',
        quick: ['Как оформить заказ', 'Все товары']
      };
    }

    // Сроки
    if (has(text, ['срок', 'сколько дней', 'как быстро', 'когда будет готово', 'когда готово'])) {
      return {
        text: 'Обычно на изготовление уходит 1–7 дней в зависимости от товара и тиража (шоколад — до 7 дней, большинство сувениров — 1–4 дня). Точный срок скажем после согласования макета.',
        quick: ['Как оформить заказ', 'Цены на товары']
      };
    }

    // Тираж / минимальное количество
    if (has(text, ['тираж', 'минимальн', 'минималк', 'от скольки', 'от какого количества'])) {
      return {
        text: 'Минимальный тираж зависит от товара — от 1 шт. для большинства украшений и брелоков, от 10 шт. для шоколада. Для корпоративных заказов обсуждаем тираж индивидуально.',
        quick: ['Как оформить заказ', 'Цены на товары']
      };
    }

    // Как заказать / оформить
    if (has(text, ['как заказать', 'как оформить', 'хочу заказать', 'оформить заказ', 'сделать заказ', 'как купить', 'как сделать заказ'])) {
      return {
        text: 'Оформить заказ просто:\n1. Заполните форму заявки ниже (имя, телефон, товар).\n2. Мы свяжемся с вами в выбранном мессенджере и обсудим макет, тираж и сроки.\n3. После согласования макета запускаем в производство.\n\nНажмите «Оставить заявку» — и я прокручу к форме.',
        quick: ['Оставить заявку', 'Цены на товары'],
        action: 'scroll-order'
      };
    }

    // Оставить заявку
    if (has(text, ['оставить заявку', 'заявка', 'форма'])) {
      return {
        text: 'Открываю форму заявки — заполните её, и мы свяжемся с вами в ближайшее рабочее время.',
        action: 'scroll-order'
      };
    }

    // Оплата
    if (has(text, ['оплата', 'оплатить', 'предоплат', 'как платить', 'способы оплаты'])) {
      return {
        text: 'Способ и порядок оплаты обсуждаем индивидуально после согласования макета и тиража — уточним всё в переписке после вашей заявки.',
        quick: ['Оставить заявку']
      };
    }

    // Макет / дизайн / свои фото
    if (has(text, ['макет', 'дизайн', 'свои фото', 'своё фото', 'моё фото', 'загрузить фото', 'логотип'])) {
      return {
        text: 'Да, мы работаем по вашему макету или фото — можно прислать изображение и пожелания после того, как оставите заявку. Если макета нет, поможем оформить идею.',
        quick: ['Оставить заявку', 'Цены на товары']
      };
    }

    // Доставка
    if (has(text, ['доставк', 'самовывоз', 'отправ', 'привезти', 'привезете', 'курьер'])) {
      return {
        text: 'Варианты получения обсудим после заказа — уточним у вас удобный способ (самовывоз в Смоленске или отправка). Подробности — в переписке после заявки.',
        quick: ['Оставить заявку', 'Адрес и контакты']
      };
    }

    // Адрес / город
    if (has(text, ['адрес', 'город', 'где находитесь', 'где вы', 'смоленск'])) {
      return {
        text: 'Мы находимся в ' + CONTACT.city + '. Точный адрес для встречи или самовывоза уточним индивидуально при заказе.',
        quick: ['Контакты', 'Оставить заявку']
      };
    }

    // Контакты
    if (has(text, ['контакт', 'телефон', 'позвонить', 'email', 'почта', 'связаться', 'номер'])) {
      return {
        text: 'Наши контакты:\n📞 ' + CONTACT.phone + '\n✉️ ' + CONTACT.email + '\n📍 ' + CONTACT.city + '\n\nМожно и через форму заявки — ответим в удобном мессенджере.',
        quick: ['Оставить заявку']
      };
    }

    // Скидки
    if (has(text, ['скидк', 'акция', 'промокод'])) {
      return {
        text: 'Актуальные акции и новости мы публикуем в разделе «Новости». А для крупных и корпоративных заказов условия обсуждаем индивидуально.',
        quick: ['Оставить заявку', 'Цены на товары']
      };
    }

    // Fallback
    return {
      text: 'Пока не уверен, что правильно понял вопрос 🙂 Могу рассказать о товарах, ценах, сроках изготовления или помочь с оформлением заказа. Либо оставьте заявку — и мы ответим лично.',
      quick: QUICK_MAIN
    };
  }

  /* ---------------------------------------------------------
     Хранилище истории
  --------------------------------------------------------- */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveHistory(history) {
    try {
      var trimmed = history.slice(-MAX_MESSAGES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) { /* хранилище недоступно — просто не сохраняем */ }
  }

  /* ---------------------------------------------------------
     Построение интерфейса
  --------------------------------------------------------- */
  function buildWidget() {
    var launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'kosi-chat-launcher';
    launcher.setAttribute('aria-label', 'Открыть чат с Kosi');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML =
      '<span class="kosi-chat-launcher__pulse" aria-hidden="true"></span>' +
      '<span class="kosi-chat-launcher__badge" aria-hidden="true"></span>' +
      '<svg class="kosi-chat-launcher__icon-chat" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M4 12c0-4.4 3.8-8 8.5-8S21 7.6 21 12s-3.8 8-8.5 8c-1 0-1.9-.14-2.8-.4L5 21l1.3-3.7C4.8 16 4 14.1 4 12Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<svg class="kosi-chat-launcher__icon-close" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' +
      '</svg>';

    var win = document.createElement('div');
    win.className = 'kosi-chat-window';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-modal', 'false');
    win.setAttribute('aria-label', 'Чат с Kosi');
    win.innerHTML =
      '<div class="kosi-chat-header">' +
      '  <span class="kosi-chat-header__avatar"><img src="Kosi_logo.png" alt=""></span>' +
      '  <span class="kosi-chat-header__info">' +
      '    <span class="kosi-chat-header__name">Kosi — помощник</span>' +
      '    <span class="kosi-chat-header__status">Онлайн, отвечает сразу</span>' +
      '  </span>' +
      '  <button type="button" class="kosi-chat-header__close" aria-label="Закрыть чат">×</button>' +
      '</div>' +
      '<div class="kosi-chat-body" data-kosi-body></div>' +
      '<div class="kosi-chat-quick" data-kosi-quick></div>' +
      '<form class="kosi-chat-form" data-kosi-form>' +
      '  <textarea rows="1" placeholder="Напишите сообщение…" aria-label="Сообщение" data-kosi-input></textarea>' +
      '  <button type="submit" class="kosi-chat-form__send" aria-label="Отправить">' +
      '    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12l16-7-6.5 16-2.5-6.5L4 12Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
      '  </button>' +
      '</form>' +
      '<p class="kosi-chat-note">Отвечает бот-помощник Kosi по частым вопросам</p>';

    document.body.appendChild(win);
    document.body.appendChild(launcher);

    return { launcher: launcher, win: win };
  }

  /* ---------------------------------------------------------
     Инициализация
  --------------------------------------------------------- */
  function init() {
    var el = buildWidget();
    var launcher = el.launcher;
    var win = el.win;
    var body = win.querySelector('[data-kosi-body]');
    var quickWrap = win.querySelector('[data-kosi-quick]');
    var form = win.querySelector('[data-kosi-form]');
    var input = win.querySelector('[data-kosi-input]');
    var badge = launcher.querySelector('.kosi-chat-launcher__badge');
    var closeBtn = win.querySelector('.kosi-chat-header__close');

    var history = loadHistory();
    var isOpen = false;
    var unread = 0;

    function updateBadge() {
      badge.textContent = unread > 0 ? String(unread) : '';
    }

    function scrollToBottom() {
      body.scrollTop = body.scrollHeight;
    }

    function renderMessage(msg, animate) {
      var wrap = document.createElement('div');
      var bubble = document.createElement('div');
      bubble.className = 'kosi-msg ' + (msg.from === 'user' ? 'kosi-msg--user' : 'kosi-msg--bot');
      bubble.textContent = msg.text;
      if (!animate) bubble.style.animation = 'none';
      body.appendChild(bubble);
    }

    function addQuickReplies(labels) {
      quickWrap.innerHTML = '';
      if (!labels || !labels.length) { quickWrap.style.display = 'none'; return; }
      quickWrap.style.display = 'flex';
      labels.forEach(function (label) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'kosi-chip';
        chip.textContent = label;
        chip.addEventListener('click', function () { sendUserMessage(label); });
        quickWrap.appendChild(chip);
      });
    }

    function runAction(action) {
      if (action === 'scroll-order') {
        var target = document.getElementById('order');
        if (target) {
          setOpen(false);
          window.setTimeout(function () {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 200);
        } else {
          window.location.href = 'index.html#order';
        }
      }
    }

    function pushMessage(from, text) {
      var msg = { from: from, text: text, t: Date.now() };
      history.push(msg);
      saveHistory(history);
      renderMessage(msg, true);
      scrollToBottom();
      return msg;
    }

    function showTyping(callback) {
      var typing = document.createElement('div');
      typing.className = 'kosi-typing';
      typing.setAttribute('data-kosi-typing', '');
      typing.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(typing);
      scrollToBottom();
      var delay = 500 + Math.random() * 500;
      window.setTimeout(function () {
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        callback();
      }, delay);
    }

    function botAnswer(userText) {
      showTyping(function () {
        var reply = getReply(userText);
        pushMessage('bot', reply.text);
        addQuickReplies(reply.quick);
        if (!isOpen) { unread += 1; updateBadge(); }
        if (reply.action) runAction(reply.action);
      });
    }

    function sendUserMessage(text) {
      text = (text || '').trim();
      if (!text) return;
      pushMessage('user', text);
      addQuickReplies([]);
      input.value = '';
      input.style.height = 'auto';
      botAnswer(text);
    }

    function greetIfNeeded() {
      if (history.length) return;
      showTyping(function () {
        pushMessage('bot', 'Здравствуйте! 👋 Я помощник Kosi. Расскажу про товары, цены, сроки изготовления или помогу оставить заявку. Чем могу помочь?');
        addQuickReplies(QUICK_MAIN);
      });
    }

    function setOpen(open) {
      isOpen = open;
      win.classList.toggle('is-open', open);
      launcher.classList.toggle('is-open', open);
      launcher.setAttribute('aria-expanded', String(open));
      var pulse = launcher.querySelector('.kosi-chat-launcher__pulse');
      if (pulse) pulse.style.display = open ? 'none' : '';
      if (open) {
        unread = 0;
        updateBadge();
        window.setTimeout(function () { input.focus(); }, 150);
        scrollToBottom();
        greetIfNeeded();
      }
    }

    launcher.addEventListener('click', function () { setOpen(!isOpen); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sendUserMessage(input.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage(input.value);
      }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 90) + 'px';
    });

    /* Восстанавливаем историю на странице */
    history.forEach(function (msg) { renderMessage(msg, false); });
    if (history.length) {
      var last = history[history.length - 1];
      if (last.from === 'bot') {
        // покажем те же быстрые кнопки, что и в начале разговора
        addQuickReplies(QUICK_MAIN);
      }
      scrollToBottom();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
