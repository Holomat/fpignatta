// Mouse events actualizados para nuevas referencias
    function handleMouseDown(e) {
      const state = carouselState;
      state.startX = e.clientX;
      state.isDragging = true;
      state.startTransform = -state.currentSlide * 100;
      newTrack.style.transition = 'none';
      e.preventDefault();
    }

    function handleMouseMove(e) {
      const state = carouselState;
      if (!state.isDragging) return;
      
      const currentX = e.clientX;
      const deltaX = currentX - state.startX;
      const percentage = (deltaX / newTrack.offsetWidth) * 100;
      
      newTrack.style.transform = `translateX(${state.startTransform + percentage}%)`;
    }

    function handleMouseUp(e) {
      const state = carouselState;
      if (!state.isDragging) return;
      
      state.isDragging = false;
      newTrack.style.transition = 'transform 0.4s ease';
      
      const endX = e.clientX;
      const deltaX = endX - state.startX;
      const threshold = newTrack.offsetWidth * 0.2;
      
      if (deltaX > threshold) {
        prevSlide();
      } else if (deltaX < -threshold) {
        nextSlide();
      } else {
        updateCarousel();
      }
    }// Variables globales
let isPlaying = false;
let isMuted = false;
let currentChannelIndex =0;
let currentAudio = null;

// Variables para control de scroll temporal - GLOBALES
let scrollLocked = false;
let scrollLockTimeout = null;
let activeCarousels = new Map(); // Tracking de carruseles activos

// Función para reset completo de estados
function resetAllCarouselStates() {
  activeCarousels.forEach((carouselData, carousel) => {
    carouselData.isDragging = false;
    carouselData.isVerticalMove = false;
    carouselData.hasStarted = false;
  });
  
  if (scrollLocked) {
    unlockScrollSmooth();
  }
  
  console.log('🔄 Reset completo de estados de carruseles');
}

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

