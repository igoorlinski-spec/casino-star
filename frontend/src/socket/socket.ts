import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

const socket = io('/', {
  autoConnect: false,
  auth: (cb) => {
    const token = useAuthStore.getState().token;
    cb({ token });
  },
  transports: ['websocket', 'polling'],
});

export default socket;
