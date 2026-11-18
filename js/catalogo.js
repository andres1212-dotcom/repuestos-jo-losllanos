// Configuración base de la API (Utiliza rutas relativas para adaptarse a cualquier host)
const API_URL = '/api';

// La aplicación ahora depende exclusivamente de la API PostgreSQL. No se utiliza una base de datos local.
// const DEFAULT_PRODUCTS = []; // Eliminado


// WhatsApp Tienda Contacto
const WHATSAPP_PHONE = "584127776468";

// Variables de Estado de la Aplicación
let PRODUCTS = [];
let API_CATEGORIES = []; // Categorías traídas del servidor
let isOnline = false; // Define si estamos conectados al servidor API
let cart = [];
let activeCategory = "all";
let searchQuery = "";
let base64ImageData = "";

// Elementos del DOM
const catalogGrid = document.getElementById("catalog-grid");
const catalogCount = document.getElementById("catalog-count");
const catalogEmpty = document.getElementById("catalog-empty");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const resetFiltersBtn = document.getElementById("reset-filters-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const cartToggleBtn = document.getElementById("cart-toggle-btn");
const cartBadge = document.getElementById("cart-badge");
const cartDrawer = document.getElementById("cart-drawer");
const cartOverlay = document.getElementById("cart-overlay");
const cartCloseBtn = document.getElementById("cart-close-btn");
const cartList = document.getElementById("cart-list");
const cartTotal = document.getElementById("cart-total");
const sendQuoteBtn = document.getElementById("send-quote-btn");
const detailsModal = document.getElementById("details-modal");
const modalOverlay = document.getElementById("modal-overlay");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalContent = document.getElementById("modal-content");
const toastContainer = document.getElementById("toast-container");

// Elementos del Modal de Información
const infoModal = document.getElementById("info-modal");
const infoModalOverlay = document.getElementById("info-modal-overlay");
const infoModalCloseBtn = document.getElementById("info-modal-close-btn");
const infoTabsBtns = document.querySelectorAll(".info-tabs__btn");
const infoPanes = document.querySelectorAll(".info-pane");

// Elementos del Modal de Agregar Repuestos
const addProductModal = document.getElementById("add-product-modal");
const addModalCloseBtn = document.getElementById("add-modal-close-btn");
const addModalCancelBtn = document.getElementById("add-modal-cancel-btn");
const addModalOverlay = document.getElementById("add-modal-overlay");
const navAddBtn = document.getElementById("nav-add-btn");
const addProductForm = document.getElementById("add-product-form");
const prodCategory = document.getElementById("prod-category");
const prodCategoryCustom = document.getElementById("prod-category-custom");
const prodImageFile = document.getElementById("prod-image-file");
const prodImageUrl = document.getElementById("prod-image-url");
const imagePreview = document.getElementById("image-preview");
const uploadPlaceholderText = document.getElementById("upload-placeholder-text");

// Elementos del Modal de Iniciar Sesión (Admin)
const loginModal = document.getElementById("login-modal");
const loginModalCloseBtn = document.getElementById("login-modal-close-btn");
const loginModalCancelBtn = document.getElementById("login-modal-cancel-btn");
const loginModalOverlay = document.getElementById("login-modal-overlay");
const loginForm = document.getElementById("login-form");
const navLoginBtn = document.getElementById("nav-login-btn");
const navLogoutBtn = document.getElementById("nav-logout-btn");
let adminToken = localStorage.getItem("admin_token") || null;
let isAdmin = !!adminToken;
let editProductId = null;
let editProductCurrentImage = "";

// ----------------------------------------------------
// Gestión del Estado de Administrador
// ----------------------------------------------------

// Actualiza la UI según el estado actual de autenticación
function updateAdminUI() {
    const params = new URLSearchParams(window.location.search);
    const hasAdminParam = params.get('admin') === 'true' || params.get('login') === 'true';

    if (isAdmin) {
        if (navLoginBtn) navLoginBtn.style.display = 'none';
        if (navLogoutBtn) navLogoutBtn.style.display = 'inline-flex';
        if (navAddBtn) navAddBtn.style.display = 'inline-flex';
    } else {
        if (navLogoutBtn) navLogoutBtn.style.display = 'none';
        if (navAddBtn) navAddBtn.style.display = 'none';
        
        // El botón de login solo se muestra en el enlace dedicado de admin (?admin=true o ?login=true)
        if (navLoginBtn) {
            navLoginBtn.style.display = hasAdminParam ? 'inline-flex' : 'none';
        }

        // Si se accede con el enlace de admin y no ha iniciado sesión, abrir el login modal automáticamente
        if (hasAdminParam && !adminToken) {
            setTimeout(openLoginModal, 300);
        }
    }
}

// Inicializa el estado del admin al cargar la página
function initAdminState() {
    updateAdminUI();
}

// ----------------------------------------------------
// Inicialización y Detección de API
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    loadCartFromLocalStorage();
    setupEventListeners();
    initAdminState();
    await checkApiAndLoadData();
});

