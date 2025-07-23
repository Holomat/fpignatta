// Variables globales
let isPlaying = false;
let isMuted = false;
let currentChannelIndex =0;
let currentAudio = null;

// Variables para control de scroll temporal
let scrollLocked = false;
let scrollLockTimeout = null;

// Función para bloquear scroll SIN saltar posición
function lockScrollSmooth() {
  if (scrollLocked) return;
  
  scrollLocked = true;
  // Solo prevenir scroll, NO cambiar posición
  document.body.style.overflow = 'hidden';
  // NO usar position fixed para evitar salto
  
  console.log('🔒 Scroll bloqueado suavemente');
}

// Función para desbloquear scroll suavemente
function unlockScrollSmooth() {
  if (!scrollLocked) return;
  
  document.body.style.overflow = '';
  scrollLocked = false;
  console.log('🔓 Scroll desbloqueado suavemente');
}

// Función para programar desbloqueo suave
function scheduleScrollUnlockSmooth(delay = 500) {
  // Limpiar timeout anterior si existe
  if (scrollLockTimeout) {
    clearTimeout(scrollLockTimeout);
  }
  
  // Programar desbloqueo
  scrollLockTimeout = setTimeout(() => {
    unlockScrollSmooth();
    scrollLockTimeout = null;
  }, delay);
}

// Configuración de canales con archivos de audio demo
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

