// Variables globales
let isPlaying = false;
let isMuted = false;
let currentChannelIndex = 0;
let currentAudio = null;
let scrollLocked = false;
let scrollLockTimeout = null;

// Configuración de canales
const channels = [
  { name: "CH 01: PRÓXIMAMENTE", audio: "audio/channel_01.mp3", status: "próximamente" },
  { name: "CH 02: PRÓXIMAMENTE", audio: "audio/channel_02.mp3", status: "próximamente" },
  { name: "CH 03: PRÓXIMAMENTE", audio: "audio/channel_03.mp3", status: "próximamente" },
  { name: "CH 04: PRÓXIMAMENTE", audio: "audio/channel_04.mp3", status: "próximamente" },
  { name: "CH 05: PRÓXIMAMENTE", audio: "audio/channel_05.mp3", status: "próximamente" }
];

// ===== RELOJ =====
function updateClock() {
  const now = new Date();
  const timeString = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
  
  ['liveClock', 'mobileLiveClock', 'mobileLiveClock2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = timeString;
  });
}

updateClock();
setInterval(updateClock, 1000);

// ===== BARRA DE REFLEXIONES =====
function closeReflectionBar() {
  const bar = document.getElementById('reflectionBar');
  if (bar) bar.classList.add('hidden');
}

// ===== AUDIO =====
function loadAudio(index) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeEventListener('ended', soundNextTrack);
  }
  
  if (channels[index].status === "disponible") {
    currentAudio = new Audio(channels[index].audio);
    currentAudio.addEventListener('ended', soundNextTrack);
    currentAudio.volume = 0.7;
  } else {
    currentAudio = null;
  }
}

function soundTogglePlayPause() {
  if (!currentAudio) loadAudio(currentChannelIndex);
  if (!currentAudio) return;

  const playBtn = document.getElementById('soundPlayBtn');
  
  if (isPlaying) {
    currentAudio.pause();
    isPlaying = false;
    if (playBtn) {
      playBtn.classList.remove('playing');
      playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
    }
  } else {
    currentAudio.play();
    isPlaying = true;
    if (playBtn) {
      playBtn.classList.add('playing');
      playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="3" height="8" fill="currentColor"/><rect x="7" y="2" width="3" height="8" fill="currentColor"/></svg>';
    }
  }
}

function soundStop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  isPlaying = false;
  const playBtn = document.getElementById('soundPlayBtn');
  if (playBtn) {
    playBtn.classList.remove('playing');
    playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
  }
}

function soundSelectChannel(index) {
  if (index < 0 || index >= channels.length) return;
  
  if (isPlaying && currentAudio) {
    currentAudio.pause();
    isPlaying = false;
  }
  
  currentChannelIndex = index;
  document.querySelectorAll('.sound-channel-item').forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });
  
  loadAudio(index);
  const playBtn = document.getElementById('soundPlayBtn');
  if (playBtn) {
    playBtn.classList.remove('playing');
    playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
  }
}

function soundPreviousTrack() {
  currentChannelIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
  soundSelectChannel(currentChannelIndex);
}

function soundNextTrack() {
  currentChannelIndex = (currentChannelIndex + 1) % channels.length;
  soundSelectChannel(currentChannelIndex);
}

// ===== SCROLL =====
function lockScrollSmooth() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.style.overflow = 'hidden';
}

function unlockScrollSmooth() {
  if (!scrollLocked) return;
  document.body.style.overflow = '';
  scrollLocked = false;
}

function scheduleScrollUnlockSmooth(delay = 300) {
  if (scrollLockTimeout) clearTimeout(scrollLockTimeout);
  scrollLockTimeout = setTimeout(() => {
    unlockScrollSmooth();
    scrollLockTimeout = null;
  }, delay);
}

// ===== CARRUSEL SÚPER SIMPLE =====
class SimpleCarousel {
  constructor(element, index) {
    this.carousel = element;
    this.index = index;
    this.track = element.querySelector('.carousel-track');
    this.slides = element.querySelectorAll('.carousel-slide');
    this.indicators = element.querySelector('.carousel-indicators');
    this.prevBtn = element.querySelector('.carousel-btn.prev');
    this.nextBtn = element.querySelector('.carousel-btn.next');
    
    this.currentSlide = 0;
    this.totalSlides = this.slides.length;
    this.isDragging = false;
    this.startX = 0;
    
    if (!this.track || this.totalSlides === 0) {
      console.warn(`Carrusel ${index} incompleto`);
      return;
    }
    
    this.init();
  }
  
  init() {
    console.log(`Inicializando carrusel ${this.index} con ${this.totalSlides} slides`);
    
    // Forzar estilos
    this.track.style.cssText = `
      display: flex !important;
      width: ${this.totalSlides * 100}% !important;
      transition: transform 0.3s ease !important;
      transform: translateX(0%) !important;
    `;
    
    this.slides.forEach((slide, i) => {
      slide.style.cssText = `
        width: ${100 / this.totalSlides}% !important;
        flex: 0 0 ${100 / this.totalSlides}% !important;
        min-width: ${100 / this.totalSlides}% !important;
      `;
    });
    
    this.createIndicators();
    this.addEventListeners();
    this.updateCarousel();
    
    console.log(`✅ Carrusel ${this.index} listo`);
  }
  
