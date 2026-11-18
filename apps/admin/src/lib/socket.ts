import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** 建立商户端实时连接（新单语音/弹窗提醒） */
export function connectRealtime(): Socket | null {
  const token = localStorage.getItem('ts_token');
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io({
    path: '/ws',
    query: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
  });

  socket.on('connect_error', (error) => {
    console.warn('实时连接失败，已降级为轮询', error.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

/** 新订单提示音（WebAudio 合成，无需音频资源） */
export function playNewOrderSound(): void {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const notes = [880, 1174.66];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + index * 0.22 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.22 + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + index * 0.22);
    osc.stop(ctx.currentTime + index * 0.22 + 0.45);
  });
  window.setTimeout(() => ctx.close(), 1200);
}