// ===== FUNCIONES DE CARRUSELES MEJORADAS =====
function initializeCarousels() {
  document.querySelectorAll('.project-carousel').forEach(carousel => {
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    
    if (!track || !slides.length) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let isVerticalMove = false;
    let startTransform = 0;
    let hasStarted = false; // Bandera para evitar dobles eventos

    // Crear indicadores mejorados
    function createIndicators() {
      if (!indicatorsContainer) return;
      
      indicatorsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.classList.add('carousel-dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        indicatorsContainer.appendChild(dot);
      }
      updateIndicators();
    }

    function updateIndicators() {
      if (!indicatorsContainer) return;
      
      const dots = indicatorsContainer.querySelectorAll('.carousel-dot');
      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
      });
    }

    function updateCarousel() {
      const offset = -currentSlide * 100;
      track.style.transform = `translateX(${offset}%)`;
      updateIndicators();
    }

    function goToSlide(index) {
      if (index >= 0 && index < totalSlides) {
        currentSlide = index;
        updateCarousel();
      }
    }

    function nextSlide() {
      if (currentSlide < totalSlides - 1) {
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

    // Touch events INTELIGENTES - detección de intención real
    function handleTouchStart(e) {
      // NO bloquear inmediatamente, solo preparar
      if (hasStarted) return;
      hasStarted = true;
      
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      isDragging = true;
      isVerticalMove = false;
      startTransform = -currentSlide * 100;
      track.style.transition = 'none';
      
      // NO prevenir nada aún, solo observar
      setTimeout(() => { hasStarted = false; }, 30);
    }

    function handleTouchMove(e) {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Esperar movimiento mínimo para determinar intención
      if (absX < 8 && absY < 8) return;
      
      // DETECCIÓN DE INTENCIÓN después de 15px de movimiento
      if (!isVerticalMove && (absX > 15 || absY > 15)) {
        
        // CASO 1: Claramente VERTICAL - permitir scroll
        if (absY > absX && absY > 20) {
          isVerticalMove = true;
          isDragging = false;
          track.style.transition = 'transform 0.4s ease';
          updateCarousel();
          
          // 🔓 MANTENER SCROLL LIBRE para vertical
          console.log('📱 Scroll vertical detectado - carrusel bloqueado');
          return; // Salir sin prevenir nada
        }
        
        // CASO 2: Claramente HORIZONTAL - bloquear scroll
        if (absX > absY && absX > 20) {
          isVerticalMove = false;
          
          // 🔒 BLOQUEAR SCROLL solo ahora que sabemos que es horizontal
          lockScrollSmooth();
          console.log('🔄 Carrusel horizontal activado - scroll bloqueado');
          
          // Ahora sí prevenir eventos
          e.preventDefault();
          e.stopPropagation();
        }
        
        // CASO 3: Diagonal - esperar más movimiento
        // No hacer nada, seguir observando
      }
      
      // Si ya se determinó que es vertical, salir completamente
      if (isVerticalMove) return;
      
      // Solo actuar si ya se confirmó que es horizontal
      if (!isVerticalMove && absX > absY && absX > 20) {
        e.preventDefault();
        e.stopPropagation();
        
        // BOUNDED NAVIGATION
        const percentage = (deltaX / track.offsetWidth) * 100;
        let newTransform = startTransform + percentage;
        
        const minTransform = -(totalSlides - 1) * 100;
        const maxTransform = 0;
        
        if (currentSlide === 0 && deltaX > 0) {
          newTransform = Math.min(maxTransform, percentage * 0.2);
        } else if (currentSlide === totalSlides - 1 && deltaX < 0) {
          newTransform = Math.max(minTransform, minTransform + (percentage * 0.2));
        } else {
          newTransform = Math.max(minTransform, Math.min(maxTransform, newTransform));
        }
        
        track.style.transform = `translateX(${newTransform}%)`;
      }
    }

    function handleTouchEnd(e) {
      if (!isDragging || isVerticalMove) {
        // Si era vertical, no había bloqueo
        isDragging = false;
        isVerticalMove = false;
        hasStarted = false;
        return;
      }
      
      isDragging = false;
      track.style.transition = 'transform 0.4s ease';
      
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const deltaX = endX - startX;
      const absX = Math.abs(deltaX);
      
      // Solo si hubo movimiento horizontal significativo
      if (absX > 15) {
        const threshold = track.offsetWidth * 0.3;
        
        if (absX > threshold) {
          if (deltaX > 0 && currentSlide > 0) {
            prevSlide();
          } else if (deltaX < 0 && currentSlide < totalSlides - 1) {
            nextSlide();
          } else {
            updateCarousel();
          }
        } else {
          updateCarousel();
        }
        
        // Desbloquear después de la animación
        scheduleScrollUnlockSmooth(400);
      } else {
        // Movimiento muy pequeño, desbloquear inmediatamente
        scheduleScrollUnlockSmooth(50);
      }
      
      // Limpiar estados
      setTimeout(() => {
        isDragging = false;
        isVerticalMove = false;
        hasStarted = false;
      }, 300);
    }

    // Mouse events para desktop (sin cambios)
    function handleMouseDown(e) {
      startX = e.clientX;
      isDragging = true;
      startTransform = -currentSlide * 100;
      track.style.transition = 'none';
      e.preventDefault();
    }

    function handleMouseMove(e) {
      if (!isDragging) return;
      
      const currentX = e.clientX;
      const deltaX = currentX - startX;
      const percentage = (deltaX / track.offsetWidth) * 100;
      
      track.style.transform = `translateX(${startTransform + percentage}%)`;
    }

    function handleMouseUp(e) {
      if (!isDragging) return;
      
      isDragging = false;
      track.style.transition = 'transform 0.4s ease';
      
      const endX = e.clientX;
      const deltaX = endX - startX;
      const threshold = track.offsetWidth * 0.2;
      
      if (deltaX > threshold) {
        prevSlide();
      } else if (deltaX < -threshold) {
        nextSlide();
      } else {
        updateCarousel();
      }
    }

    // Event listeners INTELIGENTES
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevSlide();
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextSlide();
      });
    }

    // Touch events con detección inteligente
    track.addEventListener('touchstart', handleTouchStart, { 
      passive: true,  // Cambio a passive para no interferir
      capture: false 
    });
    track.addEventListener('touchmove', handleTouchMove, { 
      passive: false,  // Solo false cuando necesitamos prevenir
      capture: false 
    });
    track.addEventListener('touchend', handleTouchEnd, { 
      passive: true,
      capture: false 
    });

    // Mouse events (sin cambios para desktop)
    track.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Click en slides para abrir lightbox (solo desktop)
    slides.forEach((slide, index) => {
      slide.addEventListener('click', (e) => {
        if (!isDragging && window.innerWidth > 768) {
          const img = slide.querySelector('img');
          if (img && img.src) {
            openLightbox(img.src, carousel);
          }
        }
      });
    });

    // Inicializar
    createIndicators();
    updateCarousel();
  });
}