  createIndicators() {
    if (!this.indicators || this.totalSlides <= 1) return;
    
    this.indicators.innerHTML = '';
    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('div');
      dot.classList.add('carousel-dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => this.goToSlide(i));
      this.indicators.appendChild(dot);
    }
  }
  
  updateCarousel() {
    const offset = -(this.currentSlide * (100 / this.totalSlides));
    this.track.style.transform = `translateX(${offset}%)`;
    
    // Actualizar indicadores
    if (this.indicators) {
      const dots = this.indicators.querySelectorAll('.carousel-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === this.currentSlide);
      });
    }
    
    console.log(`Carrusel ${this.index} -> slide ${this.currentSlide}`);
  }
  
  goToSlide(index) {
    if (index >= 0 && index < this.totalSlides) {
      this.currentSlide = index;
      this.updateCarousel();
    }
  }
  
  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
      this.updateCarousel();
    }
  }
  
  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateCarousel();
    }
  }
  
  addEventListeners() {
    // Botones
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prevSlide();
      });
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextSlide();
      });
    }
    
    // Touch events ultra-simples
    this.track.addEventListener('touchstart', (e) => {
      this.startX = e.touches[0].clientX;
      this.isDragging = true;
    }, { passive: true });
    
    this.track.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.startX;
      
      // Solo horizontal
      if (Math.abs(deltaX) > 30) {
        lockScrollSmooth();
        e.preventDefault();
      }
    }, { passive: false });
    
    this.track.addEventListener('touchend', (e) => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - this.startX;
      
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          this.prevSlide();
        } else {
          this.nextSlide();
        }
      }
      
      scheduleScrollUnlockSmooth();
    }, { passive: true });
    
    // Lightbox
    this.slides.forEach(slide => {
      slide.addEventListener('click', (e) => {
        if (!this.isDragging && window.innerWidth > 768) {
          const img = slide.querySelector('img');
          if (img?.src) {
            openLightbox(img.src, this.carousel);
          }
        }
      });
    });
  }
}

// ===== LIGHTBOX =====
let currentLightboxCarousel = null;
let currentLightboxSlide = 0;
let lightboxSlides = [];

function openLightbox(imageSrc, carouselElement = null) {
  if (!imageSrc || window.innerWidth <= 768) return;
  
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  
  if (lightbox && lightboxImage) {
    if (carouselElement) {
      currentLightboxCarousel = carouselElement;
      lightboxSlides = Array.from(carouselElement.querySelectorAll('.carousel-slide img')).map(img => img.src);
      currentLightboxSlide = lightboxSlides.indexOf(imageSrc);
    } else {
      lightboxSlides = [imageSrc];
      currentLightboxSlide = 0;
    }
    
    lightbox.style.display = 'flex';
    lightboxImage.src = imageSrc;
    document.body.style.overflow = 'hidden';
    updateLightboxNavigation();
    
    requestAnimationFrame(() => lightbox.classList.add('active'));
  }
}

function lightboxPrevious() {
  if (currentLightboxSlide > 0) {
    currentLightboxSlide--;
    updateLightboxImage();
  }
}

function lightboxNext() {
  if (currentLightboxSlide < lightboxSlides.length - 1) {
    currentLightboxSlide++;
    updateLightboxImage();
  }
}

function updateLightboxImage() {
  const lightboxImage = document.getElementById('lightboxImage');
  if (lightboxImage && lightboxSlides[currentLightboxSlide]) {
    lightboxImage.src = lightboxSlides[currentLightboxSlide];
    updateLightboxNavigation();
  }
}

function updateLightboxNavigation() {
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  
  if (prevBtn) prevBtn.disabled = currentLightboxSlide === 0;
  if (nextBtn) nextBtn.disabled = currentLightboxSlide === lightboxSlides.length - 1;
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    setTimeout(() => {
      if (!lightbox.classList.contains('active')) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    }, 500);
  }
}

// ===== INICIALIZACIÓN =====
function initCarousels() {
  console.log('🚀 Inicializando carruseles...');
  
  const carousels = document.querySelectorAll('.project-carousel');
  console.log(`Encontrados ${carousels.length} carruseles`);
  
  carousels.forEach((carousel, index) => {
    new SimpleCarousel(carousel, index);
  });
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM listo');
  
  setTimeout(() => {
    initCarousels();
    soundSelectChannel(0);
    console.log('✅ Inicialización completa');
  }, 100);
});

// Backup
window.addEventListener('load', () => {
  setTimeout(() => {
    const carousels = document.querySelectorAll('.project-carousel');
    if (carousels.length > 0) {
      console.log('🔄 Backup init');
      initCarousels();
    }
  }, 200);
});

// Event listeners globales
document.addEventListener('click', (e) => {
  if (e.target?.id === 'lightbox') closeLightbox();
});

document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox?.classList.contains('active')) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') { e.preventDefault(); lightboxPrevious(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext(); }
  }
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (scrollLockTimeout) clearTimeout(scrollLockTimeout);
  unlockScrollSmooth();
});

console.log('Script cargado - v5.0 Súper Simple');
console.log('Web diseñada por Pignatta - Codificada con IA como copiloto');