// Función para comprobar la conexión a la API e iniciar los datos
async function checkApiAndLoadData() {
    try {
        // Intenta conectar con el endpoint de estado
        const statusResponse = await fetch(`${API_URL}/status`);
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.status === 'online') {
                isOnline = true;
                console.log("🔌 Conectado al servidor de la API en modo ONLINE.");
            }
        }
    } catch (e) {
        console.warn("⚠️ Servidor offline. Iniciando en modo OFFLINE (Local Fallback).");
    }

        if (isOnline) {
        await loadFromApi();
    } else {
        // No hay fallback local, solo avisamos al usuario
        handleOffline();
    }
}

// Carga de datos desde la API
async function loadFromApi() {
    try {
        // Cargar Categorías
        const catRes = await fetch(`${API_URL}/categorias`);
        if (catRes.ok) {
            API_CATEGORIES = await catRes.json();
        }

        // Cargar Productos
        const prodRes = await fetch(`${API_URL}/productos`);
        if (prodRes.ok) {
            const rawProducts = await prodRes.json();
            // Normalizar formato de la base de datos a las propiedades esperadas
            PRODUCTS = rawProducts.map(p => ({
                id: p.id,
                name: p.nombre,
                oem: p.codigo_oem || 'N/D',
                price: parseFloat(p.precio),
                category: p.categoria_nombre || 'General',
                image: p.imagen || 'FRENOS.jpg',
                description: p.descripcion || 'Sin descripción detallada.',
                brand: p.marca || 'N/D',
                compatibility: p.modelo_vehiculo || 'Universal'
            }));
            
            showToast("Catálogo sincronizado desde base de datos", "success");
        } else {
            throw new Error("Error en respuesta de productos");
        }
    } catch (err) {
        console.error("Error al cargar desde la API:", err);
        isOnline = false;
        handleOffline();
        showToast("Error de conexión. No se pueden cargar los productos.", "error");
    }

    renderCategories();
    renderProducts();
    populateCategoryOptions();
}

// Carga de datos local (Fallback)
// Función loadFromLocalStorage eliminada. En caso de que la API no esté disponible, se muestra un mensaje de error.
function handleOffline() {
    PRODUCTS = [];
    renderCategories();
    renderProducts();
    populateCategoryOptions();
    showToast("No se pudo conectar al servidor. No hay datos disponibles.", "error");
}

// Bloque que inicializaba PRODUCTS con DEFAULT_PRODUCTS y cargaba custom_products eliminado.

// Rellenar dinámicamente las categorías del formulario de agregar
function populateCategoryOptions() {
    if (!prodCategory) return;
    
    // Obtener las categorías únicas actuales
    const categories = [...new Set(PRODUCTS.map(p => p.category))];
    
    // Mantener la primera opción por defecto y la opción "custom"
    prodCategory.innerHTML = `
        <option value="" disabled selected>Seleccione una categoría</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join("")}
        <option value="custom">Nueva categoría...</option>
    `;
}

// ----------------------------------------------------
// Gestión del Tema Claro / Oscuro
// ----------------------------------------------------
function initTheme() {
    document.documentElement.className = "theme-light";
}

function toggleTheme() {}

// Helper para resolver la ruta de la imagen según el estado online/offline
function resolveImagePath(imageName) {
    if (!imageName) return '/uploads/FRENOS.jpg';
    
    // Si ya es un enlace absoluto o Base64
    if (imageName.startsWith('data:') || imageName.startsWith('http://') || imageName.startsWith('https://')) {
        return imageName;
    }

    if (imageName.startsWith('/uploads/')) {
        return imageName;
    }
    
    // Si viene del servidor, o es un archivo local
    return `/uploads/${imageName}`;
}

