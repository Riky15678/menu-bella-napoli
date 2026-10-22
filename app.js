let menuData = { categories: [], dishes: [] };
let activeFilters = new Set();
let searchQuery = "";

// Inizializzazione al caricamento del DOM
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    fetchMenuData();
    setupEventListeners();
});

// Carica il file JSON del menu
async function fetchMenuData() {
    try {
        const response = await fetch('menu.json');
        menuData = await response.json();
        renderCategoryTabs();
        renderMenu();
    } catch (error) {
        console.error("Errore nel caricamento del file menu.json:", error);
    }
}

// Renderizza i tab delle categorie
function renderCategoryTabs() {
    const container = document.getElementById("categoryTabs");
    container.innerHTML = `
        <button data-cat="all" class="category-tab active px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition shadow-sm">
            Tutti i piatti
        </button>
    `;

    menuData.categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.dataset.cat = cat.id;
        btn.className = "category-tab px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 transition shadow-sm";
        btn.innerHTML = `${cat.icon} ${cat.name}`;
        container.appendChild(btn);
    });
}

// Renderizza la lista dei piatti filtrati
function renderMenu(categoryFilter = "all") {
    const container = document.getElementById("menuContainer");
    const noResults = document.getElementById("noResults");
    container.innerHTML = "";

    let filteredDishes = menuData.dishes.filter(dish => {
        // Filtro Categoria
        if (categoryFilter !== "all" && dish.category !== categoryFilter) return false;

        // Filtro Ricerca Testuale
        if (searchQuery) {
            const matchName = dish.name.toLowerCase().includes(searchQuery);
            const matchDesc = dish.description.toLowerCase().includes(searchQuery);
            if (!matchName && !matchDesc) return false;
        }

        // Filtri Allergeni / Diete
        for (let filter of activeFilters) {
            if (!dish[filter]) return false;
        }

        return true;
    });

    if (filteredDishes.length === 0) {
        noResults.classList.remove("hidden");
        return;
    } else {
        noResults.classList.add("hidden");
    }

    // Raggruppa i piatti per categoria per una migliore fruizione
    const categoriesToRender = categoryFilter === "all" 
        ? menuData.categories 
        : menuData.categories.filter(c => c.id === categoryFilter);

    categoriesToRender.forEach(cat => {
        const catDishes = filteredDishes.filter(d => d.category === cat.id);
        if (catDishes.length === 0) return;

        const section = document.createElement("section");
        section.className = "space-y-3";
        section.innerHTML = `
            <h2 class="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2 pt-2 border-b border-gray-200 dark:border-gray-800 pb-1">
                <span>${cat.icon}</span>
                <span>${cat.name}</span>
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${catDishes.map(dish => createDishCard(dish)).join('')}
            </div>
        `;
        container.appendChild(section);
    });

    // Registra gli eventi click su ogni scheda piatto per visualizzare il modal
    document.querySelectorAll(".dish-card").forEach(card => {
        card.addEventListener("click", () => {
            const dishId = parseInt(card.dataset.id);
            const dish = menuData.dishes.find(d => d.id === dishId);
            if (dish) openModal(dish);
        });
    });
}

// Genera l'HTML di singola card piatto
function createDishCard(dish) {
    const badgesHtml = getBadgesHtml(dish);
    return `
        <div data-id="${dish.id}" class="dish-card bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition cursor-pointer flex space-x-3 items-center">
            <img src="${dish.image}" alt="${dish.name}" class="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-700">
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white truncate">${dish.name}</h3>
                    <span class="text-xs font-extrabold text-brand-600 dark:text-brand-500 ml-1">€${dish.price.toFixed(2)}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">${dish.description}</p>
                <div class="flex flex-wrap gap-1 mt-2">
                    ${badgesHtml}
                </div>
            </div>
        </div>
    `;
}

// Genera i badge grafici per gli allergeni
function getBadgesHtml(dish) {
    let badges = [];
    if (dish.gluten_free) badges.push(`<span class="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded text-[10px] font-bold">🌾 No Glutine</span>`);
    if (dish.lactose_free) badges.push(`<span class="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded text-[10px] font-bold">🥛 No Lattosio</span>`);
    if (dish.vegetarian) badges.push(`<span class="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded text-[10px] font-bold">🌱 Veg</span>`);
    if (dish.spicy) badges.push(`<span class="px-1.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded text-[10px] font-bold">🌶️ Piccante</span>`);
    return badges.join('');
}

// Registra tutti gli eventi dell'interfaccia
function setupEventListeners() {
    // Gestione ricerca testuale
    const searchInput = document.getElementById("searchInput");
    const clearSearch = document.getElementById("clearSearch");

    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearch.classList.toggle("hidden", searchQuery === "");
        renderMenu(getActiveCategory());
    });

    clearSearch.addEventListener("click", () => {
        searchInput.value = "";
        searchQuery = "";
        clearSearch.classList.add("hidden");
        renderMenu(getActiveCategory());
    });

    // Gestione Chip Filtri Allergeni
    document.querySelectorAll(".filter-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            const filterKey = chip.dataset.filter;
            if (activeFilters.has(filterKey)) {
                activeFilters.delete(filterKey);
                chip.classList.remove("active");
            } else {
                activeFilters.add(filterKey);
                chip.classList.add("active");
            }
            renderMenu(getActiveCategory());
        });
    });

    // Gestione Tab Categorie
    document.getElementById("categoryTabs").addEventListener("click", (e) => {
        const tab = e.target.closest(".category-tab");
        if (!tab) return;
        document.querySelectorAll(".category-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        renderMenu(tab.dataset.cat);
    });

    // Modali
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("wifiBtn").addEventListener("click", () => document.getElementById("wifiModal").classList.remove("hidden"));
    document.getElementById("closeWifi").addEventListener("click", () => document.getElementById("wifiModal").classList.add("hidden"));
    
    document.getElementById("copyWifi").addEventListener("click", () => {
        navigator.clipboard.writeText("pizzabuona2024");
        alert("Password Wi-Fi copiata negli appunti!");
    });

    document.getElementById("resetFilters").addEventListener("click", () => {
        activeFilters.clear();
        searchQuery = "";
        document.getElementById("searchInput").value = "";
        document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        renderMenu("all");
    });
}

function getActiveCategory() {
    const activeTab = document.querySelector(".category-tab.active");
    return activeTab ? activeTab.dataset.cat : "all";
}

function openModal(dish) {
    document.getElementById("modalImage").src = dish.image;
    document.getElementById("modalTitle").textContent = dish.name;
    document.getElementById("modalPrice").textContent = `€${dish.price.toFixed(2)}`;
    document.getElementById("modalDescription").textContent = dish.description;
    document.getElementById("modalBadges").innerHTML = getBadgesHtml(dish) || `<span class="text-xs text-gray-400">Nessuna indicazione speciale</span>`;
    document.getElementById("dishModal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("dishModal").classList.add("hidden");
}

function initTheme() {
    const toggle = document.getElementById("themeToggle");
    toggle.addEventListener("click", () => {
        document.documentElement.classList.toggle("dark");
    });
}
