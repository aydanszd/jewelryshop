const AxiosInstance = axios.create({
    baseURL: "http://localhost:1337/api",
    timeout: 3000,
});

let allProducts = [];
const getApiData = async () => {
    try {
        const res = await AxiosInstance.get("/products?populate=*");
        allProducts = res.data.data;
        renderProducts(allProducts);
        renderFilters(allProducts);
        addFilterListeners();
    } catch (err) {
        console.error("API error:", err);
    }
};
let totalLikes = 0;
const likedProducts = {};
const addedToCart = new Set();
if (!document.getElementById("product-drawer")) {
    const drawerHtml = `
    <div id="product-drawer" style="display:none; position:fixed; top:0; right:0; width:350px; height:100%; background:#fff; box-shadow:-2px 0 8px rgba(0,0,0,0.1); z-index:9999; padding:24px; overflow:auto;">
        <button id="drawer-close" style="position:absolute; top:10px; right:10px; font-size:20px;">&times;</button>
        <div id="drawer-content"></div>
    </div>
    `;
    document.body.insertAdjacentHTML("beforeend", drawerHtml);
    document.getElementById("drawer-close").onclick = () => {
        document.getElementById("product-drawer").style.display = "none";
    };
}
if (!document.getElementById("search-modal")) {
    const modalHtml = `
    <div id="search-modal" style="display:none; position:fixed; top:50%; left:50%; width:900px; height:500px; transform:translate(-50%,-50%); background:#fff; box-shadow:0 0 24px rgba(0,0,0,0.18); z-index:10000; border-radius:12px; padding:32px; overflow:auto;">
        <button id="search-modal-close" style="position:absolute; top:16px; right:16px; font-size:22px;">&times;</button>
        <div id="search-modal-content">
            <h2 style="font-size:22px; font-weight:bold; margin-bottom:24px;">Axtarış</h2>
            <input id="search-input" type="text" placeholder="Məhsul adı ilə axtar..." style="width:300px;padding:8px;border:1px solid #ccc;border-radius:4px;">
            <button id="search-btn" style="margin-left:12px;padding:8px 18px;background:#4B372A;color:#fff;border:none;border-radius:4px;cursor:pointer;">Axtar</button>
            <div id="search-results" style="margin-top:24px;"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    document.getElementById("search-modal-close").onclick = () => {
        document.getElementById("search-modal").style.display = "none";
    };

    document.getElementById("search-btn").onclick = async () => {
        const val = document.getElementById("search-input").value.trim();
        const resultsDiv = document.getElementById("search-results");
        if (!val) {
            resultsDiv.innerHTML = "<p style='color:#888;'>Axtarış üçün məhsul adı daxil edin.</p>";
            return;
        }
        resultsDiv.innerHTML = "<p style='color:#888;'>Axtarılır...</p>";
        try {
            const res = await AxiosInstance.get(`/products?filters[name][$eq]=${encodeURIComponent(val)}&populate=*`);
            const items = res.data.data;
            if (items.length === 0) {
                resultsDiv.innerHTML = "<p style='color:#888;'>Nəticə tapılmadı.</p>";
            } else {
                resultsDiv.innerHTML = items.map(item => {
                    const imgObj = item.image?.[0];
                    const imgUrl = imgObj?.url
                        ? `http://localhost:1337${imgObj.url}`
                        : "";

                    return `
                    <div class="product">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${item.name}" />` : ""}
                    <h3>${item.name}</h3>
                    <p>${item.price}</p>
                    </div>
                    `;
                }).join("");

            }
        } catch (err) {
            resultsDiv.innerHTML = "<p style='color:#c00;'>Xəta baş verdi!</p>";
        }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    const headerSearchBtn = document.querySelector('button[aria-label="Axtar"]');
    if (headerSearchBtn) {
        headerSearchBtn.addEventListener("click", () => {
            document.getElementById("search-modal").style.display = "block";
            document.getElementById("search-input").focus();
            document.getElementById("search-results").innerHTML = "";
        });
    }
});

function renderProducts(products) {
    const container = document.getElementById("product-list");
    container.innerHTML = "";

    const globalHeartCount = document.querySelector(".header-heart-count");
    const globalCartCount = document.querySelector(".header-cart-count");

    products.forEach((product, index) => {
        const name = product.name;
        const price = product.price;
        const productId = product.id; //  unikal id
        let productCartCount = 0;

        let imgUrl = "";
        if (product.image?.length > 0) {
            const imgObj = product.image[0];
            imgUrl = imgObj?.url ? `http://localhost:1337${imgObj.url}` : "";
        }


        container.insertAdjacentHTML("beforeend", `
        <article class="relative group rounded-lg p-4 text-left" id="product-${index}">
            <img src="${imgUrl}" alt="${name}" class="mb-4 w-[400px] h-[400px] object-cover">

            <div class="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition">
            
            <!-- Shopping Bag -->
            <button class="p-3 bg-white rounded-full shadow hover:scale-110 transition cart-btn">
                <i class="ri-shopping-bag-line text-[20px] text-black group-hover:text-[#4B372A] transition"></i>
            </button>

            <!-- Heart -->
            <button class="p-3 bg-white rounded-full shadow hover:scale-110 transition heart-btn">
                <i class="ri-heart-line text-[20px] text-black group-hover:text-[#4B372A] transition"></i>
            </button>

            <!-- Shuffle -->
            <button class="p-3 bg-white rounded-full shadow hover:scale-110 transition">
                <i class="ri-shuffle-line text-[20px] text-black group-hover:text-[#4B372A] transition"></i>
            </button>

            <!-- Search -->
            <button class="p-3 bg-white rounded-full shadow hover:scale-110 transition">
                <i class="ri-search-line text-[20px] text-black group-hover:text-[#4B372A] transition"></i>
            </button>

            </div>

            <h3 class="font-medium">${name}</h3>
            <p class="text-gray-500">$${price}</p>
        </article>
        `);
        const productEl = document.getElementById(`product-${index}`);
        const heartIcon = productEl.querySelector(".heart-btn i");
        likedProducts[productId] = likedProducts[productId] || false;
        heartIcon.addEventListener("click", () => {
            likedProducts[productId] = !likedProducts[productId];
            if (likedProducts[productId]) {
                heartIcon.classList.add("text-[#4B372A]");
            } else {
                heartIcon.classList.remove("text-[#4B372A]");
            }
            totalLikes = Object.values(likedProducts).filter(Boolean).length;//true
            if (globalHeartCount) {
                globalHeartCount.textContent = totalLikes;
            }
        });

        const cartBtn = productEl.querySelector(".cart-btn");
        cartBtn.addEventListener("click", () => {
            productCartCount++;
            addedToCart.add(productId);

            const drawer = document.getElementById("product-drawer");
            const drawerContent = document.getElementById("drawer-content");
            const unitPrice = parseFloat(price);
            let existingItem = drawerContent.querySelector(`.cart-item[data-id="${productId}"]`);

            if (existingItem) {
                const qtyEl = existingItem.querySelector(".qty");
                const priceEl = existingItem.querySelector(".cart-price");
                let qty = parseInt(qtyEl.textContent) + 1;
                qtyEl.textContent = qty;
                priceEl.textContent = `$${(unitPrice * qty).toFixed(2)}`;
                updateSubtotal();
            } else {
                const cartItem = document.createElement("div");
                cartItem.classList.add("cart-item");
                cartItem.setAttribute("data-id", productId);
                cartItem.style.cssText = `
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:14px 0;
        border-bottom:1px solid #eee;
        gap:12px;
    `;

                cartItem.innerHTML = `
        <img src="${imgUrl}" alt="${name}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">
        <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
        <h2 style="font-size:14px;font-weight:600;margin:0;line-height:1.3;">${name}</h2>
        <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
        <button class="qty-btn minus" data-id="${productId}" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fafafa;cursor:pointer;font-size:16px;font-weight:bold;">−</button>
            <span class="qty" id="qty-${productId}" style="min-width:24px;text-align:center;font-size:14px;">1</span>
            <button class="qty-btn plus" data-id="${productId}" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fafafa;cursor:pointer;font-size:16px;font-weight:bold;">+</button>
            </div>
            <p class="cart-price" style="margin:0;font-size:14px;font-weight:600;color:#333;">$${unitPrice.toFixed(2)}</p>
        </div>
        </div>
        <button class="remove-item" data-id="${productId}" style="background:none;border:none;font-size:18px;color:#888;cursor:pointer;">✕</button>
    `;
                drawerContent.appendChild(cartItem);
                const qtyEl = cartItem.querySelector(".qty");
                const priceEl = cartItem.querySelector(".cart-price");
                function updatePrice(qty) {
                    priceEl.textContent = `$${(unitPrice * qty).toFixed(2)}`;
                    updateSubtotal();
                }
                cartItem.querySelector(".plus").addEventListener("click", () => {
                    let qty = parseInt(qtyEl.textContent) + 1;
                    qtyEl.textContent = qty;
                    updatePrice(qty);
                });
                cartItem.querySelector(".minus").addEventListener("click", () => {
                    let qty = parseInt(qtyEl.textContent);
                    if (qty > 1) {
                        qty--;
                        qtyEl.textContent = qty;
                        updatePrice(qty);
                    }
                });

                cartItem.querySelector(".remove-item").addEventListener("click", () => {
                    cartItem.remove();
                    addedToCart.delete(productId);
                    if (globalCartCount) globalCartCount.textContent = addedToCart.size;
                    updateSubtotal();
                });
            }

            drawer.style.display = "block";
            updateSubtotal();

            if (globalCartCount) {
                const uniqueIds = new Set();
                drawerContent.querySelectorAll(".cart-item").forEach(item => {
                    uniqueIds.add(item.getAttribute("data-id"));
                });
                globalCartCount.textContent = uniqueIds.size;
            }
        });

        //total
        function updateSubtotal() {
            let total = 0;
            document.querySelectorAll(".cart-item").forEach(item => {
                const priceEl = item.querySelector(".cart-price");
                if (priceEl) {
                    total += parseFloat(priceEl.textContent.replace("$", ""));
                }
            });

            const subtotalEl = document.getElementById("cart-subtotal");
            if (subtotalEl) {
                subtotalEl.textContent = `$${total.toFixed(2)}`;
            }
        }

        // Search button cart
        const searchBtn = productEl.querySelector(".ri-search-line");
        if (searchBtn) {
            searchBtn.addEventListener("click", (e) => {
                e.stopPropagation();

                let modal = document.getElementById("product-search-modal");
                if (!modal) {
                    modal = document.createElement("div");
                    modal.id = "product-search-modal";
                    modal.style.cssText = `
                display:none;
                position:fixed;
                top:50%;
                left:50%;
                width:900px;
                max-width:95%;
                height:500px;
                transform:translate(-50%,-50%);
                background:#fff;
                box-shadow:0 8px 40px rgba(0,0,0,0.2);
                z-index:10001;
                font-family:sans-serif;
                overflow:hidden;
            `;
                    modal.innerHTML = `
                <button id="product-search-modal-close" style="
                    position:absolute; 
                    top:16px; 
                    right:16px; 
                    font-size:26px;
                    background:none;
                    border:none;
                    cursor:pointer;
                    z-index:10002;
                ">&times;</button>
                <div id="product-search-modal-content" style="display:flex;height:100%;"></div>
            `;
                    document.body.appendChild(modal);
                    document.getElementById("product-search-modal-close").onclick = () => {
                        modal.style.display = "none";
                    };
                }

                const modalContent = modal.querySelector("#product-search-modal-content");
                modalContent.innerHTML = `
            <div style="flex:1;overflow:hidden;">
                <img
            src="${product.image?.[0]?.url ? `http://localhost:1337${product.image[0].url}` : ''}"
            alt="${product.name}"
            style="width:100%;height:100%;object-fit:cover;">

            </div>

            <div style="flex:1;padding:32px;overflow-y:auto;margin-top:50px">
                <h2 style="font-size:22px; font-weight:bold; margin-bottom:8px;">${product.name}</h2>
                <p style="font-size:15px; color:#666; margin-bottom:12px;">By Webingo</p>
                
                <p style="margin-bottom:16px;">
                    <span style="text-decoration:line-through; color:#999; margin-right:8px;">$100.00</span>
                    <span style="font-size:20px; font-weight:bold; color:#000;">$${product.price}</span>
                </p>

                <p style="color:#777; font-size:15px; margin-bottom:20px;">
                    ${product.description || "Curabitur egestas malesuada volutpat. Nunc vel vestibulum odio, ac pellentesque lacus. Pellentesque dapibus nunc nec est imperdiet, a malesuada sem rutrum"}
                </p>
                <p style="color:green; font-weight:600; margin-bottom:16px;">In Stock</p>

                <div style="margin-bottom:20px;">
                    <label style="font-size:15px; font-weight:500; display:block; margin-bottom:8px;">Color:</label>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <span style="width:22px;height:22px;border-radius:50%;background:#000;cursor:pointer;"></span>
                        <span style="width:22px;height:22px;border-radius:50%;background:#d4af37;cursor:pointer;"></span>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:16px;margin-top:30px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <button id="qty-minus" style="width:32px;height:32px;background:#f5f5f5;cursor:pointer;">-</button>
                        <span id="qty-value" style="min-width:24px;text-align:center;font-size:16px;">1</span>
                        <button id="qty-plus" style="width:32px;height:32px;background:#f5f5f5;cursor:pointer;">+</button>
                    </div>

                    <button id="modal-add-to-cart" style="
                        background:#000;
                        color:#fff;
                        font-size:15px;
                        font-weight:600;
                        padding:12px 28px;
                        border:none;
                        cursor:pointer;
                        transition:0.3s;
                    " 
                    onmouseover="this.style.background='#333'" 
                    onmouseout="this.style.background='#000'">
                        ADD TO CART
                    </button>
                </div>
            </div>
        `;

                // +,-
                let qty = 1;
                const qtyValue = modal.querySelector("#qty-value");
                modal.querySelector("#qty-minus").onclick = () => {
                    if (qty > 1) {
                        qty--;
                        qtyValue.textContent = qty;
                    }
                };
                modal.querySelector("#qty-plus").onclick = () => {
                    qty++;
                    qtyValue.textContent = qty;
                };

                modal.querySelector("#modal-add-to-cart").onclick = () => {
                    const productId = product.id;
                    const globalCartCount = document.querySelector(".header-cart-count");
                    // Drawer
                    const drawer = document.getElementById("product-drawer");
                    const drawerContent = document.getElementById("drawer-content");
                    const unitPrice = parseFloat(product.price);
                    let existingItem = drawerContent.querySelector(`.cart-item[data-id="${productId}"]`);

                    if (existingItem) {
                        const qtyEl = existingItem.querySelector(".qty");
                        const priceEl = existingItem.querySelector(".cart-price");
                        let oldQty = parseInt(qtyEl.textContent);
                        let newQty = oldQty + qty;
                        qtyEl.textContent = newQty;
                        priceEl.textContent = `$${(unitPrice * newQty).toFixed(2)}`;
                        updateSubtotal();
                    } else {
                        const cartItem = document.createElement("div");
                        cartItem.classList.add("cart-item");
                        cartItem.setAttribute("data-id", productId);
                        cartItem.style.cssText = `
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:14px 0;
                    border-bottom:1px solid #eee;
                    gap:12px;
                `;
                        cartItem.innerHTML = `
                    <img src="${imgUrl}" alt="${name}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
                    <h2 style="font-size:14px;font-weight:600;margin:0;line-height:1.3;">${name}</h2>
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;align-items:center;gap:8px;">
                        <button class="qty-btn minus" data-id="${productId}" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fafafa;cursor:pointer;font-size:16px;font-weight:bold;">−</button>
                        <span class="qty" id="qty-${productId}" style="min-width:24px;text-align:center;font-size:14px;">${qty}</span>
                        <button class="qty-btn plus" data-id="${productId}" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fafafa;cursor:pointer;font-size:16px;font-weight:bold;">+</button>
                        </div>
                        <p class="cart-price" style="margin:0;font-size:14px;font-weight:600;color:#333;">$${(unitPrice * qty).toFixed(2)}</p>
                        </div>
                    </div>
                    <button class="remove-item" data-id="${productId}" style="background:none;border:none;font-size:18px;color:#888;cursor:pointer;">✕</button>
                `;
                        drawerContent.appendChild(cartItem);

                        const qtyEl = cartItem.querySelector(".qty");
                        const priceEl = cartItem.querySelector(".cart-price");
                        function updatePrice(qtyVal) {
                            priceEl.textContent = `$${(unitPrice * qtyVal).toFixed(2)}`;
                            updateSubtotal();
                        }
                        cartItem.querySelector(".plus").addEventListener("click", () => {
                            let qtyVal = parseInt(qtyEl.textContent) + 1;
                            qtyEl.textContent = qtyVal;
                            updatePrice(qtyVal);
                        });
                        cartItem.querySelector(".minus").addEventListener("click", () => {
                            let qtyVal = parseInt(qtyEl.textContent);
                            if (qtyVal > 1) {
                                qtyVal--;
                                qtyEl.textContent = qtyVal;
                                updatePrice(qtyVal);
                            }
                        });
                        cartItem.querySelector(".remove-item").addEventListener("click", () => {
                            cartItem.remove();
                            addedToCart.delete(productId);
                            if (globalCartCount) globalCartCount.textContent = addedToCart.size;
                            updateSubtotal();
                        });
                    }
                    // Cart say
                    let totalQty = 0;
                    drawerContent.querySelectorAll(".cart-item .qty").forEach(q => {
                        totalQty += parseInt(q.textContent);
                    });
                    if (globalCartCount) globalCartCount.textContent = totalQty;

                    drawer.style.display = "block";
                    updateSubtotal();
                    modal.style.display = "none";
                };

                modal.style.display = "block";
            });
        }

    });
}

//  Filter
function renderFilters(products) {
    // Categories
    const categories = [...new Set(products.flatMap(p => p.product_categories.map(c => c.name)))];
    document.getElementById("categories").innerHTML = categories.map(cat => `
    <li class="flex justify-between hover:text-gray-900 cursor-pointer filter-category" data-name="${cat}">
        <span>${cat}</span>
    </li>
        `).join('') + '<li class="text-gray-500 hover:underline cursor-pointer">+ View more</li>';

    // Availability
    document.getElementById("availability").innerHTML = `
    <li class="flex justify-between hover:text-gray-900 cursor-pointer filter-stock" data-stock="instock">
        <span>In stock</span>
    </li>
    <li class="flex justify-between text-gray-400 cursor-not-allowed filter-stock" data-stock="outstock">
        <span>Out of stock</span>
    </li>
    `;

    // Colors
    const colors = [...new Set(products.flatMap(p => p.product_colors.map(c => c.name)))];
    document.getElementById("colors").innerHTML = colors.map(color => `
    <button class="h-5 w-5 rounded-full border border-gray-300 filter-color" 
    style="background-color:${color}" data-color="${color}"></button>
    `).join('');

    // Sizes
    const sizes = [...new Set(products.flatMap(p => p.product_sizes.map(s => s.name)))];
    document.getElementById("sizes").innerHTML = sizes.map(size => `
    <button class="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100 filter-size" data-size="${size}">
    ${size} <span class="text-gray-400">(${products.filter(p => p.product_sizes.some(s2 => s2.name === size)).length})</span>
    </button>
    `).join('');
}

// filter klik
function addFilterListeners() {
    const selectedCategories = new Set();
    const selectedStocks = new Set();
    const selectedColors = new Set();
    const selectedSizes = new Set();

    function applyFilters() {
        let filtered = [...allProducts];

        if (selectedCategories.size > 0) {
            filtered = filtered.filter(p => p.product_categories.some(c => selectedCategories.has(c.name)));
        }
        if (selectedStocks.size > 0) {
            filtered = filtered.filter(p => {
                const stockNames = p.product_stocks.map(s => s.name === "instock" ? "instock" : "outstock");
                return [...selectedStocks].some(stock => stockNames.includes(stock));
            });
        }
        if (selectedColors.size > 0) {
            filtered = filtered.filter(p => p.product_colors.some(c => selectedColors.has(c.name)));
        }
        if (selectedSizes.size > 0) {
            filtered = filtered.filter(p => p.product_sizes.some(s => selectedSizes.has(s.name)));
        }

        renderProducts(filtered);
    }

    //Category
    document.querySelectorAll(".filter-category").forEach(el => {
        el.addEventListener("click", () => {
            const name = el.dataset.name;
            if (selectedCategories.has(name)) selectedCategories.delete(name);
            else selectedCategories.add(name);
            el.classList.toggle("bg-gray-200");
            applyFilters();
        });
    });

    //Stock
    document.querySelectorAll(".filter-stock").forEach(el => {
        el.addEventListener("click", () => {
            const stock = el.dataset.stock;
            if (selectedStocks.has(stock)) selectedStocks.delete(stock);
            else selectedStocks.add(stock);
            el.classList.toggle("bg-gray-200");
            applyFilters();
        });
    });

    //  Color
    document.querySelectorAll(".filter-color").forEach(el => {
        el.addEventListener("click", () => {
            const color = el.dataset.color;
            if (selectedColors.has(color)) selectedColors.delete(color);
            else selectedColors.add(color);
            el.classList.toggle("ring-2", "ring-gray-500");
            applyFilters();
        });
    });

    // Size
    document.querySelectorAll(".filter-size").forEach(el => {
        el.addEventListener("click", () => {
            const size = el.dataset.size;
            if (selectedSizes.has(size)) selectedSizes.delete(size);
            else selectedSizes.add(size);
            el.classList.toggle("bg-gray-200");
            applyFilters();
        });
    });
}
getApiData();