// Variables globales para lightbox
let currentLightboxCarousel = null;
let currentLightboxSlide = 0;
let lightboxSlides = [];

// ===== FUNCIONES DE LIGHTBOX PREMIUM CON NAVEGACIÓN =====
function openLightbox(imageSrc, carouselElement = null) {
  if (!imageSrc || window.innerWidth <= 768) return;
  
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  
  if (lightbox && lightboxImage) {
    // Configurar carrusel activo para navegación
    if (carouselElement) {
      currentLightboxCarousel = carouselElement;
      lightboxSlides = Array.from(carouselElement.querySelectorAll('.carousel-slide img')).map(img => img.src);
      currentLightboxSlide = lightboxSlides.indexOf(imageSrc);
    } else {
      // Para imágenes individuales
      currentLightboxCarousel = null;
      lightboxSlides = [imageSrc];
      currentLightboxSlide = 0;
    }
    
    // Mostrar lightbox inmediatamente pero invisible
    lightbox.style.display = 'flex';
    
    // Precargar imagen para evitar problemas de carga
    const img = new Image();
    img.onload = function() {
      lightboxImage.src = imageSrc;
      document.body.style.overflow = 'hidden';
      updateLightboxNavigation();
      
      // Trigger de animación después de un frame
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
    
    // Sincronizar con el carrusel original
    if (currentLightboxCarousel) {
      const carouselInstance = getCarouselInstance(currentLightboxCarousel);
      if (carouselInstance) {
        carouselInstance.goToSlide(currentLightboxSlide);
      }
    }
  }
}

function lightboxNext() {
  if (currentLightboxSlide < lightboxSlides.length - 1) {
    currentLightboxSlide++;
    updateLightboxImage();
    
    // Sincronizar con el carrusel original
    if (currentLightboxCarousel) {
      const carouselInstance = getCarouselInstance(currentLightboxCarousel);
      if (carouselInstance) {
        carouselInstance.goToSlide(currentLightboxSlide);
      }
    }
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

// Función auxiliar para obtener instancia de carrusel
function getCarouselInstance(carouselElement) {
  return {
    goToSlide: function(index) {
      const track = carouselElement.querySelector('.carousel-track');
      const indicators = carouselElement.querySelectorAll('.carousel-dot');
      
      if (track) {
        const offset = -index * 100;
        track.style.transform = `translateX(${offset}%)`;
      }
      
      indicators.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }
  };
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    
    // Esperar a que termine la animación antes de ocultar
    setTimeout(() => {
      if (!lightbox.classList.contains('active')) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    }, 500);
  }
}

// ===== EVENT LISTENERS GLOBALES =====
document.addEventListener('DOMContentLoaded', function() {
  initializeCarousels();
  soundSelectChannel(0);
  
  console.log('Portfolio inicializado correctamente');
  console.log('Diseño: Federico Pignatta | Desarrollo: IA como copiloto');
});

// Cerrar lightbox al hacer click fuera de la imagen, con ESC, o con navegación de carrusel
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'lightbox') {
    closeLightbox();
  }
});

// Navegación con teclado en lightbox
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
  } else if (e.key === 'Escape') {
    closeLightbox();
  }
});

// ===== FUNCIONES DE UTILIDAD =====
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

window.addEventListener('resize', debounce(() => {
  console.log('Ventana redimensionada');
}, 250));

document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
  }
});

function isMobileDevice() {
  return window.innerWidth <= 768 || 
         /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

if (isMobileDevice()) {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Dispositivo móvil detectado. La barra de reflexiones permanecerá visible.');
  });
}

// Limpiar al cambiar de página o cerrar
window.addEventListener('beforeunload', () => {
  if (scrollLockTimeout) {
    clearTimeout(scrollLockTimeout);
  }
  unlockScrollSmooth();
});

// Limpiar si hay cambio de orientación
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (scrollLocked) {
      unlockScrollSmooth();
    }
  }, 100);
});

console.log('Script cargado - Radio Imaginaria v1.8 - Detección inteligente de intención');
console.log('Canales disponibles:', channels.length);
console.log('Canales configurados:', channels.map(ch => ch.name));
console.log('Web diseñada por Pignatta - Codificada con IA como copiloto');