// Variables globales
let isPlaying = false;
let isMuted = false;
let currentChannelIndex = 0;
let currentAudio = null;

// Variables para control de scroll
let scrollLocked = false;
let scrollLockTimeout = null;

// Configuración de canales
const channels = [
  { 
    name: "CH 13: CH FRA: YEKI LATEX / DJ SET", 
    audio: "audio/channel_13.mp3",
    status: "disponible" 
  },
  { 
    name: "CH 14: CH FRA: BRODODO RAMSES, ANTA...", 
    audio: "audio/channel_14.mp3",
    status: "disponible" 
  },
  { 
    name: 'CH 15: "IMAGINARY" TV GUIDE', 
    audio: "audio/channel_15.mp3",
    status: "disponible" 
  },
  { 
    name: "CH 16: CH FRA: LA CREOLE / DJ SET", 
    audio: "audio/channel_16.mp3",
    status: "disponible" 
  },
  { 
    name: "CH 17: CH FRA: SKINNY MACHO & VIRGIL...", 
    audio: "audio/channel_17.mp3",
    status: "disponible" 
  }
];

// ===== FUNCIONES DE RELOJ =====
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timeString = `[${hh}:${mm}:${ss}]`;
  
  const clock = document.getElementById('liveClock');
  if (clock) {
    clock.textContent = timeString;
  }
  
  const mobileClock = document.getElementById('mobileLiveClock');
  if (mobileClock) {
    mobileClock.textContent = timeString;
  }
  
  const mobileClock2 = document.getElementById('mobileLiveClock2');
  if (mobileClock2) {
    mobileClock2.textContent = timeString;
  }
}

updateClock();
setInterval(updateClock, 1000);

// ===== FUNCIONES DE LA BARRA DE REFLEXIONES =====
function closeReflectionBar() {
  const reflectionBar = document.getElementById('reflectionBar');
  if (reflectionBar) {
    reflectionBar.classList.add('hidden');
  }
}

// ===== FUNCIONES DEL REPRODUCTOR DE AUDIO =====
function loadAudio(index) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeEventListener('ended', soundNextTrack);
    currentAudio.removeEventListener('error', handleAudioError);
  }
  
  if (channels[index].status === "disponible") {
    currentAudio = new Audio(channels[index].audio);
    currentAudio.addEventListener('ended', soundNextTrack);
    currentAudio.addEventListener('error', handleAudioError);
    currentAudio.volume = isMuted ? 0 : 0.7;
  } else {
    currentAudio = null;
    console.log(`Canal ${index + 1} no disponible aún`);
  }
}

function handleAudioError(e) {
  console.log(`Error cargando audio: ${channels[currentChannelIndex].audio}`);
  console.log('Verifica que el archivo existe en la carpeta "audio" de tu proyecto');
  
  const playBtn = document.getElementById('soundPlayBtn');
  if (playBtn) {
    playBtn.classList.remove('playing');
  }
  isPlaying = false;
}

function soundTogglePlayPause() {
  if (channels[currentChannelIndex].status === "próximamente") {
    console.log(`Canal ${currentChannelIndex + 1} próximamente disponible`);
    return;
  }

  if (!currentAudio) {
    loadAudio(currentChannelIndex);
  }

  if (!currentAudio) {
    console.log('No se pudo cargar el audio');
    return;
  }

  const playBtn = document.getElementById('soundPlayBtn');
  
  if (isPlaying) {
    currentAudio.pause();
    if (playBtn) {
      playBtn.classList.remove('playing');
      playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
    }
    isPlaying = false;
  } else {
    currentAudio.play().catch(e => {
      console.log('Error reproduciendo audio:', e);
      handleAudioError(e);
    });
    if (playBtn) {
      playBtn.classList.add('playing');
      playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="3" height="8" fill="currentColor"/><rect x="7" y="2" width="3" height="8" fill="currentColor"/></svg>';
    }
    isPlaying = true;
  }
  
  console.log(`${isPlaying ? 'Reproduciendo' : 'Pausado'}: ${channels[currentChannelIndex].name}`);
}

function soundStop() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  
  const playBtn = document.getElementById('soundPlayBtn');
  if (playBtn) {
    playBtn.classList.remove('playing');
    playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
  }
  
  isPlaying = false;
  console.log('Audio detenido');
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
    playBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 0v12l9-6z" fill="currentColor"/></svg>';
  }
  
  console.log(`Seleccionado: ${channels[index].name}`);
}

function soundPreviousTrack() {
  currentChannelIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
  soundSelectChannel(currentChannelIndex);
}

function soundNextTrack() {
  currentChannelIndex = (currentChannelIndex + 1) % channels.length;
  soundSelectChannel(currentChannelIndex);
}

