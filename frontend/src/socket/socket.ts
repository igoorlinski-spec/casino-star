import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socketURL = import.meta.env.VITE_API_URL || '/';
if (socketURL && socketURL.startsWith('http')) {
  socketURL = socketURL.replace(/\/api\/?$/, '');
} else if (window.location.hostname.includes('onrender.com')) {
  // Jeśli jesteśmy na Renderze, łącz się bezpośrednio z backendem w chmurze
  socketURL = 'https://casino-star-backend.onrender.com';
}

const socket = io(socketURL, {
  autoConnect: false,
  auth: (cb) => {
    const token = useAuthStore.getState().token;
    cb({ token });
  },
  transports: ['websocket', 'polling'],
});

export default socket;
