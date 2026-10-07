import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';

export let globalQR = "";
export let isConnected = false;
export let userPhone = "";
let sock: any = null;
let currentQRGenerationTime = 0;

export async function connectToWhatsApp() {
  if (sock) return;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: require('pino')({ level: 'silent' }),
      browser: ['Xorbit 360 AI', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        globalQR = await QRCode.toDataURL(qr);
        currentQRGenerationTime = Date.now();
        console.log('New WA QR Generated');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        isConnected = false;
        globalQR = "";
        userPhone = "";
        sock = null;

        if (shouldReconnect) {
          connectToWhatsApp();
        } else {
            console.log('WA Logged out');
        }
      } else if (connection === 'open') {
        console.log('Opened connection to WhatsApp');
        isConnected = true;
        globalQR = "";
        userPhone = sock?.user?.id || "Connected User";
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
      console.error('Failed to initialize WA socket', err);
  }
}

export function logoutWhatsApp() {
  if (sock) {
    sock.logout();
    sock = null;
    isConnected = false;
    globalQR = "";
    userPhone = "";
  }
}

export function getStatus() {
    return {
        connected: isConnected,
        qr: globalQR,
        phone: userPhone
    };
}