// ----------------------------------------------------
// Renderizado y Filtrado del Catálogo
// ----------------------------------------------------
function renderProducts() {
    const filteredProducts = PRODUCTS.filter(product => {
        const matchesCategory = activeCategory === "all" || product.category === activeCategory;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            product.name.toLowerCase().includes(q) ||
            product.oem.toLowerCase().includes(q) ||
            product.brand.toLowerCase().includes(q) ||
            product.compatibility.toLowerCase().includes(q) ||
            product.category.toLowerCase().includes(q);

        return matchesCategory && matchesSearch;
    });

    if (filteredProducts.length === 0) {
        catalogCount.textContent = "0 productos";
        catalogGrid.innerHTML = "";
        catalogEmpty.classList.remove("catalog__empty--hidden");
    } else {
        catalogCount.textContent = `Mostrando ${filteredProducts.length} de ${PRODUCTS.length} repuestos`;
        catalogEmpty.classList.add("catalog__empty--hidden");

        catalogGrid.innerHTML = filteredProducts.map(product => {
            const imgSrc = resolveImagePath(product.image);
            // Botones de administrador (solo visibles si hay sesión activa)
            const adminButtons = isAdmin ? `
                <button class="card__button card__button--edit js-edit-product" data-id="${product.id}" style="background:var(--accent-yellow,#f39c12);color:#000;">
                    ✏️ Editar
                </button>
                <button class="card__button card__button--delete js-delete-product" data-id="${product.id}" style="background:#e74c3c;color:#fff;">
                    🗑️ Eliminar
                </button>
            ` : '';
            return `
                <div class="card" data-id="${product.id}">
                    <div class="card__image-container">
                        <img src="${imgSrc}" alt="${product.name}" class="card__image" loading="lazy" onerror="this.src='/uploads/FRENOS.jpg'">
                    </div>
                    <div class="card__info">
                        <span class="card__category">${product.category}</span>
                        <h3 class="card__title">${product.name}</h3>
                        <p class="card__oem">OEM: ${product.oem}</p>
                        <p class="card__brand" style="font-size:0.85rem; color:var(--text-muted); margin-bottom: 8px;">Marca: ${product.brand}</p>
                        <div class="card__actions">
                            <button class="card__button card__button--detail js-view-detail" data-id="${product.id}">Detalles</button>
                            <button class="card__button card__button--cart js-add-cart" data-id="${product.id}">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.8-3h9.75c.73 0 1.36-.4 1.66-1L22 4.24a1 1 0 0 0-.8-.15H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h11v-2H7.2l1.1-2z"/></svg>
                                Consultar
                            </button>
                            ${adminButtons}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        // Agregar Event Listeners dinámicos a las tarjetas
        document.querySelectorAll(".js-view-detail").forEach(btn => {
            btn.addEventListener("click", () => openDetailModal(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll(".js-add-cart").forEach(btn => {
            btn.addEventListener("click", () => addToCart(parseInt(btn.dataset.id)));
        });
        // Botones de admin: Editar y Eliminar
        document.querySelectorAll(".js-edit-product").forEach(btn => {
            btn.addEventListener("click", () => handleEditProduct(parseInt(btn.dataset.id)));
        });
        document.querySelectorAll(".js-delete-product").forEach(btn => {
            btn.addEventListener("click", () => handleDeleteProduct(parseInt(btn.dataset.id)));
        });
    }
}

function renderCategories() {
    const categoryList = document.querySelector(".category-list");
    if (!categoryList) return;

    const uniqueCategories = [...new Set(PRODUCTS.map(p => p.category))];

    categoryList.innerHTML = `
        <li>
            <button class="category-list__btn ${activeCategory === 'all' ? 'category-list__btn--active' : ''}" data-category="all">Todos</button>
        </li>
        ${uniqueCategories.map(cat => `
            <li>
                <button class="category-list__btn ${activeCategory === cat ? 'category-list__btn--active' : ''}" data-category="${cat}">${cat}</button>
            </li>
        `).join("")}
    `;

    // Asignar listeners
    document.querySelectorAll(".category-list__btn").forEach(btn => {
        btn.addEventListener("click", handleCategoryChange);
    });
}

function handleCategoryChange(e) {
    document.querySelectorAll(".category-list__btn").forEach(btn => btn.classList.remove("category-list__btn--active"));
    e.target.classList.add("category-list__btn--active");
    activeCategory = e.target.dataset.category;
    renderProducts();
}

function handleSearch(e) {
    searchQuery = e.target.value;
    renderProducts();
}

function resetFilters() {
    searchInput.value = "";
    searchQuery = "";
    activeCategory = "all";
    document.querySelectorAll(".category-list__btn").forEach(btn => {
        if (btn.dataset.category === "all") btn.classList.add("category-list__btn--active");
        else btn.classList.remove("category-list__btn--active");
    });
    renderProducts();
    showToast("Filtros restablecidos", "info");
}

// ----------------------------------------------------
// Gestión de Cotizaciones (Carrito)
// ----------------------------------------------------
function addToCart(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.product.id === productId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({ product, quantity: 1 });
    }

    saveCartToLocalStorage();
    updateCartUI();
    showToast(`"${product.name}" agregado a tu cotización`, "success");
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.product.id !== productId);
    saveCartToLocalStorage();
    updateCartUI();
    showToast("Repuesto removido de la cotización", "info");
}

function updateCartUI() {
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? "flex" : "none";

    if (cart.length === 0) {
        cartList.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 10px;">
                <p>No tienes repuestos agregados para cotizar.</p>
            </div>
        `;
        cartTotal.textContent = "$0.00";
        sendQuoteBtn.disabled = true;
        sendQuoteBtn.style.opacity = "0.5";
        sendQuoteBtn.style.cursor = "not-allowed";
    } else {
        cartList.innerHTML = cart.map(item => {
            const imgSrc = resolveImagePath(item.product.image);
            return `
                <div class="cart-drawer__item">
                    <img src="${imgSrc}" alt="${item.product.name}" class="cart-drawer__item-img" onerror="this.src='/uploads/FRENOS.jpg'">
                    <div class="cart-drawer__item-info">
                        <h4 class="cart-drawer__item-title">${item.product.name}</h4>
                        <span class="cart-drawer__item-oem">OEM: ${item.product.oem}</span>
                        <span class="cart-drawer__item-brand" style="font-size:0.8rem; color:var(--text-muted);">Marca: ${item.product.brand}</span>
                        <span class="cart-drawer__item-qty" style="font-size:0.85rem; font-weight:600; color:var(--accent-red);">Cantidad: ${item.quantity}</span>
                    </div>
                    <button class="cart-drawer__item-remove js-remove-cart" data-id="${item.product.id}" aria-label="Remover">
                        &times;
                    </button>
                </div>
            `;
        }).join("");

        if (cartTotal) {
            const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
            cartTotal.textContent = `${totalUnits} repuestos`;
        }

        sendQuoteBtn.disabled = false;
        sendQuoteBtn.style.opacity = "1";
        sendQuoteBtn.style.cursor = "pointer";

        // Listeners para botones de eliminación
        document.querySelectorAll(".js-remove-cart").forEach(btn => {
            btn.addEventListener("click", () => removeFromCart(parseInt(btn.dataset.id)));
        });
    }
}

function toggleCartDrawer(open) {
    cartDrawer.setAttribute("aria-hidden", !open);
}

function saveCartToLocalStorage() {
    localStorage.setItem("quote_cart", JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
    const saved = localStorage.getItem("quote_cart");
    if (saved) {
        try {
            cart = JSON.parse(saved);
            updateCartUI();
        } catch (e) {
            cart = [];
        }
    }
}

function sendCartQuote() {
    if (cart.length === 0) return;

    let message = "Hola Repuestos J.O Los Llanos, me gustaría consultar disponibilidad de los siguientes repuestos:\n\n";
    cart.forEach((item, index) => {
        message += `${index + 1}. *${item.product.name}*\n   - OEM: ${item.product.oem}\n   - Marca: ${item.product.brand}\n   - Cantidad: ${item.quantity}\n\n`;
    });

    message += "Quedo atento a su respuesta para coordinar la entrega en Valle de la Pascua.";

    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
}

// ----------------------------------------------------
// Modal de Detalles del Producto
// ----------------------------------------------------
function openDetailModal(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const imgSrc = resolveImagePath(product.image);

    modalContent.innerHTML = `
        <div class="modal__grid">
            <div class="modal__image-wrapper">
                <img src="${imgSrc}" alt="${product.name}" class="modal__image" onerror="this.src='/uploads/FRENOS.jpg'">
            </div>
            <div class="modal__info-wrapper">
                <span class="modal__category">${product.category}</span>
                <h2 class="modal__title">${product.name}</h2>
                
                <h4 class="modal__desc-title">Descripción y Especificaciones Técnicas</h4>
                <p class="modal__desc">${product.description}</p>
                
                <div class="modal__meta-grid">
                    <div class="modal__meta-item">
                        <span class="modal__meta-label">Código OEM</span>
                        <span class="modal__meta-value">${product.oem}</span>
                    </div>
                    <div class="modal__meta-item">
                        <span class="modal__meta-label">Marca</span>
                        <span class="modal__meta-value">${product.brand}</span>
                    </div>
                    <div class="modal__meta-item" style="grid-column: span 2;">
                        <span class="modal__meta-label">Compatibilidad</span>
                        <span class="modal__meta-value">${product.compatibility}</span>
                    </div>
                </div>
                
                <div class="modal__actions">
                    <button class="modal__btn modal__btn--cart js-modal-add-cart" data-id="${product.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-bottom:-2px;"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.8-3h9.75c.73 0 1.36-.4 1.66-1L22 4.24a1 1 0 0 0-.8-.15H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h11v-2H7.2l1.1-2z"/></svg>
                        Agregar a Consulta
                    </button>
                    <button class="modal__btn modal__btn--whatsapp js-modal-order-whatsapp" data-id="${product.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-bottom:-2px;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.817 9.817 0 0 0 12.04 2zm5.82 14.1c-.24.67-1.4 1.24-1.9 1.3-.46.06-.9.23-2.93-.57-2.6-1.03-4.27-3.7-4.4-3.87-.13-.17-1.07-1.43-1.07-2.73 0-1.3.67-1.94.91-2.2.24-.26.54-.33.72-.33.18 0 .36.01.52.02.17.01.39-.06.61.47.23.55.78 1.9.85 2.05.07.15.12.33.02.53-.1.2-.15.33-.3.51-.15.18-.32.4-.45.54-.15.16-.31.33-.13.64.18.31.81 1.33 1.74 2.16.8.71 1.48.93 1.8.1.31-.13.67-.39.85-.66.18-.26.36-.23.61-.13.25.1.1.58.12.58.02 0 .04.06.06.06zm0 0"/></svg>
                        Consultar por WhatsApp
                    </button>
                </div>
            </div>
        </div>
    `;

    detailsModal.setAttribute("aria-hidden", "false");

    // Enlazar los botones del modal
    document.querySelector(".js-modal-add-cart").addEventListener("click", () => {
        addToCart(product.id);
        closeDetailModal();
    });

    document.querySelector(".js-modal-order-whatsapp").addEventListener("click", () => {
        sendSingleWhatsApp(product);
    });
}

function closeDetailModal() {
    detailsModal.setAttribute("aria-hidden", "true");
}

function sendSingleWhatsApp(product) {
    const message = `Hola Repuestos J.O Los Llanos, estoy interesado en consultar sobre el siguiente repuesto:\n\n*${product.name}*\n- OEM: ${product.oem}\n- Marca: ${product.brand}\n- Compatibilidad: ${product.compatibility}\n\n¿Tienen disponibilidad actual para entrega en Valle de la Pascua? Gracias.`;
    const url = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
}

// ----------------------------------------------------
// Modal de Información (Misión, Visión, Valores)
// ----------------------------------------------------
function openInfoModal(tabName) {
    infoTabsBtns.forEach(btn => {
        btn.classList.toggle("info-tabs__btn--active", btn.dataset.tab === tabName);
    });

    infoPanes.forEach(pane => {
        pane.classList.toggle("info-pane--active", pane.id === `pane-${tabName}`);
    });

    infoModal.setAttribute("aria-hidden", "false");
}

function closeInfoModal() {
    infoModal.setAttribute("aria-hidden", "true");
}

// ----------------------------------------------------
// Modal de Agregar Repuestos
// ----------------------------------------------------
function openAddModal() {
    addProductModal.setAttribute("aria-hidden", "false");
}

function closeAddModal() {
    addProductModal.setAttribute("aria-hidden", "true");
    resetAddForm();
}

function resetAddForm() {
    addProductForm.reset();
    imagePreview.style.display = "none";
    imagePreview.src = "";
    uploadPlaceholderText.style.display = "block";
    prodCategoryCustom.style.display = "none";
    prodCategoryCustom.required = false;
    base64ImageData = "";
    editProductId = null;
    editProductCurrentImage = "";

    const addModalTitle = document.querySelector("#add-product-modal .modal__title");
    const addModalSubmitBtn = document.querySelector("#add-product-form button[type='submit']");
    if (addModalTitle) addModalTitle.textContent = "Agregar Nuevo Repuesto";
    if (addModalSubmitBtn) addModalSubmitBtn.textContent = "Guardar Repuesto";
}

// Manejador para el formulario de agregar/editar repuestos
async function handleAddProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("prod-name").value.trim();
    const oem = document.getElementById("prod-oem").value.trim();
    const brand = document.getElementById("prod-brand").value.trim();
    const compatibility = document.getElementById("prod-compatibility").value.trim();
    const desc = document.getElementById("prod-desc").value.trim();

    let category = prodCategory.value;
    if (category === "custom") {
        category = prodCategoryCustom.value.trim();
    }

    if (!name || !oem || !category || !brand || !compatibility) {
        showToast("Por favor, rellene todos los campos obligatorios.", "error");
        return;
    }

    let image = "FRENOS.jpg"; // Default
    const imageFileInput = prodImageFile && prodImageFile.files[0];

    // Si seleccionó un archivo local, subirlo primero mediante la API multipart
    if (imageFileInput && isOnline) {
        try {
            showToast("Subiendo imagen...", "info");
            const formData = new FormData();
            formData.append("imagen", imageFileInput);

            const uploadRes = await fetch(`${API_URL}/productos/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${adminToken}`
                },
                body: formData
            });

            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                image = uploadData.filename;
            } else {
                showToast("No se pudo subir la imagen del archivo. Se usará imagen previa o default.", "error");
            }
        } catch (uploadErr) {
            console.error("Error al subir archivo de imagen:", uploadErr);
        }
    } else if (prodImageUrl && prodImageUrl.value.trim()) {
        image = prodImageUrl.value.trim();
    } else if (editProductId && editProductCurrentImage) {
        image = editProductCurrentImage;
    }

    if (isOnline) {
        // --- GUARDAR ONLINE (Backend con autenticación JWT) ---
        try {
            showToast(editProductId ? "Actualizando repuesto..." : "Guardando repuesto en servidor...", "info");
            
            // 1. Obtener o crear ID de Categoría
            let categoryId = null;
            const existingCat = API_CATEGORIES.find(c => c.nombre.toLowerCase() === category.toLowerCase());
            
            if (existingCat) {
                categoryId = existingCat.id;
            } else {
                // Crear nueva categoría en base de datos (requiere token)
                const catRes = await fetch(`${API_URL}/categorias`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify({ nombre: category, descripcion: `Categoría de ${category}` })
                });
                
                if (catRes.ok) {
                    const catData = await catRes.json();
                    categoryId = catData.id;
                    // Actualizar lista local de categorías
                    API_CATEGORIES.push({ id: categoryId, nombre: category });
                } else {
                    throw new Error("No se pudo crear la categoría en el servidor");
                }
            }

            const productData = {
                nombre: name,
                codigo_oem: oem,
                descripcion: desc || "Sin descripción detallada.",
                precio: 0,
                stock: 0,
                imagen: image,
                categoria_id: categoryId,
                marca: brand,
                modelo_vehiculo: compatibility
            };

            let res;
            if (editProductId) {
                res = await fetch(`${API_URL}/productos/${editProductId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(productData)
                });
            } else {
                res = await fetch(`${API_URL}/productos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(productData)
                });
            }

            if (res.ok) {
                // Sincronizar catálogo completo de nuevo
                await loadFromApi();
                closeAddModal();
                showToast(editProductId ? `"${name}" actualizado exitosamente` : `"${name}" agregado exitosamente a la base de datos`, "success");
            } else {
                const errData = await res.json();
                throw new Error(errData.error || "Error al guardar el producto en el servidor");
            }

        } catch (error) {
            console.error("Error al guardar vía API:", error);
            showToast("Error al guardar el producto: " + (error.message || "Error desconocido"), "error");
        }
    }
}


