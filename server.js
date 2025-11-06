const express = require('express');
const cors = require('cors'); // Para permitir requisições do navegador
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // Para gerar IDs únicos
const os = require('os');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database');

// --- Middlewares ---
app.use(cors()); // Habilita o CORS para todas as rotas
app.use(express.json()); // Habilita o parsing de JSON no body das requisições

// --- Rotas da API ---

// Função auxiliar para ler o DB de uma lista
const readListDB = (listId) => {
    const filePath = path.join(DB_PATH, `${listId}.json`);
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    }
    return null; // Retorna null se a lista não for encontrada
};

// Função auxiliar para escrever no DB de uma lista
const writeListDB = (listId, data) => {
    const filePath = path.join(DB_PATH, `${listId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

// 1. [GET] Criar uma nova lista
app.get('/api/list/new', (req, res) => {
    try {
        const newListId = crypto.randomUUID();
        writeListDB(newListId, []); // Cria um arquivo .json vazio
        console.log(`Nova lista criada: ${newListId}`);
        res.json({ listId: newListId });
    } catch (e) {
        res.status(500).json({ error: 'Falha ao criar nova lista.' });
    }
});

// 2. [GET] Obter todos os itens de uma lista
app.get('/api/list/:id', (req, res) => {
    const { id } = req.params;
    const list = readListDB(id);
    if (list !== null) {
        res.json(list);
    } else {
        res.status(404).json({ error: 'Lista não encontrada.' });
    }
});

// 3. [POST] Adicionar um item a uma lista
app.post('/api/list/:id/item', (req, res) => {
    const { id } = req.params;
    const list = readListDB(id);
    if (list === null) {
        return res.status(404).json({ error: 'Lista não encontrada.' });
    }
    
    // Pega os dados do front-end e adiciona dados do servidor
    const newItem = {
        itemId: crypto.randomUUID(), // ID único para o item
        name: req.body.name || 'Item sem nome',
        quantity: req.body.quantity || 1,
        observation: req.body.observation || '',
        paid: false,
        price: 0
    };
    
    list.push(newItem);
    writeListDB(id, list);
    console.log(`Item adicionado à lista ${id}: ${newItem.name}`);
    res.status(201).json(list); // Retorna a lista atualizada
});

// (Cole este bloco dentro do seu server.js, junto com as outras rotas da API)

// 2b. [POST] Sincronizar/Substituir a lista inteira (usado pelo Importar)
app.post('/api/list/:id/sync', (req, res) => {
    const { id } = req.params;
    const listData = req.body;

    // Validação básica
    if (!Array.isArray(listData)) {
        return res.status(400).json({ error: 'O corpo da requisição deve ser um array (lista).' });
    }

    // Verifica se o arquivo existe
    const list = readListDB(id);
    if (list === null) {
        return res.status(404).json({ error: 'Lista não encontrada. Não é possível sincronizar.' });
    }

    try {
        // Sanitiza os dados (garante que todos os campos existem)
        const sanitizedList = listData.map(item => ({
            itemId: item.itemId || crypto.randomUUID(), // Gera ID se não existir
            name: item.name || 'Nome Inválido',
            quantity: item.quantity || 1,
            observation: item.observation || '',
            paid: item.paid || false,
            price: item.price || 0
        }));
        
        writeListDB(id, sanitizedList);
        console.log(`Lista ${id} foi sincronizada/substituída via importação.`);
        res.json(sanitizedList); // Retorna a lista nova e sanitizada
    } catch (e) {
        res.status(500).json({ error: 'Falha ao sincronizar a lista.' });
    }
});

// 4. [PUT] Atualizar um item (para editar ou pagar)
app.put('/api/list/:id/item/:itemId', (req, res) => {
    const { id, itemId } = req.params;
    const list = readListDB(id);
    if (list === null) {
        return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    const itemIndex = list.findIndex(item => item.itemId === itemId);
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item não encontrado.' });
    }
    
    // Atualiza o item com os dados recebidos
    const updatedItem = { ...list[itemIndex], ...req.body };
    list[itemIndex] = updatedItem;
    
    writeListDB(id, list);
    console.log(`Item atualizado na lista ${id}: ${updatedItem.name}`);
    res.json(list); // Retorna a lista atualizada
});

// 5. [DELETE] Excluir um item
app.delete('/api/list/:id/item/:itemId', (req, res) => {
    const { id, itemId } = req.params;
    const list = readListDB(id);
    if (list === null) {
        return res.status(404).json({ error: 'Lista não encontrada.' });
    }

    const newList = list.filter(item => item.itemId !== itemId);
    if (list.length === newList.length) {
        return res.status(404).json({ error: 'Item não encontrado.' });
    }
    
    writeListDB(id, newList);
    console.log(`Item removido da lista ${id}`);
    res.json(newList); // Retorna a lista atualizada
});

// 6. [DELETE] Deletar a lista inteira (Resetar)
app.delete('/api/list/:id', (req, res) => {
    const { id } = req.params;
    const filePath = path.join(DB_PATH, `${id}.json`);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Deleta o arquivo
        console.log(`Lista deletada: ${id}`);
        res.json({ success: true, message: 'Lista deletada com sucesso.' });
    } else {
        res.status(404).json({ error: 'Lista não encontrada.' });
    }
});


// --- Servir o App Estático (o front-end) ---
// Garante que a pasta 'database' exista
if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH);
    console.log(`Pasta 'database' criada em ${DB_PATH}`);
}

app.use(express.static(path.join(__dirname))); 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Iniciar o Servidor ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎉 Servidor da Lista de Compras (com API) rodando! 🎉`);
  console.log(`Acesse de qualquer dispositivo na sua rede local (LAN):\n`);
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(devName => {
    interfaces[devName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   ➡️  http://${iface.address}:${PORT}`);
      }
    });
  });
  console.log(`\nOu acesse localmente em:`);
  console.log(`   ➡️  http://localhost:${PORT}`);
  console.log(`\n(Pressione CTRL+C para parar o servidor)`);
});