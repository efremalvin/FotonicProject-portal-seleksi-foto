const os = require('os');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();
const testFolderId = '1-NAhCpCPE6IgEkzqIJalkx4IzIfjVEHk';

console.log('\n\x1b[33m====================================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m  ▲ FOTONIC WEB SELEKSI FOTO - SERVER DEVELOPMENT\x1b[0m');
console.log('\x1b[33m====================================================================\x1b[0m');
console.log(`  \x1b[32m- Local   :\x1b[0m  http://localhost:3000`);
console.log(`  \x1b[36m- Network :\x1b[0m  http://${localIp}:3000`);
console.log(`  \x1b[35m- Akses HP:\x1b[0m  http://${localIp}:3000/?folder_id=${testFolderId}`);
console.log('\x1b[33m====================================================================\x1b[0m\n');
