const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startupCode = `
  // Auto-connect WhatsApp if it was previously connected
  if (currentDB.whatsappConnected) {
    console.log('[Startup] Auto-connecting to default WhatsApp channel...');
    connectToWhatsApp('channel-default').catch(err => console.error(err));
  }
  if (currentDB.channels && Array.isArray(currentDB.channels)) {
    for (const ch of currentDB.channels) {
      if (ch.connected && ch.id !== 'channel-default') {
        console.log('[Startup] Auto-connecting to WhatsApp channel ' + ch.id + '...');
        connectToWhatsApp(ch.id).catch(err => console.error(err));
      }
    }
  }

  // Client Static Serving
`;

code = code.replace('// Client Static Serving', startupCode);
fs.writeFileSync('server.ts', code);
