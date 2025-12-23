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
                'brand-bg': '#ffffff', 
                'brand-dark': '#1a1a1a',
                'brand-gray': '#888888',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
            }
        }
    }
};

// 2. Variables Globales
let allPostsData = [];
// Variables para el Carrusel
let currentGalleryImages = [];
let currentImageIndex = 0;
let currentCollectionTitle = ''; // NUEVO: Para guardar el nombre de la colección actual

document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
    initMobileMenu();
    setupKeyboardListeners();
});

// 3. Carga Inicial
async function initPortfolio() {
    const loader = document.getElementById('loading');
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
        renderPortfolio('all');

    } catch (error) {
        console.error("Error crítico:", error);
        if(loader) loader.style.display = 'none';
    }
}

// 4. Renderizador Principal
window.renderPortfolio = (filter) => {
    const grid = document.getElementById('portfolio-grid');
    updateMenuState(filter); 
    grid.innerHTML = ''; 

    let itemsToShow = [];

    if (filter === 'all') {
        currentCollectionTitle = 'All Work'; // NUEVO
        itemsToShow = allPostsData.map(post => {
            const coverImage = getSmartCoverImage(post);
            return {
                type: 'cover',
                title: post.title.rendered,
                image: coverImage,
                link: post.link,
                hasImage: coverImage !== null
            };
        });
    } else {
        // NUEVO: Guardamos el título de la colección actual (ej: "Gastronomy")
        currentCollectionTitle = filter; 

        const targetPost = allPostsData.find(p => 
            p.title.rendered.toLowerCase().includes(filter.toLowerCase())
        );

        if (targetPost) {
            const galleryImages = extractGalleryImages(targetPost.content.rendered);
            itemsToShow = galleryImages.map(imgSrc => ({
                type: 'photo',
                title: filter,
                image: imgSrc,
                hasImage: true
            }));
        }
    }

    if (filter !== 'all') {
        currentGalleryImages = itemsToShow.map(item => item.image);
    }

    if (itemsToShow.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-20 text-center opacity-40 text-xs tracking-widest uppercase">No content available</div>`;
        return;
    }

    // Renderizar Tarjetas
    itemsToShow.forEach((item, index) => {
        if (item.type === 'cover' && !item.hasImage) return;

        const card = document.createElement('article');
        card.className = `group cursor-pointer opacity-0 animate-fade-in-up flex flex-col gap-3`;
        card.style.animationDelay = `${index * 100}ms`;

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
                openCarousel(index);
            }
        });

        grid.appendChild(card);
    });
};

// ==========================================
// 5. LÓGICA DEL CARRUSEL (LIGHTBOX)
// ==========================================

window.openCarousel = (index) => {
    const lightbox = document.getElementById('lightbox');
    currentImageIndex = index;
    
    lightbox.classList.remove('hidden');
    setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
    document.body.style.overflow = 'hidden';

    updateCarouselImage();
};

window.closeCarousel = () => {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('opacity-0');
    setTimeout(() => {
        lightbox.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
};

window.nextImage = (e) => {
    if(e) e.stopPropagation();
    if (currentImageIndex < currentGalleryImages.length - 1) {
        currentImageIndex++;
    } else {
        currentImageIndex = 0;
    }
    updateCarouselImage();
};

window.prevImage = (e) => {
    if(e) e.stopPropagation();
    if (currentImageIndex > 0) {
        currentImageIndex--;
    } else {
        currentImageIndex = currentGalleryImages.length - 1;
    }
    updateCarouselImage();
};

function updateCarouselImage() {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    const caption = document.getElementById('lightbox-caption'); // NUEVO: Referencia al caption
    
    // Efecto de fade out / escala antes de cambiar
    img.classList.add('opacity-0', 'scale-[0.98]');

    setTimeout(() => {
        img.src = currentGalleryImages[currentImageIndex];
        
        // Formatear contador
        const current = String(currentImageIndex + 1).padStart(2, '0');
        const total = String(currentGalleryImages.length).padStart(2, '0');
        counter.innerText = `${current} / ${total}`;

        // NUEVO: Actualizar el texto de la "marca de agua"
        // Usamos el título guardado y le damos formato
        caption.innerText = `Miranda's Archive — ${currentCollectionTitle} Collection`;

    }, 200);
}

function setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox.classList.contains('hidden')) return;
        if (e.key === 'Escape') closeCarousel();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });
}


// --- UTILIDADES ---

function getSmartCoverImage(post) {
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        return post._embedded['wp:featuredmedia'][0].source_url;
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = post.content.rendered;
    const firstImage = tempDiv.querySelector('img');
    return firstImage ? firstImage.src : null;
}

function extractGalleryImages(htmlContent) {
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    const imgs = div.querySelectorAll('img');
    return Array.from(imgs)
        .map(img => img.src)
        .filter(src => src && !src.includes('s.w.org'));
}

function updateMenuState(activeFilter) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        const isActive = btnCategory.toLowerCase() === activeFilter.toLowerCase() || 
                         activeFilter.toLowerCase().includes(btnCategory.toLowerCase()) && btnCategory !== 'all';

        if (isActive) {
            btn.className = "filter-btn text-xs md:text-sm uppercase tracking-[0.15em] border-b border-black text-black pb-1 transition-all duration-300";
        } else {
            btn.className = "filter-btn text-xs md:text-sm uppercase tracking-[0.15em] text-gray-400 hover:text-black hover:border-black border-b border-transparent transition-all pb-1";
        }
    });
}

function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if(btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'));
}

// 6. LÓGICA DEL FORMULARIO DE CONTACTO
document.addEventListener('DOMContentLoaded', () => {
    // Intentamos buscar el formulario
    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Evita que la página se recargue

            const btn = document.getElementById('submit-btn');
            const status = document.getElementById('form-status');
            const originalBtnText = btn.innerText;

            // Estado de "Enviando..."
            btn.innerText = 'SENDING...';
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            status.innerText = 'Connecting to server...';
            status.classList.remove('hidden');
            status.classList.add('text-gray-500');

            // DATOS DE EMAILJS (¡REEMPLAZA ESTO!)
            const serviceID = 'service_sg91wkp';  // Ej: 'service_x8s9...'
            const templateID = 'template_0cawmq8'; // Ej: 'template_9a2...'

            emailjs.sendForm(serviceID, templateID, this)
                .then(() => {
                    // ÉXITO
                    btn.innerText = 'MESSAGE SENT';
                    status.innerText = 'Thank you. I will reply shortly.';
                    status.classList.remove('text-gray-500');
                    status.classList.add('text-black', 'font-bold');
                    
                    contactForm.reset(); // Limpiar campos

                    setTimeout(() => {
                        btn.innerText = originalBtnText;
                        btn.disabled = false;
                        btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }, 5000);
                }, (err) => {
                    // ERROR
                    btn.innerText = 'ERROR';
                    btn.disabled = false;
                    status.innerText = 'Error sending message. Please try again.';
                    status.classList.add('text-red-500');
                    console.error('EmailJS Error:', err);
                });
        });
    }
});