// ----------------------------------------------------
// Funciones de Editar y Eliminar (Admin)
// ----------------------------------------------------
async function handleDeleteProduct(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const confirmed = confirm(`¿Estás seguro de que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    if (isOnline) {
        try {
            const res = await fetch(`${API_URL}/productos/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (res.ok) {
                showToast(`"${product.name}" eliminado del servidor`, 'success');
                await loadFromApi();
            } else if (res.status === 401) {
                showToast('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                handleLogout();
            } else {
                throw new Error('Error del servidor al eliminar');
            }
        } catch (err) {
            showToast('Error al eliminar el producto', 'error');
        }
    } else {
        // Modo offline: eliminar de localStorage
        PRODUCTS = PRODUCTS.filter(p => p.id !== productId);
        const custom = localStorage.getItem('custom_products');
        if (custom) {
            try {
                let customArr = JSON.parse(custom);
                customArr = customArr.filter(p => p.id !== productId);
                localStorage.setItem('custom_products', JSON.stringify(customArr));
            } catch (e) {}
        }
        renderCategories();
        renderProducts();
        showToast(`"${product.name}" eliminado localmente`, 'success');
    }
}

function handleEditProduct(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    editProductId = productId;
    editProductCurrentImage = product.image;

    // Cambiar títulos y textos del modal para modo Edición
    const addModalTitle = document.querySelector("#add-product-modal .modal__title");
    const addModalSubmitBtn = document.querySelector("#add-product-form button[type='submit']");
    if (addModalTitle) addModalTitle.textContent = "Editar Repuesto";
    if (addModalSubmitBtn) addModalSubmitBtn.textContent = "Guardar Cambios";

    // Rellenar campos del formulario
    document.getElementById("prod-name").value = product.name;
    document.getElementById("prod-oem").value = product.oem === 'N/D' ? '' : product.oem;
    document.getElementById("prod-brand").value = product.brand === 'N/D' ? '' : product.brand;
    document.getElementById("prod-compatibility").value = product.compatibility === 'Universal' ? '' : product.compatibility;
    document.getElementById("prod-desc").value = product.description === 'Sin descripción detallada.' ? '' : product.description;

    // Seleccionar categoría
    prodCategory.value = product.category;
    prodCategoryCustom.style.display = "none";
    prodCategoryCustom.required = false;
    prodCategoryCustom.value = "";

    // Cargar imagen en vista previa
    const imgSrc = resolveImagePath(product.image);
    imagePreview.src = imgSrc;
    imagePreview.style.display = "block";
    uploadPlaceholderText.style.display = "none";
    base64ImageData = ""; 
    if (prodImageUrl) prodImageUrl.value = product.image.startsWith("http") ? product.image : "";

    // Abrir el modal
    openAddModal();
}