// ===== FUNCIONES DE CARRUSELES ULTRA-ROBUSTAS =====
function initializeCarousels() {
  // Limpiar carruseles existentes primero
  activeCarousels.clear();
  
  document.querySelectorAll('.project-carousel').forEach((carousel, carouselIndex) => {
    // Verificar si ya está inicializado
    if (carousel.hasAttribute('data-initialized')) {
      console.log(`⚠️ Carrusel ${carouselIndex} ya inicializado, saltando...`);
      return;
    }
    
    carousel.setAttribute('data-initialized', 'true');
    
    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.prev');
    const nextBtn = carousel.querySelector('.next');
    const indicatorsContainer = carousel.querySelector('.carousel-indicators');
    
    if (!track || !slides.length) {
      console.warn(`❌ Carrusel ${carouselIndex} incompleto`);
      return;
    }
    
    // Crear objeto de estado para este carrusel
    const carouselState = {
      currentSlide: 0,
      totalSlides: slides.length,
      isDragging: false,
      isVerticalMove: false,
      hasStarted: false,
      startX: 0,
      startY: 0,
      startTransform: 0,
      carouselIndex: carouselIndex
    };
    
    // Registrar en el Map global
    activeCarousels.set(carousel, carouselState);
    
    console.log(`✅ Inicializando carrusel ${carouselIndex} con ${carouselState.totalSlides} slides`);

    // Crear indicadores
    function createIndicators() {
      if (!indicatorsContainer) return;
      
      indicatorsContainer.innerHTML = '';
      for (let i = 0; i < carouselState.totalSlides; i++) {
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
        dot.classList.toggle('active', index === carouselState.currentSlide);
      });
    }

    function updateCarousel() {
      const offset = -carouselState.currentSlide * 100;
      track.style.transform = `translateX(${offset}%)`;
      updateIndicators();
    }

    function goToSlide(index) {
      if (index >= 0 && index < carouselState.totalSlides) {
        carouselState.currentSlide = index;
        updateCarousel();
      }
    }

    function nextSlide() {
      if (carouselState.currentSlide < carouselState.totalSlides - 1) {
        carouselState.currentSlide++;
        updateCarousel();
      }
    }

    function prevSlide() {
      if (carouselState.currentSlide > 0) {
        carouselState.currentSlide--;
        updateCarousel();
      }
    }

    // Touch events ULTRA-ROBUSTOS con cleanup automático
    function handleTouchStart(e) {
      const state = carouselState; // Referencia local
      
      console.log(`🔸 TouchStart carrusel ${state.carouselIndex} - Estado: dragging=${state.isDragging}, hasStarted=${state.hasStarted}`);
      
      // RESET forzado si hay estado inconsistente
      if (state.hasStarted || state.isDragging) {
        console.log(`⚠️ Estado inconsistente detectado, reseteando carrusel ${state.carouselIndex}`);
        state.hasStarted = false;
        state.isDragging = false;
        state.isVerticalMove = false;
      }
      
      state.hasStarted = true;
      
      const touch = e.touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.isDragging = true;
      state.isVerticalMove = false;
      state.startTransform = -state.currentSlide * 100;
      newTrack.style.transition = 'none';
      
      // Reset con timeout de seguridad
      setTimeout(() => { 
        if (state.hasStarted) {
          state.hasStarted = false;
        }
      }, 100);
    }

    function handleTouchMove(e) {
      const state = carouselState; // Referencia local
      
      if (!state.isDragging) {
        console.log(`⚠️ TouchMove sin dragging activo en carrusel ${state.carouselIndex}`);
        return;
      }
      
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const deltaX = currentX - state.startX;
      const deltaY = currentY - state.startY;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      // Umbrales más permisivos
      if (absX < 6 && absY < 6) return;
      
      // DETECCIÓN DE INTENCIÓN
      if (!state.isVerticalMove && (absX > 12 || absY > 12)) {
        
        // CASO 1: VERTICAL
        if (absY > absX && absY > 18) {
          console.log(`📱 Scroll vertical en carrusel ${state.carouselIndex}`);
          state.isVerticalMove = true;
          state.isDragging = false;
          track.style.transition = 'transform 0.4s ease';
          updateCarousel();
          return;
        }
        
        // CASO 2: HORIZONTAL
        if (absX > absY && absX > 18) {
          console.log(`🔄 Carrusel horizontal ${state.carouselIndex}`);
          state.isVerticalMove = false;
          lockScrollSmooth();
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      // Si es vertical, salir
      if (state.isVerticalMove) return;
      
      // Solo actuar si es horizontal confirmado
      if (!state.isVerticalMove && absX > absY && absX > 15) {
        e.preventDefault();
        e.stopPropagation();
        
        // BOUNDED NAVIGATION
        const percentage = (deltaX / track.offsetWidth) * 100;
        let newTransform = state.startTransform + percentage;
        
        const minTransform = -(state.totalSlides - 1) * 100;
        const maxTransform = 0;
        
        if (state.currentSlide === 0 && deltaX > 0) {
          newTransform = Math.min(maxTransform, percentage * 0.25);
        } else if (state.currentSlide === state.totalSlides - 1 && deltaX < 0) {
          newTransform = Math.max(minTransform, minTransform + (percentage * 0.25));
        } else {
          newTransform = Math.max(minTransform, Math.min(maxTransform, newTransform));
        }
        
        track.style.transform = `translateX(${newTransform}%)`;
      }
    }

    function handleTouchEnd(e) {
      const state = carouselState; // Referencia local
      
      console.log(`🔹 TouchEnd carrusel ${state.carouselIndex} - Estado: dragging=${state.isDragging}, vertical=${state.isVerticalMove}`);
      
      if (!state.isDragging || state.isVerticalMove) {
        // Limpiar estados siempre
        state.isDragging = false;
        state.isVerticalMove = false;
        state.hasStarted = false;
        return;
      }
      
      state.isDragging = false;
      track.style.transition = 'transform 0.4s ease';
      
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const deltaX = endX - state.startX;
      const absX = Math.abs(deltaX);
      
      // Solo si hubo movimiento significativo
      if (absX > 12) {
        const threshold = track.offsetWidth * 0.28;
        
        if (absX > threshold) {
          if (deltaX > 0 && state.currentSlide > 0) {
            prevSlide();
          } else if (deltaX < 0 && state.currentSlide < state.totalSlides - 1) {
            nextSlide();
          } else {
            updateCarousel();
          }
        } else {
          updateCarousel();
        }
        
        scheduleScrollUnlockSmooth(350);
      } else {
        scheduleScrollUnlockSmooth(50);
      }
      
      // LIMPIEZA FORZADA
      setTimeout(() => {
        state.isDragging = false;
        state.isVerticalMove = false;
        state.hasStarted = false;
        console.log(`🧹 Estados limpiados para carrusel ${state.carouselIndex}`);
      }, 250);
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

    // Event listeners con cleanup mejorado
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

    // REMOVER event listeners existentes para evitar duplicados
    const clonedTrack = track.cloneNode(true);
    track.parentNode.replaceChild(clonedTrack, track);
    
    // ACTUALIZAR TODAS LAS REFERENCIAS después del clonado
    const newTrack = carousel.querySelector('.carousel-track');
    const newSlides = carousel.querySelectorAll('.carousel-slide');
    
    // Actualizar funciones para usar las nuevas referencias
    function updateCarousel() {
      const offset = -carouselState.currentSlide * 100;
      newTrack.style.transform = `translateX(${offset}%)`;
      updateIndicators();
    }

    // Actualizar todas las funciones que usan track
    function handleTouchStart(e) {
      const state = carouselState;
      
      console.log(`🔸 TouchStart carrusel ${state.carouselIndex} - Estado: dragging=${state.isDragging}, hasStarted=${state.hasStarted}`);
      
      if (state.hasStarted || state.isDragging) {
        console.log(`⚠️ Estado inconsistente detectado, reseteando carrusel ${state.carouselIndex}`);
        state.hasStarted = false;
        state.isDragging = false;
        state.isVerticalMove = false;
      }
      
      state.hasStarted = true;
      
      const touch = e.touches[0];
      state.startX = touch.clientX;
      state.startY = touch.clientY;
      state.isDragging = true;
      state.isVerticalMove = false;
      state.startTransform = -state.currentSlide * 100;
      newTrack.style.transition = 'none';
      
      setTimeout(() => { 
        if (state.hasStarted) {
          state.hasStarted = false;
        }
      }, 100);
    }

    function handleTouchMove(e) {
      const state = carouselState;
      
      if (!state.isDragging) {
        console.log(`⚠️ TouchMove sin dragging activo en carrusel ${state.carouselIndex}`);
        return;
      }
      
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const deltaX = currentX - state.startX;
      const deltaY = currentY - state.startY;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      
      if (absX < 6 && absY < 6) return;
      
      if (!state.isVerticalMove && (absX > 12 || absY > 12)) {
        
        if (absY > absX && absY > 18) {
          console.log(`📱 Scroll vertical en carrusel ${state.carouselIndex}`);
          state.isVerticalMove = true;
          state.isDragging = false;
          newTrack.style.transition = 'transform 0.4s ease';
          updateCarousel();
          return;
        }
        
        if (absX > absY && absX > 18) {
          console.log(`🔄 Carrusel horizontal ${state.carouselIndex}`);
          state.isVerticalMove = false;
          lockScrollSmooth();
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      if (state.isVerticalMove) return;
      
      if (!state.isVerticalMove && absX > absY && absX > 15) {
        e.preventDefault();
        e.stopPropagation();
        
        const percentage = (deltaX / newTrack.offsetWidth) * 100;
        let newTransform = state.startTransform + percentage;
        
        const minTransform = -(state.totalSlides - 1) * 100;
        const maxTransform = 0;
        
        if (state.currentSlide === 0 && deltaX > 0) {
          newTransform = Math.min(maxTransform, percentage * 0.25);
        } else if (state.currentSlide === state.totalSlides - 1 && deltaX < 0) {
          newTransform = Math.max(minTransform, minTransform + (percentage * 0.25));
        } else {
          newTransform = Math.max(minTransform, Math.min(maxTransform, newTransform));
        }
        
        newTrack.style.transform = `translateX(${newTransform}%)`;
      }
    }

    function handleTouchEnd(e) {
      const state = carouselState;
      
      console.log(`🔹 TouchEnd carrusel ${state.carouselIndex} - Estado: dragging=${state.isDragging}, vertical=${state.isVerticalMove}`);
      
      if (!state.isDragging || state.isVerticalMove) {
        state.isDragging = false;
        state.isVerticalMove = false;
        state.hasStarted = false;
        return;
      }
      
      state.isDragging = false;
      newTrack.style.transition = 'transform 0.4s ease';
      
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const deltaX = endX - state.startX;
      const absX = Math.abs(deltaX);
      
      if (absX > 12) {
        const threshold = newTrack.offsetWidth * 0.28;
        
        if (absX > threshold) {
          if (deltaX > 0 && state.currentSlide > 0) {
            prevSlide();
          } else if (deltaX < 0 && state.currentSlide < state.totalSlides - 1) {
            nextSlide();
          } else {
            updateCarousel();
          }
        } else {
          updateCarousel();
        }
        
        scheduleScrollUnlockSmooth(350);
      } else {
        scheduleScrollUnlockSmooth(50);
      }
      
      setTimeout(() => {
        state.isDragging = false;
        state.isVerticalMove = false;
        state.hasStarted = false;
        console.log(`🧹 Estados limpiados para carrusel ${state.carouselIndex}`);
      }, 250);
    }

    // Touch events con cleanup automático
    newTrack.addEventListener('touchstart', handleTouchStart, { 
      passive: true,
      capture: false 
    });
    newTrack.addEventListener('touchmove', handleTouchMove, { 
      passive: false,
      capture: false 
    });
    newTrack.addEventListener('touchend', handleTouchEnd, { 
      passive: true,
      capture: false 
    });

    // Mouse events con referencias actualizadas
    newTrack.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Click en slides para lightbox con nuevas referencias
    newSlides.forEach((slide, index) => {
      slide.addEventListener('click', (e) => {
        const state = carouselState;
        if (!state.isDragging && window.innerWidth > 768) {
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
    
    console.log(`🎯 Carrusel ${carouselIndex} completamente inicializado`);
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

// ===== EVENT LISTENERS GLOBALES CON MÚLTIPLES VERIFICACIONES =====
function initializePortfolio() {
  // Verificar que todo esté listo
  if (document.readyState === 'loading') {
    // DOM aún cargando, esperar
    document.addEventListener('DOMContentLoaded', initializePortfolio);
    return;
  }
  
  // Verificar que los elementos existan
  const carousels = document.querySelectorAll('.project-carousel');
  if (carousels.length === 0) {
    // Los carruseles no están listos, reintentar
    setTimeout(initializePortfolio, 100);
    return;
  }
  
  // Inicializar todo
  initializeCarousels();
  soundSelectChannel(0);
  
  console.log('Portfolio inicializado correctamente');
  console.log('Diseño: Federico Pignatta | Desarrollo: IA como copiloto');
}

// Múltiples puntos de entrada para asegurar inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePortfolio);
} else {
  // DOM ya está listo
  initializePortfolio();
}

// Backup por si acaso
window.addEventListener('load', () => {
  // Verificar si ya se inicializó
  const carousels = document.querySelectorAll('.project-carousel');
  const firstCarousel = carousels[0];
  
  if (firstCarousel && !firstCarousel.hasAttribute('data-initialized')) {
    console.log('🔄 Reinicializando carruseles...');
    initializePortfolio();
  }
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

// Reset de emergencia cada 30 segundos para GitHub Pages
setInterval(() => {
  let foundProblems = false;
  activeCarousels.forEach((state, carousel) => {
    if (state.isDragging || state.hasStarted) {
      foundProblems = true;
      console.log(`🚨 Estado inconsistente detectado en carrusel ${state.carouselIndex}`);
    }
  });
  
  if (foundProblems) {
    resetAllCarouselStates();
  }
}, 30000);

// Limpiar al cambiar de página o cerrar
window.addEventListener('beforeunload', () => {
  if (scrollLockTimeout) {
    clearTimeout(scrollLockTimeout);
  }
  resetAllCarouselStates();
  unlockScrollSmooth();
});

// Limpiar si hay cambio de orientación
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resetAllCarouselStates();
    if (scrollLocked) {
      unlockScrollSmooth();
    }
  }, 100);
});

// Reset manual para debugging
window.resetCarousels = resetAllCarouselStates;

console.log('Script cargado - Radio Imaginaria v1.9 - Ultra-robusto para GitHub Pages');
console.log('Canales disponibles:', channels.length);
console.log('Canales configurados:', channels.map(ch => ch.name));
console.log('💡 Usa resetCarousels() en consola si hay problemas');
console.log('Web diseñada por Pignatta - Codificada con IA como copiloto');