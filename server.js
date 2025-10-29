const express = require('express');
const path = require('path');
const os = require('os'); // Módulo para obter informações do sistema, como IPs

const app = express();
const PORT = 3000; // Você pode escolher outra porta se a 3000 estiver ocupada

// --- Servir arquivos estáticos ---
// Isso diz ao Express para servir qualquer arquivo encontrado na pasta atual (.)
app.use(express.static(path.join(__dirname))); 

// Rota principal (opcional, mas bom ter) - serve o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Iniciar o Servidor ---
// '0.0.0.0' faz o servidor escutar em todas as interfaces de rede disponíveis (essencial para LAN)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎉 Servidor da Lista de Compras rodando! 🎉`);
  console.log(`Acesse de qualquer dispositivo na sua rede local (LAN):\n`);

  // Encontra e exibe os endereços IP locais
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(devName => {
    interfaces[devName].forEach(iface => {
      // Pula endereços não-IPv4 e endereços internos (loopback)
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   ➡️  http://${iface.address}:${PORT}`);
      }
    });
  });

  console.log(`\nOu acesse localmente em:`);
  console.log(`   ➡️  http://localhost:${PORT}`);
  console.log(`\n(Pressione CTRL+C para parar o servidor)`);
});