// ===== FUNCIONES SCROLL =====
function lockScrollSmooth() {
  if (scrollLocked) return;
  scrollLocked = true;
  document.body.style.overflow = 'hidden';
  console.log('🔒 Scroll bloqueado');
}

function unlockScrollSmooth() {
  if (!scrollLocked) return;
  document.body.style.overflow = '';
  scrollLocked = false;
  console.log('🔓 Scroll desbloqueado');
}

function scheduleScrollUnlockSmooth(delay = 500) {
  if (scrollLockTimeout) {
    clearTimeout(scrollLockTimeout);
  }
  scrollLockTimeout = setTimeout(() => {
    unlockScrollSmooth();
    scrollLockTimeout = null;
  }, delay);
}

// ===== INICIALIZACIÓN ESPECÍFICA PARA GITHUB PAGES =====
function initializeForGitHub() {
  console.log('🔧 Inicialización específica para GitHub Pages');
  
  // Verificar que el CSS esté cargado correctamente
  const testElement = document.createElement('div');
  testElement.className = 'carousel-track';
  testElement.style.position = 'absolute';
  testElement.style.left = '-9999px';
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const hasFlexDisplay = computedStyle.display === 'flex';
  
  document.body.removeChild(testElement);
  
  if (!hasFlexDisplay) {
    console.warn('⚠️ CSS no cargado correctamente, aplicando estilos inline');
    applyInlineStyles();
  }
  
  // Verificar y corregir estructura DOM
  document.querySelectorAll('.project-carousel').forEach((carousel, index) => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    
    if (track && slides.length > 0) {
      // Forzar estilos inline para GitHub Pages
      track.style.display = 'flex';
      track.style.transition = 'transform 0.3s ease';
      track.style.width = `${slides.length * 100}%`;
      
      slides.forEach((slide, slideIndex) => {
        slide.style.minWidth = `${100 / slides.length}%`;
        slide.style.flex = '0 0 auto';
      });
      
      console.log(`✅ Carrusel ${index} corregido para GitHub: ${slides.length} slides`);
    }
  });
}

function applyInlineStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .carousel-track {
      display: flex !important;
      transition: transform 0.3s ease !important;
      will-change: transform !important;
    }
    .carousel-slide {
      min-width: 100% !important;
      flex: 0 0 auto !important;
    }
    .carousel-slide img {
      width: 100% !important;
      height: auto !important;
      display: block !important;
    }
  `;
  document.head.appendChild(style);
  console.log('🎨 Estilos inline aplicados para GitHub Pages');
}

// ===== CARRUSELES CON CORRECCIÓN PARA GITHUB =====
function initializeCarousels() {
  console.log('🚀 Inicializando carruseles...');
  
  // Aplicar correcciones específicas para GitHub Pages
  if (window.location.hostname.includes('github.io') || window.location.hostname.includes('pignatta.info')) {
    initializeForGitHub();
  }
  
  document.querySelectorAll('.project-carousel').forEach((carousel, index) => {
    console.log(`Carrusel ${index} encontrado`);
    
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-btn.prev');
    const nextBtn = carousel.querySelector('.carousel-btn.next');
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    
    if (!track || slides.length === 0) {
      console.log(`❌ Carrusel ${index} sin elementos - track: ${!!track}, slides: ${slides.length}`);
      return;
    }
    
    console.log(`✅ Carrusel ${index}: ${slides.length} slides`);
    
    // FORZAR configuración para GitHub Pages
    track.style.display = 'flex';
    track.style.width = '100%';
    track.style.transform = 'translateX(0%)';
    
    slides.forEach(slide => {
      slide.style.minWidth = '100%';
      slide.style.flex = '0 0 100%';
    });
    
    let currentSlide = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // Crear indicadores
    if (indicatorsContainer && slides.length > 1) {
      indicatorsContainer.innerHTML = '';
      for (let i = 0; i < slides.length; i++) {
        const dot = document.createElement('div');
        dot.classList.add('carousel-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        indicatorsContainer.appendChild(dot);
      }
    }
    
    // Actualizar carrusel con forzado para GitHub
    function updateCarousel() {
      const offset = -currentSlide * 100;
      track.style.transform = `translateX(${offset}%)`;
      track.style.transition = 'transform 0.3s ease';
      
      // Forzar repaint para GitHub Pages
      track.offsetHeight;
      
      // Actualizar indicadores
      const dots = indicatorsContainer?.querySelectorAll('.carousel-dot');
      if (dots) {
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === currentSlide);
        });
      }
      
      console.log(`📍 Carrusel ${index} -> slide ${currentSlide} (${offset}%)`);
      
      // Verificación adicional para GitHub Pages
      setTimeout(() => {
        const currentTransform = track.style.transform;
        if (currentTransform !== `translateX(${offset}%)`) {
          console.warn(`⚠️ Transform no aplicado correctamente, forzando...`);
          track.style.transform = `translateX(${offset}%)`;
        }
      }, 50);
    }
    
    function goToSlide(slideIndex) {
      if (slideIndex >= 0 && slideIndex < slides.length) {
        currentSlide = slideIndex;
        updateCarousel();
      }
    }
    
    function nextSlide() {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        updateCarousel();
      }
    }
    
    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateCarousel();
      }
    }
    
    // Touch events simples pero robustos
    function handleTouchStart(e) {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isDragging = true;
      track.style.transition = 'none';
    }
    
    function handleTouchMove(e) {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      
      // Si es más vertical que horizontal, permitir scroll
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
        isDragging = false;
        track.style.transition = 'transform 0.3s ease';
        updateCarousel();
        return;
      }
      
      // Si es horizontal, bloquear scroll y mover carrusel
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
        lockScrollSmooth();
        e.preventDefault();
        
        const percentage = (deltaX / track.offsetWidth) * 100;
        const offset = -currentSlide * 100 + percentage;
        track.style.transform = `translateX(${offset}%)`;
      }
    }
    
    function handleTouchEnd(e) {
      if (!isDragging) return;
      
      isDragging = false;
      track.style.transition = 'transform 0.3s ease';
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const threshold = track.offsetWidth * 0.25; // Más sensible para GitHub
      
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          prevSlide();
        } else {
          nextSlide();
        }
      } else {
        updateCarousel();
      }
      
      scheduleScrollUnlockSmooth(200);
    }
    
    // Event listeners
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevSlide();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextSlide();
      });
    }
    
    track.addEventListener('touchstart', handleTouchStart, { passive: true });
    track.addEventListener('touchmove', handleTouchMove, { passive: false });
    track.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Lightbox para desktop
    slides.forEach(slide => {
      slide.addEventListener('click', (e) => {
        if (!isDragging && window.innerWidth > 768) {
          const img = slide.querySelector('img');
          if (img?.src) {
            openLightbox(img.src, carousel);
          }
        }
      });
    });
    
    // Inicializar con verificación
    updateCarousel();
    
    // Verificación final para GitHub Pages
    setTimeout(() => {
      const finalTransform = track.style.transform;
      console.log(`🔍 Verificación final carrusel ${index}: ${finalTransform}`);
      if (!finalTransform.includes('translateX')) {
        console.warn(`⚠️ Aplicando transform de emergencia carrusel ${index}`);
        track.style.transform = 'translateX(0%)';
      }
    }, 100);
    
    console.log(`✅ Carrusel ${index} completamente listo`);
  });
}

// Variables globales para lightbox
let currentLightboxCarousel = null;
let currentLightboxSlide = 0;
let lightboxSlides = [];

// ===== FUNCIONES DE LIGHTBOX =====
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
      currentLightboxCarousel = null;
      lightboxSlides = [imageSrc];
      currentLightboxSlide = 0;
    }
    
    lightbox.style.display = 'flex';
    
    const img = new Image();
    img.onload = function() {
      lightboxImage.src = imageSrc;
      document.body.style.overflow = 'hidden';
      updateLightboxNavigation();
      
      requestAnimationFrame(() => {
        lightbox.classList.add('active');
      });
    };
    
    img.onerror = function() {
      console.log('Error cargando imagen:', imageSrc);
      lightbox.style.display = 'none';
    };
    
    img.src = imageSrc;
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
  
  if (prevBtn) {
    prevBtn.disabled = currentLightboxSlide === 0;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentLightboxSlide === lightboxSlides.length - 1;
  }
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
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM listo, inicializando...');
  
  setTimeout(() => {
    initializeCarousels();
    soundSelectChannel(0);
    console.log('✅ Portfolio inicializado');
  }, 100);
});

// Backup
window.addEventListener('load', () => {
  setTimeout(() => {
    const carousels = document.querySelectorAll('.project-carousel');
    if (carousels.length > 0) {
      console.log('🔄 Backup initialization');
      initializeCarousels();
    }
  }, 200);
});

// Event listeners globales
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'lightbox') {
    closeLightbox();
  }
});

document.addEventListener('keydown', (e) => {
  const lightbox = document.getElementById('lightbox');
  if (lightbox && lightbox.classList.contains('active')) {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      lightboxPrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      lightboxNext();
    }
  }
});

// Cleanup
window.addEventListener('beforeunload', () => {
  if (scrollLockTimeout) {
    clearTimeout(scrollLockTimeout);
  }
  unlockScrollSmooth();
});

console.log('Script cargado - Radio Imaginaria v3.0 - Ultra-simple');
console.log('Web diseñada por Pignatta - Codificada con IA como copiloto');