// ----------------------------------------------------
// Modal de Login / Logout
// ----------------------------------------------------
function openLoginModal() {
    if (loginModal) loginModal.setAttribute('aria-hidden', 'false');
}

function closeLoginModal() {
    if (loginModal) loginModal.setAttribute('aria-hidden', 'true');
    if (loginForm) loginForm.reset();
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Por favor, completa los dos campos.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            // Guardar token y actualizar estado
            adminToken = data.token;
            isAdmin = true;
            localStorage.setItem('admin_token', adminToken);

            closeLoginModal();
            updateAdminUI();
            renderProducts(); // Re-renderizar para mostrar botones admin
            showToast(`¡Bienvenido, ${data.user.nombre}! Sesión iniciada.`, 'success');
        } else {
            showToast(data.error || 'Credenciales incorrectas. Inténtalo de nuevo.', 'error');
        }
    } catch (err) {
        showToast('Error de conexión con el servidor.', 'error');
    }
}

function handleLogout() {
    adminToken = null;
    isAdmin = false;
    localStorage.removeItem('admin_token');
    updateAdminUI();
    renderProducts(); // Re-renderizar sin botones admin
    showToast('Sesión cerrada correctamente.', 'info');
    // Limpiar el parámetro admin de la URL sin recargar
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    url.searchParams.delete('login');
    window.history.replaceState({}, '', url.toString());
}

