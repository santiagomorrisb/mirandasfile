/* src/main.js */

// 1. Configuración Visual & Animaciones
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Epilogue', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
            colors: {
                'brand-bg': '#ffffff', // Fondo más limpio
                'brand-dark': '#1a1a1a',
                'brand-gray': '#888888',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '100%': { transform: 'translateX(100%)' }
                }
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
                'spin-slow': 'spin 3s linear infinite',
            }
        }
    }
};

// 2. Variables Globales
let allPostsData = [];

document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
    initMobileMenu();
});

// 3. Carga Inicial
async function initPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    const loader = document.getElementById('loading');
    
    // API de Miranda
    const SITE_DOMAIN = 'mirandapineiro05.wordpress.com';
    const API_URL = `https://public-api.wordpress.com/wp/v2/sites/${SITE_DOMAIN}/posts?_embed&per_page=100`;

    if(loader) loader.style.display = 'flex';

    try {
        const response = await fetch(API_URL);
        const posts = await response.json();
        
        allPostsData = posts.filter(post => {
            const t = post.title.rendered.toLowerCase();
            return !t.includes("hola mundo") && !t.includes("detail") && t !== "";
        });

        if(loader) loader.style.display = 'none';
        
        // Carga inicial
        renderPortfolio('all');

    } catch (error) {
        console.error("Error crítico:", error);
        if(loader) loader.style.display = 'none';
        grid.innerHTML = `<div class="col-span-full text-center py-20">
            <p class="text-red-500 mb-4">No se pudo conectar con el archivo.</p>
            <button onclick="location.reload()" class="underline text-sm">Intentar de nuevo</button>
        </div>`;
    }
}

// 4. Renderizador Mágico Mejorado
// 4. Renderizador Mágico (Actualizado con Lógica de "Zara")
window.renderPortfolio = (filter) => {
    const grid = document.getElementById('portfolio-grid');
    
    updateMenuState(filter); // Mantenemos la función del menú activo

    grid.innerHTML = ''; 

    let itemsToShow = [];

    if (filter === 'all') {
        // MODO PORTADA:
        // Intentamos sacar imagen destacada O la primera imagen del contenido
        itemsToShow = allPostsData.map(post => {
            const coverImage = getSmartCoverImage(post); // Usamos la nueva función inteligente
            return {
                type: 'cover',
                title: post.title.rendered,
                image: coverImage,
                link: post.link,
                hasImage: coverImage !== null // Bandera para saber si tenemos foto
            };
        });
    } else {
        // MODO GALERÍA (Igual que antes)
        const targetPost = allPostsData.find(p => 
            p.title.rendered.toLowerCase().includes(filter.toLowerCase())
        );

        if (targetPost) {
            const galleryImages = extractGalleryImages(targetPost.content.rendered);
            itemsToShow = galleryImages.map(imgSrc => ({
                type: 'photo',
                title: filter,
                image: imgSrc,
                link: targetPost.link,
                hasImage: true
            }));
        }
    }

    if (itemsToShow.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center opacity-40 text-xs tracking-widest uppercase">No content available</div>`;
        return;
    }

    // Renderizado de Tarjetas (Estilo Zara: Imagen grande, texto mínimo)
    itemsToShow.forEach((item, index) => {
        
        // Si no hay imagen en "All Work", saltamos este elemento para no romper la estética
        // Opcional: podrías mostrar una tarjeta solo texto, pero en Zara si no hay foto, no suele haber item.
        if (item.type === 'cover' && !item.hasImage) return;

        const card = document.createElement('article');
        card.className = `group cursor-pointer opacity-0 animate-fade-in-up flex flex-col gap-3`;
        card.style.animationDelay = `${index * 100}ms`;

        // HTML INTERNO
        // Eliminé bordes y sombras para hacerlo más plano (flat) y limpio
        card.innerHTML = `
            <div class="relative w-full aspect-[3/4] overflow-hidden bg-gray-100">
                
                <div class="absolute inset-0 bg-gray-200 animate-pulse z-10"></div>

                <img 
                    src="${item.image}" 
                    alt="${item.title}" 
                    class="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105 opacity-0"
                    onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';"
                    onerror="this.style.display='none';"
                >
                
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none"></div>
            </div>
            
            <div class="flex flex-col items-start pt-1">
                <h3 class="text-xs md:text-sm font-bold uppercase tracking-[0.15em] text-black group-hover:text-gray-600 transition-colors">
                    ${item.title}
                </h3>
                ${item.type === 'cover' ? 
                    `<span class="text-[10px] uppercase tracking-widest text-gray-400 mt-1">View Collection</span>` 
                    : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if(item.type === 'cover') {
                window.renderPortfolio(item.title); 
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.open(item.image, '_blank');
            }
        });

        grid.appendChild(card);
    });
};

// --- NUEVA FUNCIÓN DE IMAGEN INTELIGENTE ---
function getSmartCoverImage(post) {
    // 1. Intentar sacar la imagen destacada oficial de WP
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        return post._embedded['wp:featuredmedia'][0].source_url;
    }
    
    // 2. FALLBACK: Si no hay destacada, buscar la primera imagen dentro del contenido del post
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.content.rendered;
    const firstImage = tempDiv.querySelector('img');
    
    if (firstImage) {
        return firstImage.src;
    }

    // 3. Si no hay NADA, devolvemos null (para filtrar el item y que no salga roto)
    return null;
}

// 5. NUEVO: Función para actualizar botones del menú
function updateMenuState(activeFilter) {
    const buttons = document.querySelectorAll('.filter-btn');
    
    buttons.forEach(btn => {
        // Obtenemos la categoría guardada en el data-category del HTML
        const btnCategory = btn.getAttribute('data-category');
        
        // Comprobamos si coincide (ignorando mayúsculas/minúsculas)
        // O si el filtro activo contiene la categoría (ej: "Gastronomy Project" activa "Gastronomy")
        const isActive = btnCategory.toLowerCase() === activeFilter.toLowerCase() || 
                         activeFilter.toLowerCase().includes(btnCategory.toLowerCase()) && btnCategory !== 'all';

        if (isActive) {
            // Estilo ACTIVO (Negro, borde)
            btn.className = "filter-btn text-xs md:text-sm uppercase tracking-[0.15em] border-b border-black text-black pb-1 transition-all duration-300";
        } else {
            // Estilo INACTIVO (Gris, sin borde)
            btn.className = "filter-btn text-xs md:text-sm uppercase tracking-[0.15em] text-gray-400 hover:text-black hover:border-black border-b border-transparent transition-all pb-1";
        }
    });
}

// --- UTILIDADES ---

function getFeaturedImage(post) {
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        return post._embedded['wp:featuredmedia'][0].source_url;
    }
    // Si no hay imagen, devolvemos una cadena vacía para que salte el onerror o un placeholder elegante
    return ''; 
}

function extractGalleryImages(htmlContent) {
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    const imgs = div.querySelectorAll('img');
    return Array.from(imgs)
        .map(img => img.src)
        .filter(src => src && !src.includes('s.w.org'));
}

function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if(btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}