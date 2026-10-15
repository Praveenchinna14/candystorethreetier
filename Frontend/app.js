const grid = document.getElementById("products-grid");
const message = document.getElementById("message");
const cartCount = document.getElementById("cart-count");

let cartItems = 0;

const candyArt = ["🍫", "🍬", "🍭", "🍩", "🍪", "🍡"];

function addToCart() {
    cartItems += 1;
    cartCount.textContent = cartItems;
}

function renderProducts(products) {
    grid.replaceChildren();

    if (!products.length) {
        message.textContent = "No candies are available right now.";
        return;
    }

    message.textContent = "";

    products.forEach((product, index) => {
        const card = document.createElement("article");
        card.className = "product-card";

        const art = document.createElement("div");
        art.className = "product-art";
        art.textContent = candyArt[index % candyArt.length];
        art.setAttribute("aria-hidden", "true");

        const info = document.createElement("div");
        info.className = "product-info";

        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.textContent =
            product.description || "A delicious treat for your sweet tooth.";

        const bottom = document.createElement("div");
        bottom.className = "product-bottom";

        const price = document.createElement("span");
        price.className = "price";
        price.textContent = `₹${Number(product.price).toFixed(2)}`;
       
        const button = document.createElement("button");
        button.className = "add-button";
        button.textContent = "Add to Cart";
        button.addEventListener("click", addToCart);

        bottom.append(price, button);
        info.append(name, description, bottom);
        card.append(art, info);
        grid.append(card);
    });
}

async function loadProducts() {
    try {
        const response = await fetch("/api/products/");

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.products)) {
            throw new Error("The products API response has an unexpected format.");
         }

        renderProducts(data.products);
    } catch (error) {
        console.error("Unable to load products:", error);
        message.textContent =
            "We couldn't load the candies. Please refresh the page and try again.";
    }
}

loadProducts();
        const button = document.createElement("button");
