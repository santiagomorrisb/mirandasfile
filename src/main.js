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
window.renderPortfolio = (filter) => {
    const grid = document.getElementById('portfolio-grid');
    
    // NUEVO: Actualizar el estado visual del menú
    updateMenuState(filter);

    grid.innerHTML = ''; 

    let itemsToShow = [];

    if (filter === 'all') {
        itemsToShow = allPostsData.map(post => ({
            type: 'cover',
            title: post.title.rendered, // "Gastronomy", "Exterior", etc.
            image: getFeaturedImage(post),
            link: post.link
        }));
    } else {
        const targetPost = allPostsData.find(p => 
            p.title.rendered.toLowerCase().includes(filter.toLowerCase())
        );

        if (targetPost) {
            const galleryImages = extractGalleryImages(targetPost.content.rendered);
            itemsToShow = galleryImages.map(imgSrc => ({
                type: 'photo',
                title: filter + ' Collection',
                image: imgSrc,
                link: targetPost.link
            }));
        }
    }

    if (itemsToShow.length === 0) {
        grid.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
            <span class="text-4xl mb-4">☹</span>
            <p class="uppercase text-xs tracking-widest">No content found for ${filter}</p>
        </div>`;
        return;
    }

    // Generar Tarjetas con Estrategia de Carga
    itemsToShow.forEach((item, index) => {
        const card = document.createElement('article');
        // Animación stagger (en cascada)
        card.className = `group cursor-pointer opacity-0 animate-fade-in-up`;
        card.style.animationDelay = `${index * 100}ms`; // Retardo progresivo

        // HTML INTERNO: Skeleton Loader + Imagen con Fade-in
        card.innerHTML = `
            <div class="relative w-full aspect-[3/4] overflow-hidden bg-gray-100 mb-5">
                
                <div class="absolute inset-0 bg-gray-200 animate-pulse z-10 skeleton-layer"></div>

                <img 
                    src="${item.image}" 
                    alt="${item.title}" 
                    class="w-full h-full object-cover transition-all duration-700 opacity-0 transform scale-105 group-hover:scale-100 filter grayscale group-hover:grayscale-0"
                    onload="this.classList.remove('opacity-0'); this.previousElementSibling.style.display='none';"
                    onerror="this.style.display='none'; this.previousElementSibling.classList.remove('animate-pulse'); this.previousElementSibling.innerHTML='<span class=\'flex h-full items-center justify-center text-gray-300 text-xs uppercase\'>Image N/A</span>';"
                >
            </div>
            
            <div class="flex justify-between items-end border-b border-transparent group-hover:border-black pb-2 transition-colors duration-300">
                <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-gray-900">
                    ${item.title}
                </h3>
                ${item.type === 'cover' ? '<span class="text-xs text-gray-400 group-hover:text-black transition-colors">Ver Colección ↗</span>' : ''}
            </div>
        `;
        
        card.addEventListener('click', () => {
            if(item.type === 'cover') {
                // Al hacer click en la portada, navegamos a esa categoría
                // IMPORTANTE: Usamos el título del post (ej: "Gastronomy")
                window.renderPortfolio(item.title); 
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                window.open(item.image, '_blank');
            }
        });

        grid.appendChild(card);
    });
};

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