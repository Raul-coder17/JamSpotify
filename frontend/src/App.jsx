import React, { useState, useEffect, useRef } from 'react';

// Iconos SVG en línea para no tener dependencias externas
const Icons = {
  Spotify: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.472-.747 3.847-.878 7.146-.505 9.82 1.13.295.18.387.563.207.862zm1.226-2.724c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.075-1.182-.413.125-.847-.11-1.07-.488-.22-.38-.11-.847.262-1.07 3.67-1.114 8.243-.573 11.385 1.36.368.226.488.707.262 1.074zm.106-2.833C14.39 8.8 8.448 8.605 5.012 9.648c-.527.16-1.087-.14-1.247-.667-.16-.527.14-1.086.666-1.247 3.948-1.198 10.512-.973 14.588 1.447.475.282.63.896.347 1.37-.282.475-.897.63-1.37.348z" />
    </svg>
  ),
  Play: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  Pause: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  Skip: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  ),
  Prev: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Copy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  ),
  Check: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Device: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  ),
  Share: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Volume: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
  ),
  VolumeMuted: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    </svg>
  ),
  Plus: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  )
};

function App() {
  // Determinar modo (host vs guest) basado en URL query params
  const [appMode, setAppMode] = useState('choose'); // 'choose', 'host', 'guest'
  // roomId se obtiene una vez de la URL y no cambia durante la sesión
  const [roomId] = useState(() => new URLSearchParams(window.location.search).get('roomId'));
  const [urlError] = useState(() => new URLSearchParams(window.location.search).get('error'));
  const [guestName, setGuestName] = useState(localStorage.getItem('jam_guest_name') || '');
  const [showNickModal, setShowNickModal] = useState(false);
  const [nickInput, setNickInput] = useState('');
  const [guestApprovalStatus, setGuestApprovalStatus] = useState('not_requested'); // 'not_requested', 'pending', 'approved', 'rejected'
  const [pendingApprovals, setPendingApprovals] = useState([]); // Solicitudes para el Host

  // Info del servidor
  const [serverInfo, setServerInfo] = useState({ localIp: '', port: 3000, joinUrl: '' });

  // Spotify Auth Estado
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hostToken, setHostToken] = useState(localStorage.getItem('jam_host_token') || '');
  const [guestToken, setGuestToken] = useState(sessionStorage.getItem('jam_guest_token') || '');

  // Playback Estado
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [activeDevice, setActiveDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('queue'); // 'queue', 'history'
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [localVolume, setLocalVolume] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState(50);
  const [webPlayer, setWebPlayer] = useState(null);
  const [webPlayerDeviceId, setWebPlayerDeviceId] = useState(null);
  const [webPlayerState, setWebPlayerState] = useState(null); // 'connecting', 'ready', 'error', null

  // Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [queueStatus, setQueueStatus] = useState({}); // Mapeo de trackId -> status ('success', 'error', 'loading')

  // UI Feedback
  const [copied, setCopied] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);

  // Ref para barra de progreso
  const progressTimerRef = useRef(null);

  // Helper: construye URLs de sala → /api/rooms/:roomId/<path>
  const r = (path) => `/api/rooms/${roomId}${path}`;

  // Auto-detectar modo al iniciar
  useEffect(() => {
    // Sin sala no hay nada que hacer
    if (!roomId) {
      setAppMode('choose');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    // En desarrollo el OAuth callback redirige con el token en #host_token=...
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const tokenFromHash = hash.get('host_token');
    if (tokenFromHash) {
      setHostToken(tokenFromHash);
      localStorage.setItem('jam_host_token', tokenFromHash);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Info de red/sala (para QR y nombre del host)
    fetch(r('/info'))
      .then(res => res.json())
      .then(data => setServerInfo(data))
      .catch(err => console.error('Error cargando info de sala:', err));

    // Estado de autenticación de la sala
    fetch(r('/auth/status'))
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.isAuthenticated);

        if (mode === 'guest') {
          setAppMode('guest');
          const storedName = localStorage.getItem('jam_guest_name');
          if (!storedName) {
            setShowNickModal(true);
          } else {
            fetch(r('/guest/join'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: storedName })
            })
              .then(res => res.json())
              .then(data => {
                setGuestApprovalStatus(data.status);
                if (data.guestToken) {
                  setGuestToken(data.guestToken);
                  sessionStorage.setItem('jam_guest_token', data.guestToken);
                }
              })
              .catch(() => {
                setGuestApprovalStatus('not_requested');
                setShowNickModal(true);
              });
          }
        } else if (data.isAuthenticated) {
          setAppMode('host');
        } else {
          setAppMode('choose');
        }
      })
      .catch(() => setAppMode('choose'));
  }, [roomId]);

  // Polling para verificar aprobación de invitados (Móvil/Invitado)
  useEffect(() => {
    if (appMode !== 'guest' || !guestName) return;

    const checkApproval = () => {
      fetch(r(`/guest/status?name=${encodeURIComponent(guestName)}`))
        .then(res => res.json())
        .then(data => setGuestApprovalStatus(data.status))
        .catch(err => console.error('Error verificando aprobación:', err));
    };

    checkApproval();
    const interval = setInterval(checkApproval, 1000);
    return () => clearInterval(interval);
  }, [appMode, guestName]);

  // Polling para obtener las solicitudes pendientes (Solo Host)
  useEffect(() => {
    if (appMode !== 'host' || !isAuthenticated) return;

    const fetchPending = () => {
      fetch(r('/guest/pending'))
        .then(res => res.json())
        .then(data => setPendingApprovals(data || []))
        .catch(err => console.error('Error al obtener solicitudes pendientes:', err));
    };

    fetchPending();
    const interval = setInterval(fetchPending, 1000);
    return () => clearInterval(interval);
  }, [appMode, isAuthenticated]);

  // Polling de reproducción y cola (cada 2.5 segundos)
  useEffect(() => {
    if (appMode === 'choose') return;

    // Si estamos en modo host pero no está autenticado, no hacer polling
    if (appMode === 'host' && !isAuthenticated) return;

    // Si es invitado pero aún no está aprobado, no consultar la cola/reproductor
    if (appMode === 'guest' && guestApprovalStatus !== 'approved') return;

    const fetchPlayback = () => {
      // Incluir el nombre del invitado en las consultas de polling para actualizar su actividad en el backend
      const url = appMode === 'guest' && guestName
        ? r(`/playback?guestName=${encodeURIComponent(guestName)}`)
        : r('/playback');

      fetch(url)
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            setIsAuthenticated(false);
            setAppMode('choose');
            throw new Error('No autorizado');
          }
          return res.json();
        })
        .then(data => {
          setCurrentlyPlaying(data.currentlyPlaying);
          setActiveDevice(data.activeDevice);
          setQueue(data.queue || []);
          setHistory(data.history || []);
          setConnectedUsers(data.users || []);
          setErrorAlert(null);
        })
        .catch(err => {
          console.warn('Error fetching playback:', err);
        });
    };

    fetchPlayback(); // Primera ejecución inmediata
    const interval = setInterval(fetchPlayback, 1000);

    return () => clearInterval(interval);
  }, [appMode, isAuthenticated, guestApprovalStatus]);

  // Sincronizar volumen local con el volumen reportado por Spotify
  useEffect(() => {
    if (activeDevice && activeDevice.volume_percent !== undefined) {
      setLocalVolume(activeDevice.volume_percent);
      if (activeDevice.volume_percent > 0) {
        setIsMuted(false);
      }
    }
  }, [activeDevice]);

  // Cargar dispositivos disponibles en modo Host
  useEffect(() => {
    if (appMode === 'host' && isAuthenticated) {
      const fetchDevices = () => {
        fetch(r('/playback/devices'))
          .then(res => res.json())
          .then(data => setDevices(data))
          .catch(err => console.error('Error fetching devices:', err));
      };

      fetchDevices();
      const interval = setInterval(fetchDevices, 7000);
      return () => clearInterval(interval);
    }
  }, [appMode, isAuthenticated]);

  // Cronómetro local para simular avance de la barra de progreso entre encuestas
  useEffect(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    if (currentlyPlaying && currentlyPlaying.isPlaying) {
      progressTimerRef.current = setInterval(() => {
        setCurrentlyPlaying(prev => {
          if (!prev) return null;
          if (prev.progressMs >= prev.durationMs) return prev;
          return {
            ...prev,
            progressMs: Math.min(prev.progressMs + 1000, prev.durationMs)
          };
        });
      }, 1000);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentlyPlaying?.isPlaying, currentlyPlaying?.id]);

  // Spotify Web Playback SDK para reproducir directamente en el navegador (PC)
  useEffect(() => {
    if (appMode !== 'host' || !isAuthenticated) return;

    let playerInstance = null;

    const initPlayer = () => {
      if (window.Spotify) {
        const player = new window.Spotify.Player({
          name: 'JamSpotify Web Player',
          getOAuthToken: cb => {
            fetch(r('/auth/token'), {
              headers: hostToken ? { 'X-Host-Token': hostToken } : {}
            })
              .then(res => res.json())
              .then(data => cb(data.accessToken))
              .catch(err => console.error('Error al obtener token para Web Player:', err));
          },
          volume: 0.5
        });

        player.addListener('ready', ({ device_id }) => {
          console.log('[Web Player] Dispositivo listo con ID:', device_id);
          setWebPlayerDeviceId(device_id);
          setWebPlayerState('ready');
        });

        player.addListener('not_ready', ({ device_id }) => {
          console.log('[Web Player] Dispositivo desconectado:', device_id);
          setWebPlayerState(null);
        });

        player.addListener('initialization_error', ({ message }) => {
          console.error('[Web Player] Error de inicialización:', message);
          setWebPlayerState('error');
        });

        player.addListener('authentication_error', ({ message }) => {
          console.error('[Web Player] Error de autenticación:', message);
          setWebPlayerState('error');
        });

        player.addListener('account_error', ({ message }) => {
          console.error('[Web Player] Tu cuenta de Spotify debe ser Premium:', message);
          setWebPlayerState('error');
        });

        player.connect().then(success => {
          if (success) {
            console.log('[Web Player] Conectado exitosamente al SDK de Spotify');
            setWebPlayerState('connecting');
          }
        });

        playerInstance = player;
        setWebPlayer(player);
      }
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;

      const existingScript = document.getElementById('spotify-player-sdk');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'spotify-player-sdk';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      if (playerInstance) {
        playerInstance.disconnect();
      }
    };
  }, [appMode, isAuthenticated]);

  // Búsqueda con retardo (Debounce)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(() => {
      fetch(r(`/search?q=${encodeURIComponent(searchQuery)}`))
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
          setIsSearching(false);
        })
        .catch(err => {
          console.error('Error buscando:', err);
          setIsSearching(false);
        });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Helper formateo de tiempo (ms -> mm:ss)
  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Controles de Reproducción
  const togglePlay = () => {
    if (!currentlyPlaying) return;
    const endpoint = currentlyPlaying.isPlaying ? r('/playback/pause') : r('/playback/play');
    fetch(endpoint, {
      method: 'PUT',
      headers: hostToken ? { 'X-Host-Token': hostToken } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentlyPlaying(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null);
        }
      });
  };

  const skipNext = () => {
    fetch(r('/playback/next'), {
      method: 'POST',
      headers: hostToken ? { 'X-Host-Token': hostToken } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Limpiar localmente para esperar la siguiente canción en la consulta
          setCurrentlyPlaying(null);
        }
      });
  };

  const skipPrevious = () => {
    fetch(r('/playback/previous'), {
      method: 'POST',
      headers: hostToken ? { 'X-Host-Token': hostToken } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentlyPlaying(null);
        }
      });
  };

  const seekRelative = (seconds) => {
    fetch(r('/playback/seek'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ relativeMs: seconds * 1000 })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentlyPlaying(prev => prev ? { ...prev, progressMs: data.positionMs } : null);
        }
      });
  };

  const seekAbsolute = (e) => {
    if (!currentlyPlaying) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    const targetMs = clickPercent * currentlyPlaying.durationMs;

    fetch(r('/playback/seek'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ positionMs: targetMs })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentlyPlaying(prev => prev ? { ...prev, progressMs: data.positionMs } : null);
        }
      });
  };

  const formatPlayedAt = (playedAt) => {
    const diffSecs = Math.floor((Date.now() - playedAt) / 1000);
    if (diffSecs < 60) return 'Ahora';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `Hace ${diffHours} h`;
  };

  const refreshDevices = () => {
    fetch(r('/playback/devices'))
      .then(res => res.json())
      .then(data => setDevices(data))
      .catch(err => console.error('Error cargando dispositivos:', err));
  };

  const removeFromQueue = (itemId) => {
    const url = r(`/queue/${itemId}${guestName ? `?guestName=${encodeURIComponent(guestName)}` : ''}`);
    fetch(url, {
      method: 'DELETE',
      headers: {
        ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
        ...(guestToken ? { 'X-Guest-Token': guestToken } : {})
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success || data.queue) {
          setQueue(data.queue || []);
        }
      })
      .catch(err => console.error('Error al eliminar de la cola:', err));
  };

  // Drag and Drop handlers para reordenar cola colaborativa (Host únicamente)
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, overIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === overIndex) return;

    const updatedQueue = [...queue];
    const draggedItem = updatedQueue[draggedIndex];

    // Quitar de la posición previa e insertar en la nueva
    updatedQueue.splice(draggedIndex, 1);
    updatedQueue.splice(overIndex, 0, draggedItem);

    setDraggedIndex(overIndex);
    setQueue(updatedQueue);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    fetch(r('/queue/reorder'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ newQueue: queue })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success || data.queue) {
          setQueue(data.queue || []);
        }
      })
      .catch(err => console.error('Error al reordenar cola en backend:', err));
  };

  const changeVolume = (newVol) => {
    setLocalVolume(newVol);
    fetch(r('/playback/volume'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ volumePercent: newVol })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success && data.error) {
          console.warn('Error al ajustar volumen en Spotify:', data.error);
        }
      })
      .catch(err => console.error('Error al enviar volumen:', err));
  };

  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value, 10);
    changeVolume(newVol);
    if (newVol > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const currentVolume = localVolume !== null ? localVolume : (activeDevice?.volume_percent ?? 50);
    if (isMuted) {
      changeVolume(preMuteVolume);
      setIsMuted(false);
    } else {
      setPreMuteVolume(currentVolume);
      changeVolume(0);
      setIsMuted(true);
    }
  };

  const transferDevice = (deviceId) => {
    fetch(r('/playback/transfer'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ deviceId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShowDeviceSelector(false);
          // Recargar dispositivos de inmediato
          fetch(r('/playback/devices'))
            .then(res => res.json())
            .then(data => setDevices(data));
        }
      });
  };

  // Copiar link al portapapeles
  const copyLink = () => {
    const link = serverInfo.joinUrl || `${window.location.origin}?roomId=${roomId}&mode=guest`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Agregar canción a la cola
  const addToQueue = (track) => {
    // Si no es el host y no hay apodo, solicitarlo
    if (appMode !== 'host' && !guestName) {
      setShowNickModal(true);
      return;
    }

    const trackIdKey = track.id || track.uri;
    setQueueStatus(prev => ({ ...prev, [trackIdKey]: 'loading' }));

    fetch(r('/queue'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
        ...(guestToken && appMode === 'guest' ? { 'X-Guest-Token': guestToken } : {})
      },
      body: JSON.stringify({
        uri: track.uri,
        name: track.name,
        artists: track.artists,
        albumArt: track.albumArt,
        addedBy: appMode === 'host' ? 'Anfitrión' : guestName
      })
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          setQueueStatus(prev => ({ ...prev, [trackIdKey]: 'success' }));
          setQueue(data.queue || []);
          setTimeout(() => {
            setQueueStatus(prev => {
              const next = { ...prev };
              delete next[trackIdKey];
              return next;
            });
          }, 1500);
        } else {
          setQueueStatus(prev => ({ ...prev, [trackIdKey]: 'error' }));
          setErrorAlert(data.error || 'Ocurrió un error al agregar la canción.');
          setTimeout(() => {
            setQueueStatus(prev => {
              const next = { ...prev };
              delete next[trackIdKey];
              return next;
            });
          }, 4000);
        }
      })
      .catch(err => {
        setQueueStatus(prev => ({ ...prev, [trackIdKey]: 'error' }));
        console.error('Error agregando a la cola:', err);
        setTimeout(() => {
          setQueueStatus(prev => {
            const next = { ...prev };
            delete next[trackIdKey];
            return next;
          });
        }, 4000);
      });
  };

  // Reproducir de inmediato (Solo Host)
  const playTrackImmediately = (track) => {
    fetch(r('/playback/play'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ uris: [track.uri] })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success && data.error) {
          setErrorAlert(data.error);
        }
      })
      .catch(err => console.error('Error al reproducir de inmediato:', err));
  };

  // Guardar Nickname y solicitar aprobación al Host
  const handleSaveNick = (e) => {
    e.preventDefault();
    const cleanedName = nickInput.trim();
    if (!cleanedName) return;

    fetch(r('/guest/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cleanedName })
    })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem('jam_guest_name', cleanedName);
        setGuestName(cleanedName);
        setGuestApprovalStatus(data.status);
        if (data.guestToken) {
          setGuestToken(data.guestToken);
          sessionStorage.setItem('jam_guest_token', data.guestToken);
        }
        setShowNickModal(false);
      })
      .catch(err => {
        console.error('Error al registrar invitado:', err);
        setErrorAlert('Error de red al intentar unirse.');
      });
  };

  // Aprobar o rechazar invitados (Solo Host)
  const handleApproveGuest = (name, action) => {
    fetch(r('/guest/approve'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      },
      body: JSON.stringify({ name, action })
    })
      .then(res => res.json())
      .then(data => {
        setPendingApprovals(prev => prev.filter(req => req.name !== name));
      })
      .catch(err => console.error('Error al responder a solicitud:', err));
  };

  // Cerrar Sesión Spotify
  const handleLogout = () => {
    fetch(r('/auth/logout'), { method: 'POST' })
      .then(() => {
        localStorage.removeItem('jam_host_token');
        window.location.href = '/';
      });
  };

  // Restablecer Jam y borrar datos del servidor
  const handleResetJam = () => {
    if (!window.confirm('¿Estás seguro de que deseas restablecer por completo la sala? Se borrarán la cola de reproducción, el historial de canciones, la lista de invitados y se cerrará la sesión de Spotify.')) {
      return;
    }

    fetch(r('/admin/reset'), {
      method: 'POST',
      headers: {
        ...(hostToken ? { 'X-Host-Token': hostToken } : {})
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.removeItem('jam_host_token');
          alert('Sala restablecida con éxito. Redirigiendo a la pantalla de inicio.');
          window.location.href = '/';
        } else {
          alert('No se pudo restablecer la sala: ' + (data.error || 'error desconocido'));
        }
      })
      .catch(err => {
        console.error('Error al restablecer sala:', err);
        alert('Error de red al intentar restablecer la sala.');
      });
  };

  // Porcentaje de progreso
  const progressPercent = currentlyPlaying
    ? (currentlyPlaying.progressMs / currentlyPlaying.durationMs) * 100
    : 0;

  // Renderizador: Pantalla de Bienvenida y Elección de Rol
  if (appMode === 'choose') {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
          <div className="logo" style={{ alignSelf: 'center', fontSize: '2.2rem' }}>
            <Icons.Spotify />
            <span>JamSpotify</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Comparte la cola de reproducción de Spotify en tu sala o fiesta. Cualquiera puede agregar canciones escaneando un código QR.
          </p>

          {urlError === 'not_authorized' && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.75rem', padding: '1rem 1.25rem', textAlign: 'left' }}>
              <p style={{ color: '#f87171', fontWeight: 700, marginBottom: '0.4rem' }}>Acceso no permitido</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Tu cuenta de Spotify no está registrada para usar esta aplicación. Contacta al administrador para que te agregue a la lista de acceso.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <a href="/api/auth/login" className="btn-primary" style={{ textDecoration: 'none' }}>
              <Icons.Spotify />
              Iniciar como Anfitrión
            </a>

            {roomId && (
              <button
                onClick={() => {
                  setAppMode('guest');
                  if (!guestName) setShowNickModal(true);
                }}
                className="btn-secondary"
              >
                Unirse como Invitado
              </button>
            )}
            {!roomId && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Para unirte como invitado, escanea el código QR del anfitrión.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Control de Acceso: Pantallas de espera y rechazo para invitados
  if (appMode === 'guest' && guestName) {
    if (guestApprovalStatus === 'pending') {
      return (
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2.5rem 2rem' }}>
            <div className="logo" style={{ alignSelf: 'center', fontSize: '2rem' }}>
              <Icons.Spotify />
              <span>JamSpotify</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignSelf: 'center', gap: '6px', margin: '1rem 0' }}>
              <span className="online-dot" style={{ width: '12px', height: '12px', backgroundColor: 'var(--spotify-green)', animation: 'pulseDot 1.5s infinite' }}></span>
              <span className="online-dot" style={{ width: '12px', height: '12px', backgroundColor: 'var(--spotify-green)', animation: 'pulseDot 1.5s infinite', animationDelay: '0.3s' }}></span>
              <span className="online-dot" style={{ width: '12px', height: '12px', backgroundColor: 'var(--spotify-green)', animation: 'pulseDot 1.5s infinite', animationDelay: '0.6s' }}></span>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Esperando Aprobación</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Hola <strong>{guestName}</strong>, tu solicitud de acceso ha sido enviada al anfitrión. Pídele que te acepte para poder ingresar y encolar canciones.
            </p>

            <button
              onClick={() => {
                localStorage.removeItem('jam_guest_name');
                setGuestName('');
                setGuestApprovalStatus('not_requested');
                setShowNickModal(true);
              }}
              className="btn-secondary"
              style={{ marginTop: '0.5rem' }}
            >
              Cambiar Nombre / Cancelar
            </button>
          </div>
        </div>
      );
    }

    if (guestApprovalStatus === 'rejected') {
      return (
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2.5rem 2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="logo" style={{ alignSelf: 'center', fontSize: '2rem', color: '#ef4444' }}>
              <Icons.Spotify />
              <span>Acceso Denegado</span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              El anfitrión de la sala ha rechazado tu solicitud de acceso para el nombre <strong>{guestName}</strong>.
            </p>

            <button
              onClick={() => {
                localStorage.removeItem('jam_guest_name');
                setGuestName('');
                setGuestApprovalStatus('not_requested');
                setShowNickModal(true);
              }}
              className="btn-primary"
              style={{ background: '#ef4444', color: '#fff', boxShadow: 'none' }}
            >
              Intentar con otro nombre
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo" onClick={() => setAppMode('choose')} style={{ cursor: 'pointer' }}>
          <Icons.Spotify />
          <span>JamSpotify</span>
          {appMode === 'guest' && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>(Sesión de {serverInfo.hostName || 'Anfitrión'})</span>}
        </div>

        {/* Usuarios activos en la sala */}
        {(appMode === 'host' || appMode === 'guest') && connectedUsers.length > 0 && (
          <div className="users-online-indicator" title={`Conectados: ${connectedUsers.join(', ')}`}>
            <span className="online-dot"></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {connectedUsers.length} en línea
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {appMode === 'host' && (
            <>
              <button
                onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                className={`btn-secondary ${activeDevice ? 'active' : ''}`}
                style={{ padding: '0.5rem 0.75rem', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Icons.Device />
                {activeDevice ? activeDevice.name : 'Elegir Dispositivo'}
              </button>

              <button
                onClick={handleResetJam}
                className="btn-secondary"
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#ff4d4d', borderColor: 'rgba(255, 77, 77, 0.2)' }}
              >
                Restablecer Sala
              </button>

              <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                Desconectar
              </button>
            </>
          )}

          {appMode === 'guest' && guestName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="added-by-tag">Invitado: {guestName}</span>
              <button
                onClick={() => {
                  setNickInput(guestName);
                  setShowNickModal(true);
                }}
                className="btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
              >
                Editar
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Alertas */}
      {errorAlert && (
        <div className="alert-card alert-warning">
          <span style={{ fontWeight: 'bold' }}>Nota:</span> {errorAlert}
        </div>
      )}

      {/* Selector de Dispositivos (Solo Host) */}
      {showDeviceSelector && appMode === 'host' && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', animation: 'fadeInUp 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Dispositivos Disponibles</h3>
            <button onClick={refreshDevices} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              Refrescar
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Spotify requiere un reproductor activo.
            {webPlayerState !== 'ready' && (
              <> <strong>Para reproducir en esta PC:</strong> Abre la aplicación de Spotify en tu ordenador, pon una canción y haz clic en "Refrescar" arriba.</>
            )}
          </p>
          <div className="device-select-list">
            {/* Reproductor Web (Navegador Actual) */}
            {webPlayerState === 'ready' && webPlayerDeviceId && (
              <div
                onClick={() => transferDevice(webPlayerDeviceId)}
                className={`device-item ${activeDevice && activeDevice.id === webPlayerDeviceId ? 'active' : ''}`}
                style={{
                  border: '1px solid var(--spotify-green)',
                  background: 'rgba(29, 185, 84, 0.05)',
                  marginBottom: '0.75rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--spotify-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="online-dot" style={{ position: 'relative', width: '6px', height: '6px' }}></span>
                    Este Navegador (PC Actual)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JamSpotify Web Player</div>
                </div>
                <div className="device-status-dot"></div>
              </div>
            )}

            {webPlayerState === 'connecting' && (
              <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Iniciando reproductor en el navegador...
              </div>
            )}

            {devices.filter(d => d.id !== webPlayerDeviceId).length === 0 && webPlayerState !== 'ready' ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se encontraron otros dispositivos activos. Haz clic en Refrescar.
              </div>
            ) : (
              devices
                .filter(device => device.id !== webPlayerDeviceId)
                .map(device => (
                  <div
                    key={device.id}
                    onClick={() => transferDevice(device.id)}
                    className={`device-item ${device.is_active ? 'active' : ''}`}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{device.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{device.type}</div>
                    </div>
                    <div className="device-status-dot"></div>
                  </div>
                ))
            )}
          </div>
          <button onClick={() => setShowDeviceSelector(false)} className="btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }}>
            Cerrar
          </button>
        </div>
      )}

      {/* Dashboard Principal */}
      <main className="dashboard-grid">

        {/* LADO IZQUIERDO: Reproductor y Buscador */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>

          {/* Card Reproductor Actual */}
          <div className="glass-panel player-card">
            {currentlyPlaying ? (
              <>
                {/* Visualizador Flotante */}
                <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {currentlyPlaying.isPlaying ? 'Sonando' : 'Pausado'}
                  </span>
                  <div className={`visualizer-container ${!currentlyPlaying.isPlaying ? 'visualizer-paused' : ''}`}>
                    <div className="visualizer-bar"></div>
                    <div className="visualizer-bar"></div>
                    <div className="visualizer-bar"></div>
                    <div className="visualizer-bar"></div>
                    <div className="visualizer-bar"></div>
                  </div>
                </div>

                {/* Vinilo */}
                <div className="vinyl-container">
                  <div className={`vinyl-disc ${currentlyPlaying.isPlaying ? 'spin-animation' : 'spin-animation spin-paused'}`}>
                    <img
                      src={currentlyPlaying.albumArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150'}
                      alt={currentlyPlaying.name}
                      className="vinyl-cover"
                    />
                    <div className="vinyl-center-hole"></div>
                  </div>
                </div>

                {/* Información de Canción */}
                <h2 style={{ fontSize: '1.6rem', marginBottom: '0.3rem', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentlyPlaying.name}
                </h2>
                <p style={{ color: 'var(--spotify-green)', fontWeight: 500, marginBottom: '1.5rem', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentlyPlaying.artists}
                </p>

                {/* Barra de progreso */}
                <div className="progress-bar-container">
                  <div
                    className={`progress-track ${appMode === 'host' ? 'clickable' : ''}`}
                    onClick={appMode === 'host' ? seekAbsolute : undefined}
                  >
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <div className="progress-time">
                    <span>{formatTime(currentlyPlaying.progressMs)}</span>
                    <span>{formatTime(currentlyPlaying.durationMs)}</span>
                  </div>
                </div>

                {/* Controles del Anfitrión */}
                {appMode === 'host' && (
                  <>
                    <div className="playback-controls">
                      <button onClick={skipPrevious} className="btn-icon" title="Anterior">
                        <Icons.Prev />
                      </button>
                      <button onClick={() => seekRelative(-15)} className="btn-icon btn-seek" title="Retroceder 15s">
                        -15s
                      </button>
                      <button onClick={togglePlay} className="btn-icon play-pause">
                        {currentlyPlaying.isPlaying ? <Icons.Pause /> : <Icons.Play />}
                      </button>
                      <button onClick={() => seekRelative(15)} className="btn-icon btn-seek" title="Avanzar 15s">
                        +15s
                      </button>
                      <button onClick={skipNext} className="btn-icon" title="Siguiente">
                        <Icons.Skip />
                      </button>
                    </div>

                    {/* Control de Volumen (Solo Host) */}
                    <div className="volume-control-container">
                      <button
                        onClick={toggleMute}
                        className="btn-icon"
                        title={isMuted ? 'Quitar Silencio' : 'Silenciar'}
                        style={{ padding: '0.2rem', color: 'var(--text-secondary)' }}
                      >
                        {isMuted || (localVolume !== null ? localVolume : (activeDevice?.volume_percent ?? 50)) === 0 ? (
                          <Icons.VolumeMuted />
                        ) : (
                          <Icons.Volume />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={localVolume !== null ? localVolume : (activeDevice?.volume_percent ?? 50)}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                        title={`Volumen: ${localVolume !== null ? localVolume : (activeDevice?.volume_percent ?? 50)}%`}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '32px', textAlign: 'right' }}>
                        {localVolume !== null ? localVolume : (activeDevice?.volume_percent ?? 50)}%
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div className="vinyl-container">
                  <div className="vinyl-disc">
                    <div className="vinyl-center-hole"></div>
                  </div>
                </div>
                <h3>Sin reproducción activa</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px' }}>
                  El Host debe abrir Spotify en cualquier dispositivo y reproducir música para iniciar la sesión.
                </p>
                {appMode === 'host' && (
                  <button onClick={() => setShowDeviceSelector(true)} className="btn-primary" style={{ marginTop: '0.5rem' }}>
                    <Icons.Device /> Seleccionar Reproductor
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel de Búsqueda (Para invitados y host también) */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Buscar y Proponer Canción
            </h2>

            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Busca por canción, artista..."
                className="input-glow"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon-inside"><Icons.Search /></span>
            </div>

            {isSearching && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                Buscando en Spotify...
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="track-list" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {searchResults.map(track => {
                  const status = queueStatus[track.id];
                  return (
                    <div key={track.id} className="track-item">
                      <img src={track.albumArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=50'} alt={track.name} className="track-art" />
                      <div className="track-info">
                        <div className="track-title">{track.name}</div>
                        <div className="track-artist">{track.artists}</div>
                      </div>

                      <button
                        onClick={() => addToQueue(track)}
                        className="btn-secondary"
                        disabled={status === 'loading'}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          borderColor: status === 'success' ? 'var(--spotify-green)' : 'var(--border-glass)',
                          color: status === 'success' ? 'var(--spotify-green)' : 'var(--text-primary)'
                        }}
                      >
                        {status === 'loading' ? 'Agregando...' :
                          status === 'success' ? <><Icons.Check /> Agregada</> :
                            status === 'error' ? 'Error' : 'Agregar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No se encontraron resultados para "{searchQuery}"
              </div>
            )}
          </div>

        </section>

        {/* LADO DERECHO: Cola compartida e Información de Compartir */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>

          {/* Solicitudes de Acceso (Solo Host) */}
          {appMode === 'host' && pendingApprovals.length > 0 && (
            <div className="glass-panel" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)', animation: 'fadeInUp 0.3s ease' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="online-dot" style={{ backgroundColor: '#a855f7', boxShadow: '0 0 8px #a855f7' }}></span>
                Solicitudes de Acceso ({pendingApprovals.length})
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Nuevos invitados quieren unirse a tu sala de JamSpotify.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingApprovals.map(req => (
                  <div key={req.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.5rem', border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{req.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleApproveGuest(req.name, 'approve')}
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '0.5rem' }}
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleApproveGuest(req.name, 'reject')}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '0.5rem', borderColor: '#ef4444', color: '#ef4444' }}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información de Compartir (Solo Host) */}
          {appMode === 'host' && (
            <div className="glass-panel" style={{ border: '1px solid rgba(29, 185, 84, 0.15)' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--spotify-green)' }}>
                ¡Invita a la gente!
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Cualquiera en tu red Wi-Fi puede escanear el código y agregar canciones a la cola en tiempo real.
              </p>

              <div className="share-section">
                {serverInfo.joinUrl ? (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(serverInfo.joinUrl)}`}
                      alt="Código QR de JamSpotify"
                      className="qr-code-img"
                    />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--spotify-green)', marginBottom: '0.5rem' }}>
                      Escanea para Unirte
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>
                    Cargando información de red...
                  </div>
                )}

                <div className="share-link-copy">
                  <input
                    type="text"
                    readOnly
                    value="Enlace de Invitación (Oculto por seguridad)"
                    className="share-link-input"
                    style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}
                  />
                  <button
                    onClick={copyLink}
                    className="btn-secondary"
                    style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.4rem', fontSize: '0.85rem' }}
                    title="Copiar enlace"
                  >
                    {copied ? <><Icons.Check /> Copiado</> : <><Icons.Copy /> Copiar Enlace</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cola de Reproducción Compartida e Historial (Pestañas) */}
          <div className="glass-panel" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="tabs-container">
              <button
                className={`tab-btn ${sidebarTab === 'queue' ? 'active' : ''}`}
                onClick={() => setSidebarTab('queue')}
              >
                Cola ({queue.length})
              </button>
              <button
                className={`tab-btn ${sidebarTab === 'history' ? 'active' : ''}`}
                onClick={() => setSidebarTab('history')}
              >
                Historial ({history.length})
              </button>
            </div>

            {sidebarTab === 'queue' ? (
              <div className="track-list" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                {queue.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    La cola está vacía. ¡Busca una canción y agrégala!
                  </div>
                ) : (
                  queue.map((item, index) => (
                    <div
                      key={item.id}
                      className={`track-item ${draggedIndex === index ? 'dragging' : ''}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      draggable={appMode === 'host'}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', width: '20px', textAlign: 'center', fontWeight: 600 }}>
                        {index + 1}
                      </span>
                      <img src={item.albumArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=50'} alt={item.name} className="track-art" />
                      <div className="track-info">
                        <div className="track-title">{item.name}</div>
                        <div className="track-artist">{item.artists}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="added-by-tag">{item.addedBy}</span>
                        {(appMode === 'host' || item.addedBy === guestName) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(item.id);
                            }}
                            className="btn-delete-item"
                            title="Eliminar de la cola"
                          >
                            <Icons.Trash />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="track-list" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Aún no se han reproducido canciones en esta sesión.
                  </div>
                ) : (
                  history.map((item, index) => (
                    <div key={item.id} className="track-item" style={{ animationDelay: `${index * 0.05}s` }}>
                      <img src={item.albumArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=50'} alt={item.name} className="track-art" />
                      <div className="track-info">
                        <div className="track-title">{item.name}</div>
                        <div className="track-artist">{item.artists}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                          <span className="added-by-tag">{item.addedBy}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {formatPlayedAt(item.playedAt)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {appMode === 'host' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); playTrackImmediately(item); }}
                              className="btn-icon"
                              style={{ padding: '0.35rem', color: 'var(--spotify-green)', background: 'rgba(29, 185, 84, 0.1)', borderRadius: '50%' }}
                              title="Reproducir ahora"
                            >
                              <Icons.Play style={{ width: '12px', height: '12px' }} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); addToQueue(item); }}
                            className="btn-icon"
                            style={{
                              padding: '0.35rem',
                              color: queueStatus[item.id || item.uri] === 'success' ? '#1db954' : 'var(--text-secondary)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '50%'
                            }}
                            title="Añadir de nuevo a la cola"
                            disabled={queueStatus[item.id || item.uri] === 'loading'}
                          >
                            {queueStatus[item.id || item.uri] === 'success' ? (
                              <Icons.Check style={{ width: '12px', height: '12px' }} />
                            ) : (
                              <Icons.Plus style={{ width: '12px', height: '12px' }} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </section>

      </main>

      {/* Modal para configurar Nickname */}
      {showNickModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.4rem' }}>¿Cómo te llamas?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Ingresa un apodo para que todos en la sala sepan quién encoló cada canción.
            </p>

            <form onSubmit={handleSaveNick} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Ej. Raúl, María, DJ_Fiesta"
                required
                maxLength="20"
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                className="input-glow"
                style={{ paddingLeft: '1.25rem' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                {guestName && (
                  <button type="button" onClick={() => setShowNickModal(false)} className="btn-secondary">
                    Cancelar
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  Empezar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
