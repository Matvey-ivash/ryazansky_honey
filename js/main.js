// Loaded from the supplied CSV export and matched image archive in products-data.js.

const popularGroups = {
  weight: catalogProducts.filter((product) => product.category === "Мёд натуральный (весовой)").slice(0, 4),
  packed: catalogProducts.filter((product) => product.category === "Мёд натуральный (фасованный)").slice(0, 4),
  compositions: catalogProducts.filter((product) => product.category === "Медовые композиции").slice(0, 4),
  "bee-products": catalogProducts.filter((product) => product.category === "Продукты пчеловодства").slice(0, 4),
  beekeeping: catalogProducts.filter((product) => product.category === "Товары для пчеловодов").slice(0, 4),
  "bee-medicine": catalogProducts.filter((product) => product.category === "Лекарства для пчёл").slice(0, 4),
  cosmetics: catalogProducts.filter((product) => product.category === "Натуральная косметика").slice(0, 4)
};

const categoryFilterMap = {
  all: () => true,
  weight: (product) => product.category === "Мёд натуральный (весовой)",
  packed: (product) => product.category === "Мёд натуральный (фасованный)",
  compositions: (product) => product.category === "Медовые композиции",
  "bee-products": (product) => product.category === "Продукты пчеловодства",
  beekeeping: (product) => product.category === "Товары для пчеловодов",
  "bee-medicine": (product) => product.category === "Лекарства для пчёл",
  cosmetics: (product) => product.category === "Натуральная косметика"
};

const money = (amount) => `${new Intl.NumberFormat("ru-RU").format(amount)} р.`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function createProductCard(product, popular = false) {
  const card = document.createElement("article");
  card.className = `product-card${popular ? " popular-card" : ""}`;
  card.dataset.product = product.name.toLocaleLowerCase("ru");
  const isFavorite = favorites.includes(product.id);
  card.innerHTML = `
    <button class="product-photo" type="button" data-product-open="${product.id}" aria-label="Подробнее: ${escapeHTML(product.name)}">
      <img src="${product.image}" alt="${escapeHTML(product.name)}" loading="lazy">
    </button>
    <div class="product-body">
      <h3 class="product-title"><button class="product-title-trigger" type="button" data-product-open="${product.id}">${escapeHTML(product.name)}</button></h3>
      <p class="product-weight">${escapeHTML(product.category)}${product.size ? ` · ${escapeHTML(product.size)}` : ""}</p>
      <p class="product-price">${money(product.price)}</p>
      <button class="favorite-toggle${isFavorite ? " is-favorite" : ""}" type="button" data-favorite-toggle="${product.id}" aria-pressed="${isFavorite}" aria-label="${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}">${isFavorite ? "♥ В избранном" : "♡ В избранное"}</button>
      <div class="product-actions">
        <button class="details-link" type="button" data-product-open="${product.id}">О товаре</button>
        <button class="buy-button" type="button" data-cart-add="${product.id}">В корзину</button>
      </div>
    </div>`;
  return card;
}

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem("ryazan-bee-cart") || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => catalogProducts.some((product) => product.id === item.id) && Number(item.quantity) > 0)
        .map((item) => ({ id: item.id, quantity: Math.max(1, Math.floor(Number(item.quantity))) }))
      : [];
  } catch {
    return [];
  }
}

function readFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem("ryazan-bee-favorites") || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => catalogProducts.some((product) => product.id === id)) : [];
  } catch { return []; }
}

let cart = readCart();
let favorites = readFavorites();
let activeFilter = "all";
let searchTerm = "";

function saveCart() {
  try {
    localStorage.setItem("ryazan-bee-cart", JSON.stringify(cart));
  } catch {
    // The cart still works for the current page if storage is unavailable.
  }
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll(".cart-counter").forEach((badge) => {
    badge.textContent = count ? String(count) : "";
    badge.style.display = count ? "block" : "none";
  });
}