// ----------------------------------------------------
// Sistema de Toasts (Notificaciones)
// ----------------------------------------------------
function showToast(message, type = "success") {
    if (!toastContainer) return;
    
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;

    let icon = "";
    if (type === "success") {
        icon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#25d366" style="margin-top:2px;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
    } else if (type === "error") {
        icon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff4d4d" style="margin-top:2px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    } else {
        icon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--accent-yellow)" style="margin-top:2px;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
    }

    toast.innerHTML = `
        ${icon}
        <span class="toast__text">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Auto-destrucción al terminar animación
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ----------------------------------------------------
// Configuración de Eventos del Sistema
// ----------------------------------------------------
function setupEventListeners() {
    // Tema Claro / Oscuro
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);

    // Búsqueda
    if (searchInput) searchInput.addEventListener("input", handleSearch);
    if (searchBtn) searchBtn.addEventListener("click", renderProducts);

    // Resetear Filtros
    if (resetFiltersBtn) resetFiltersBtn.addEventListener("click", resetFilters);

    // Carrito de Cotización
    if (cartToggleBtn) cartToggleBtn.addEventListener("click", () => toggleCartDrawer(true));
    if (cartCloseBtn) cartCloseBtn.addEventListener("click", () => toggleCartDrawer(false));
    if (cartOverlay) cartOverlay.addEventListener("click", () => toggleCartDrawer(false));
    if (sendQuoteBtn) sendQuoteBtn.addEventListener("click", sendQuoteBtn.disabled ? null : sendCartQuote);

    // Cerrar Modales por Overlay
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeDetailModal);
    if (modalOverlay) modalOverlay.addEventListener("click", closeDetailModal);

    // Navegación en Cabecera (Misión, Visión, Contacto)
    const navMision = document.getElementById("nav-mision-btn");
    const navVision = document.getElementById("nav-vision-btn");
    const navContacto = document.getElementById("nav-contacto-btn");

    if (navMision) navMision.addEventListener("click", () => openInfoModal("mision"));
    if (navVision) navVision.addEventListener("click", () => openInfoModal("vision"));
    if (navContacto) {
        navContacto.addEventListener("click", () => {
            const target = document.getElementById("footer-col-contact");
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
                
                // Destacar columnas del footer con la clase animada
                const contactCol = document.getElementById("footer-col-contact");
                const visitCol = document.getElementById("footer-col-visit");
                
                if (contactCol) contactCol.classList.add("footer__col--highlighted");
                if (visitCol) visitCol.classList.add("footer__col--highlighted");
                
                setTimeout(() => {
                    if (contactCol) contactCol.classList.remove("footer__col--highlighted");
                    if (visitCol) visitCol.classList.remove("footer__col--highlighted");
                }, 4000);
            }
        });
    }

    // Cerrar Modal de Información
    if (infoModalCloseBtn) infoModalCloseBtn.addEventListener("click", closeInfoModal);
    if (infoModalOverlay) infoModalOverlay.addEventListener("click", closeInfoModal);

    // Tabs del Modal de Información
    infoTabsBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            openInfoModal(e.target.dataset.tab);
        });
    });

    // Eventos del Modal de Agregar Repuesto
    if (navAddBtn) navAddBtn.addEventListener("click", openAddModal);
    if (addModalCloseBtn) addModalCloseBtn.addEventListener("click", closeAddModal);
    if (addModalCancelBtn) addModalCancelBtn.addEventListener("click", closeAddModal);
    if (addModalOverlay) addModalOverlay.addEventListener("click", closeAddModal);

    // Eventos del Modal de Login (Admin)
    if (navLoginBtn) navLoginBtn.addEventListener("click", openLoginModal);
    if (navLogoutBtn) navLogoutBtn.addEventListener("click", handleLogout);
    if (loginModalCloseBtn) loginModalCloseBtn.addEventListener("click", closeLoginModal);
    if (loginModalCancelBtn) loginModalCancelBtn.addEventListener("click", closeLoginModal);
    if (loginModalOverlay) loginModalOverlay.addEventListener("click", closeLoginModal);
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

    // Comportamiento del input de categoría
    if (prodCategory) {
        prodCategory.addEventListener("change", (e) => {
            if (e.target.value === "custom") {
                prodCategoryCustom.style.display = "block";
                prodCategoryCustom.required = true;
                prodCategoryCustom.focus();
            } else {
                prodCategoryCustom.style.display = "none";
                prodCategoryCustom.required = false;
                prodCategoryCustom.value = "";
            }
        });
    }

    // Subida de imagen local (Lectura en Base64)
    if (prodImageFile) {
        prodImageFile.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    base64ImageData = event.target.result;
                    imagePreview.src = base64ImageData;
                    imagePreview.style.display = "block";
                    uploadPlaceholderText.style.display = "none";
                    if (prodImageUrl) prodImageUrl.value = "";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Entrada de URL de imagen
    if (prodImageUrl) {
        prodImageUrl.addEventListener("input", (e) => {
            const url = e.target.value.trim();
            if (url) {
                imagePreview.src = url;
                imagePreview.style.display = "block";
                uploadPlaceholderText.style.display = "none";
                base64ImageData = "";
                if (prodImageFile) prodImageFile.value = "";
            } else {
                if (!base64ImageData) {
                    imagePreview.style.display = "none";
                    imagePreview.src = "";
                    uploadPlaceholderText.style.display = "block";
                }
            }
        });
    }

    // Envío del Formulario
    if (addProductForm) {
        addProductForm.addEventListener("submit", handleAddProductSubmit);
    }

    // Tecla Escape para cerrar modales y carrito
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeDetailModal();
            closeInfoModal();
            closeAddModal();
            toggleCartDrawer(false);
        }
    });
}