function saveFavorites() {
  try { localStorage.setItem("ryazan-bee-favorites", JSON.stringify(favorites)); } catch { /* Current-page state remains available. */ }
  document.querySelectorAll(".favorite-counter").forEach((badge) => {
    badge.textContent = favorites.length ? String(favorites.length) : "";
    badge.style.display = favorites.length ? "block" : "none";
  });
  document.querySelectorAll("[data-favorite-toggle]").forEach((button) => {
    const active = favorites.includes(button.dataset.favoriteToggle);
    button.classList.toggle("is-favorite", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
    button.textContent = active ? "♥ В избранном" : "♡ В избранное";
  });
}

function toggleFavorite(productId) {
  favorites = favorites.includes(productId) ? favorites.filter((id) => id !== productId) : [...favorites, productId];
  saveFavorites();
  const button = document.querySelector(`[data-favorite-toggle="${CSS.escape(productId)}"]`);
  if (button) {
    const active = favorites.includes(productId);
    button.classList.toggle("is-favorite", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "Убрать из избранного" : "Добавить в избранное");
    button.textContent = active ? "♥ В избранном" : "♡ В избранное";
  }
  if (document.querySelector("#wishlist-dialog")?.open) renderWishlist();
}

function addToCart(productId, quantity = 1) {
  const existing = cart.find((item) => item.id === productId);
  if (existing) existing.quantity += quantity;
  else cart.push({ id: productId, quantity });
  saveCart();
  showToast("Добавлено в корзину");
}

function showToast(message) {
  let toast = document.querySelector(".site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "site-toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function renderCatalog(grid) {
  const predicate = categoryFilterMap[activeFilter] || categoryFilterMap.all;
  const shown = catalogProducts.filter((product) => predicate(product) && `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase("ru").includes(searchTerm));
  grid.replaceChildren(...shown.map((product) => createProductCard(product)));
  let empty = document.querySelector("[data-catalog-empty]");
  if (!empty) {
    empty = document.createElement("p");
    empty.className = "catalog-empty";
    empty.dataset.catalogEmpty = "";
    grid.after(empty);
  }
  empty.hidden = shown.length > 0;
  const loadMore = document.querySelector(".load-more");
  if (loadMore) loadMore.hidden = true;
  empty.textContent = searchTerm
    ? "По вашему запросу товары не найдены."
    : "В этом разделе пока нет товаров. Посмотрите весь каталог или свяжитесь с нами — поможем подобрать продукцию.";
}

function ensureDialogs() {
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="site-dialog product-dialog" id="product-dialog" aria-labelledby="product-dialog-title">
      <button class="dialog-close" type="button" data-dialog-close aria-label="Закрыть">×</button>
      <div data-product-detail></div>
    </dialog>
    <dialog class="site-dialog cart-dialog" id="cart-dialog" aria-labelledby="cart-dialog-title">
      <button class="dialog-close" type="button" data-dialog-close aria-label="Закрыть">×</button>
      <h2 id="cart-dialog-title">Корзина</h2>
      <div data-cart-content></div>
    </dialog>
    <dialog class="site-dialog checkout-dialog" id="checkout-dialog" aria-labelledby="checkout-dialog-title">
      <button class="dialog-close" type="button" data-dialog-close aria-label="Закрыть">×</button>
      <h2 id="checkout-dialog-title">Оформление заказа</h2>
      <div data-checkout-content></div>
    </dialog>
    <dialog class="site-dialog wishlist-dialog" id="wishlist-dialog" aria-labelledby="wishlist-dialog-title">
      <button class="dialog-close" type="button" data-dialog-close aria-label="Закрыть">×</button>
      <h2 id="wishlist-dialog-title">Избранное</h2>
      <div data-wishlist-content></div>
    </dialog>`);
}

function renderWishlist() {
  const content = document.querySelector("[data-wishlist-content]");
  if (!content) return;
  const products = favorites.map((id) => catalogProducts.find((product) => product.id === id)).filter(Boolean);
  if (!products.length) {
    content.innerHTML = `<p class="wishlist-empty">Пока нет избранных товаров. Добавьте товары сердечком в карточках каталога.</p>`;
    return;
  }
  const rows = products.map((product) => `<label class="wishlist-item">
    <input type="checkbox" value="${product.id}" checked aria-label="Выбрать ${escapeHTML(product.name)}">
    <img src="${product.image}" alt="">
    <span class="wishlist-item-copy"><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.category)}${product.size ? ` · ${escapeHTML(product.size)}` : ""}</small></span>
    <strong class="wishlist-price">${money(product.price)}</strong>
  </label>`).join("");
  content.innerHTML = `<div class="wishlist-toolbar"><label><input type="checkbox" data-wishlist-select-all checked> Выбрать все</label><span>${products.length} товаров</span></div><div class="wishlist-items">${rows}</div><div class="wishlist-actions"><button class="button" type="button" data-wishlist-add-selected>Добавить выбранные в корзину</button><button class="wishlist-remove" type="button" data-wishlist-remove-selected>Удалить выбранные</button></div>`;
}

function openProduct(productId) {
  const product = catalogProducts.find((item) => item.id === productId);
  if (!product) return;
  const detail = document.querySelector("[data-product-detail]");
  detail.innerHTML = `
    <div class="detail-layout">
      <img class="detail-image" src="${product.image}" alt="${escapeHTML(product.name)}">
      <div class="detail-copy">
        <p class="detail-category">${escapeHTML(product.category)}${product.size ? ` · ${escapeHTML(product.size)}` : ""}</p>
        <h2 id="product-dialog-title">${escapeHTML(product.name)}</h2>
        <p>${escapeHTML(product.description)}</p>
        <p class="detail-price">${money(product.price)}</p>
        <button class="buy-button detail-buy" type="button" data-cart-add="${product.id}">Добавить в корзину</button>
      </div>
    </div>`;
  document.querySelector("#product-dialog").showModal();
}

function renderCart() {
  const content = document.querySelector("[data-cart-content]");
  if (!content) return;
  if (!cart.length) {
    content.innerHTML = `<p class="cart-empty">В корзине пока нет товаров.</p><a class="button cart-continue" href="catalog.html">Перейти в каталог</a>`;
    return;
  }
  const rows = cart.map((item) => {
    const product = catalogProducts.find((entry) => entry.id === item.id);
    return `<article class="cart-item">
      <img src="${product.image}" alt="">
      <div class="cart-item-main"><h3>${escapeHTML(product.name)}</h3><p>${money(product.price)} за шт.</p>
        <div class="quantity-control" aria-label="Количество товара ${escapeHTML(product.name)}">
          <button type="button" data-cart-change="-1" data-product-id="${product.id}" aria-label="Уменьшить количество">−</button>
          <output>${item.quantity}</output>
          <button type="button" data-cart-change="1" data-product-id="${product.id}" aria-label="Увеличить количество">+</button>
          <button class="remove-item" type="button" data-cart-remove="${product.id}">Удалить</button>
        </div>
      </div>
      <strong class="cart-subtotal">${money(product.price * item.quantity)}</strong>
    </article>`;
  }).join("");
  const total = cart.reduce((sum, item) => sum + catalogProducts.find((product) => product.id === item.id).price * item.quantity, 0);
  content.innerHTML = `<div class="cart-items">${rows}</div><div class="cart-summary"><span>Итого</span><strong>${money(total)}</strong></div><button class="button checkout-start" type="button" data-checkout-open>Оформить заказ</button>`;
}

function openCheckout() {
  const content = document.querySelector("[data-checkout-content]");
  const total = cart.reduce((sum, item) => sum + catalogProducts.find((product) => product.id === item.id).price * item.quantity, 0);
  const orderLines = cart.map((item) => {
    const product = catalogProducts.find((entry) => entry.id === item.id);
    return `<li>${escapeHTML(product.name)} — ${item.quantity} × ${money(product.price)}</li>`;
  }).join("");
  content.innerHTML = `
    <div class="checkout-order"><h3>Ваш заказ</h3><ul>${orderLines}</ul><p><strong>Итого: ${money(total)}</strong></p><p class="delivery-note">Стоимость доставки будет рассчитана отдельно после подтверждения заказа.</p></div>
    <form class="checkout-form" data-checkout-form>
      <label>ФИО <input name="name" autocomplete="name" required placeholder="Иванов Иван Иванович"></label>
      <div class="form-grid">
        <label>Телефон <input name="phone" type="tel" autocomplete="tel" required placeholder="+7 (___) ___-__-__"></label>
        <label>Email <input name="email" type="email" autocomplete="email" placeholder="name@example.ru"></label>
      </div>
      <label>Город <input name="city" autocomplete="address-level2" required placeholder="Рязань"></label>
      <label>Адрес доставки <textarea name="address" autocomplete="street-address" required rows="2" placeholder="Улица, дом, квартира или пункт выдачи СДЭК"></textarea></label>
      <div class="form-grid">
        <label>Доставка <select name="delivery" required><option value="">Выберите способ</option><option>СДЭК</option><option>Самовывоз из магазина</option><option>Нужна консультация</option></select></label>
        <label>Оплата <select name="payment" required><option value="">Выберите способ</option><option>Менеджер уточнит со мной</option><option>По согласованию</option></select></label>
      </div>
      <label>Комментарий к заказу <textarea name="comment" rows="3" placeholder="Пожелания по заказу"></textarea></label>
      <button class="button checkout-submit" type="submit">Подготовить заказ</button>
      <p class="checkout-note">Заказ будет подготовлен в почтовом приложении. Письмо можно проверить перед отправкой.</p>
      <div class="checkout-result" data-checkout-result aria-live="polite"></div>
    </form>`;
  document.querySelector("#cart-dialog").close();
  document.querySelector("#checkout-dialog").showModal();
}

function makeOrderEmail(form) {
  const values = new FormData(form);
  const productsText = cart.map((item) => {
    const product = catalogProducts.find((entry) => entry.id === item.id);
    return `• ${product.name}: ${item.quantity} × ${money(product.price)} = ${money(product.price * item.quantity)}`;
  }).join("\n");
  const total = cart.reduce((sum, item) => sum + catalogProducts.find((product) => product.id === item.id).price * item.quantity, 0);
  const body = [
    "Заказ с сайта «Рязанская пчела»", "", productsText, `Итого: ${money(total)}`, "",
    `ФИО: ${values.get("name")}`, `Телефон: ${values.get("phone")}`, `Email: ${values.get("email") || "не указан"}`,
    `Город: ${values.get("city")}`, `Адрес: ${values.get("address")}`, `Доставка: ${values.get("delivery")}`,
    `Оплата: ${values.get("payment")}`, `Комментарий: ${values.get("comment") || "нет"}`
  ].join("\n");
  return `mailto:rpchela@mail.ru?subject=${encodeURIComponent("Заказ с сайта Рязанская пчела")}&body=${encodeURIComponent(body)}`;
}

function placePopupBelow(trigger, popup) {
  const rect = trigger.getBoundingClientRect();
  const popupWidth = Math.min(popup.classList.contains("catalog-dropdown") ? 340 : 250, window.innerWidth - 24);
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - popupWidth - 12));
  popup.style.left = `${left}px`;
  popup.style.top = `${rect.bottom + 8}px`;
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDialogs();
  updateCartCount();
  saveFavorites();

  document.querySelectorAll("[data-popular-grid]").forEach((grid) => {
    grid.replaceChildren(...popularGroups.weight.map((product) => createProductCard(product, true)));
  });
  document.querySelectorAll("[data-popular-tabs]").forEach((tabs) => tabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-category]");
    if (!tab) return;
    tabs.querySelectorAll("[data-category]").forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
    const grid = document.querySelector(tabs.dataset.popularTabs);
    grid.replaceChildren(...(popularGroups[tab.dataset.category] || []).map((product) => createProductCard(product, true)));
  }));

  document.querySelectorAll("[data-catalog-grid]").forEach((grid) => {
    const params = new URLSearchParams(window.location.search);
    activeFilter = params.get("category") || "all";
    searchTerm = (params.get("search") || "").trim().toLocaleLowerCase("ru");
    document.querySelectorAll(".search input[type=search]").forEach((input) => { input.value = params.get("search") || ""; });
    renderCatalog(grid);
  });

  document.querySelectorAll(".accordion button").forEach((button) => button.addEventListener("click", () => {
    const content = document.getElementById(button.getAttribute("aria-controls"));
    const opened = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!opened));
    content.hidden = opened;
  }));

  document.querySelectorAll(".search").forEach((form) => {
    const input = form.querySelector("input[type=search]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const url = new URL("catalog.html", window.location.href);
      url.searchParams.set("search", input.value.trim());
      url.hash = "products";
      window.location.href = url.toString();
    });
    input.addEventListener("input", () => {
      if (!document.querySelector("[data-catalog-grid]")) return;
      searchTerm = input.value.trim().toLocaleLowerCase("ru");
      renderCatalog(document.querySelector("[data-catalog-grid]"));
    });
  });

  document.querySelectorAll("[data-catalog-menu-toggle]").forEach((button) => button.addEventListener("click", () => {
    const dropdown = button.closest(".search").querySelector("[data-catalog-dropdown]");
    const opened = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!opened));
    dropdown.hidden = opened;
    if (!opened) placePopupBelow(button, dropdown);
  }));
  document.addEventListener("click", (event) => {
    document.querySelectorAll("[data-catalog-dropdown]:not([hidden])").forEach((dropdown) => {
      if (dropdown.closest(".search").contains(event.target)) return;
      dropdown.hidden = true;
      dropdown.closest(".search").querySelector("[data-catalog-menu-toggle]").setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll("[data-catalog-dropdown]:not([hidden])").forEach((dropdown) => {
      dropdown.hidden = true;
      dropdown.closest(".search").querySelector("[data-catalog-menu-toggle]").setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll(".menu-button").forEach((button) => button.addEventListener("click", () => {
    const menu = button.closest(".site-header").querySelector(".main-menu");
    const opened = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!opened));
    menu.hidden = opened;
    if (!opened) placePopupBelow(button, menu);
  }));

  document.addEventListener("click", (event) => {
    document.querySelectorAll(".main-menu:not([hidden])").forEach((menu) => {
      if (menu.contains(event.target) || event.target.closest(".menu-button")) return;
      menu.hidden = true;
      menu.closest(".site-header").querySelector(".menu-button").setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    const openProductButton = event.target.closest("[data-product-open]");
    if (openProductButton) openProduct(openProductButton.dataset.productOpen);
    const addButton = event.target.closest("[data-cart-add]");
    if (addButton) {
      addToCart(addButton.dataset.cartAdd);
      addButton.closest("dialog")?.close();
    }
    if (event.target.closest("[data-cart-open]")) {
      renderCart();
      document.querySelector("#cart-dialog").showModal();
    }
    if (event.target.closest("[data-wishlist-open]")) {
      renderWishlist();
      document.querySelector("#wishlist-dialog").showModal();
    }
    const favoriteButton = event.target.closest("[data-favorite-toggle]");
    if (favoriteButton) toggleFavorite(favoriteButton.dataset.favoriteToggle);
    if (event.target.closest("[data-wishlist-select-all]")) {
      document.querySelectorAll(".wishlist-item input[type=checkbox]").forEach((checkbox) => { checkbox.checked = event.target.checked; });
    }
    if (event.target.closest("[data-wishlist-add-selected]")) {
      const selected = [...document.querySelectorAll(".wishlist-item input[type=checkbox]:checked")].map((checkbox) => checkbox.value);
      selected.forEach((id) => {
        const existing = cart.find((item) => item.id === id);
        if (existing) existing.quantity += 1;
        else cart.push({ id, quantity: 1 });
      });
      if (selected.length) {
        saveCart();
        showToast(`Добавлено в корзину: ${selected.length}`);
        document.querySelector("#wishlist-dialog").close();
      }
      else showToast("Сначала выберите товары");
    }
    if (event.target.closest("[data-wishlist-remove-selected]")) {
      const selected = new Set([...document.querySelectorAll(".wishlist-item input[type=checkbox]:checked")].map((checkbox) => checkbox.value));
      favorites = favorites.filter((id) => !selected.has(id));
      saveFavorites();
      renderWishlist();
    }
    if (event.target.closest("[data-dialog-close]")) event.target.closest("dialog").close();
    if (event.target.closest("[data-checkout-open]")) openCheckout();

    const change = event.target.closest("[data-cart-change]");
    if (change) {
      const item = cart.find((entry) => entry.id === change.dataset.productId);
      if (item) item.quantity += Number(change.dataset.cartChange);
      cart = cart.filter((entry) => entry.quantity > 0);
      saveCart();
      renderCart();
    }
    const remove = event.target.closest("[data-cart-remove]");
    if (remove) {
      cart = cart.filter((entry) => entry.id !== remove.dataset.cartRemove);
      saveCart();
      renderCart();
    }
  });

  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  document.addEventListener("submit", (event) => {
    if (!event.target.matches("[data-checkout-form]")) return;
    event.preventDefault();
    const mailto = makeOrderEmail(event.target);
    const result = event.target.querySelector("[data-checkout-result]");
    result.innerHTML = `<p>Заказ сформирован. Откройте письмо, проверьте данные и отправьте его.</p><a class="button" href="${mailto}">Открыть письмо в почте</a>`;
  });
});
