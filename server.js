const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { MongoClient, ServerApiVersion } = require('mongodb'); // NOVO: Driver MongoDB

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuração do MongoDB ---
// A Vercel (ou seu .env local) DEVE fornecer esta variável
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("ERRO: A variável de ambiente MONGODB_URI não está definida.");
    process.exit(1); // Encerra o servidor se não houver DB
}

const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db; // Variável global para o banco de dados

// --- Middlewares ---
app.use(cors()); 
app.use(express.json()); 

// --- Rotas da API ---
// Todas as rotas agora são 'async' para esperar o DB

// 1. [GET] Criar uma nova lista
app.get('/api/list/new', async (req, res) => {
    try {
        const newListId = crypto.randomUUID();
        const newList = {
            _id: newListId, // Usamos nosso próprio ID
            items: [],
            createdAt: new Date()
        };
        await db.collection('lists').insertOne(newList);
        
        console.log(`Nova lista criada: ${newListId}`);
        res.json({ listId: newListId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao criar nova lista.' });
    }
});

// 2. [GET] Obter todos os itens de uma lista
app.get('/api/list/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const list = await db.collection('lists').findOne({ _id: id });
        
        if (list) {
            res.json(list.items || []); // Retorna apenas o array de itens
        } else {
            res.status(404).json({ error: 'Lista não encontrada.' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao buscar lista.' });
    }
});

// 2b. [POST] Sincronizar/Substituir a lista inteira (usado pelo Importar)
app.post('/api/list/:id/sync', async (req, res) => {
    try {
        const { id } = req.params;
        const listData = req.body;

        if (!Array.isArray(listData)) {
            return res.status(400).json({ error: 'O corpo da requisição deve ser um array (lista).' });
        }
        
        const sanitizedList = listData.map(item => ({
            itemId: item.itemId || crypto.randomUUID(),
            name: item.name || 'Nome Inválido',
            quantity: item.quantity || 1,
            observation: item.observation || '',
            paid: item.paid || false,
            price: item.price || 0
        }));
        
        // Substitui o array 'items' inteiro no documento
        const result = await db.collection('lists').updateOne(
            { _id: id },
            { $set: { items: sanitizedList } }
        );

        if (result.matchedCount === 0) {
             return res.status(404).json({ error: 'Lista não encontrada. Não é possível sincronizar.' });
        }
        
        console.log(`Lista ${id} foi sincronizada/substituída via importação.`);
        res.json(sanitizedList); 
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao sincronizar a lista.' });
    }
});

// 3. [POST] Adicionar um item a uma lista
app.post('/api/list/:id/item', async (req, res) => {
    try {
        const { id } = req.params;
        
        const newItem = {
            itemId: crypto.randomUUID(), 
            name: req.body.name || 'Item sem nome',
            quantity: req.body.quantity || 1,
            observation: req.body.observation || '',
            paid: false,
            price: 0
        };
        
        // Adiciona o novo item ao array 'items'
        const result = await db.collection('lists').updateOne(
            { _id: id },
            { $push: { items: newItem } }
        );

        if (result.matchedCount === 0) {
             return res.status(404).json({ error: 'Lista não encontrada.' });
        }

        const list = await db.collection('lists').findOne({ _id: id });
        console.log(`Item adicionado à lista ${id}: ${newItem.name}`);
        res.status(201).json(list.items); // Retorna a lista de itens atualizada
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao adicionar item.' });
    }
});

// 4. [PUT] Atualizar um item (para editar ou pagar)
app.put('/api/list/:id/item/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        
        // Pega os dados do body (apenas o que foi enviado)
        const updates = req.body;
        
        // Cria um objeto $set para atualizar apenas os campos enviados
        const fieldsToUpdate = {};
        for (const key in updates) {
            fieldsToUpdate[`items.$.${key}`] = updates[key];
        }

        const result = await db.collection('lists').updateOne(
            { _id: id, "items.itemId": itemId },
            { $set: fieldsToUpdate }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Item ou Lista não encontrado.' });
        }
        
        const list = await db.collection('lists').findOne({ _id: id });
        console.log(`Item atualizado na lista ${id}`);
        res.json(list.items); 
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao atualizar item.' });
    }
});

// 5. [DELETE] Excluir um item
app.delete('/api/list/:id/item/:itemId', async (req, res) => {
    try {
        const { id, itemId } = req.params;
        
        const result = await db.collection('lists').updateOne(
            { _id: id },
            { $pull: { items: { itemId: itemId } } }
        );

        if (result.matchedCount === 0) {
             return res.status(404).json({ error: 'Lista não encontrada.' });
        }
        if (result.modifiedCount === 0) {
             return res.status(404).json({ error: 'Item não encontrado na lista.' });
        }
        
        const list = await db.collection('lists').findOne({ _id: id });
        console.log(`Item removido da lista ${id}`);
        res.json(list.items); 
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao remover item.' });
    }
});

// 6. [DELETE] Deletar a lista inteira (Resetar)
app.delete('/api/list/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.collection('lists').deleteOne({ _id: id });

        if (result.deletedCount === 0) {
             return res.status(404).json({ error: 'Lista não encontrada.' });
        }
        
        console.log(`Lista deletada: ${id}`);
        res.json({ success: true, message: 'Lista deletada com sucesso.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Falha ao deletar lista.' });
    }
});


// --- Servir o App Estático (o front-end) ---
app.use(express.static(path.join(__dirname))); 
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Iniciar o Servidor ---
// Conecta ao MongoDB ANTES de iniciar o servidor
console.log("Conectando ao MongoDB...");
client.connect().then(() => {
    console.log("Conectado com sucesso ao MongoDB!");
    db = client.db(); // Define o banco de dados global
    
    app.listen(PORT, () => {
        console.log(`\n🎉 Servidor da Lista de Compras (com MongoDB) rodando na porta ${PORT}! 🎉`);
    });
}).catch(err => {
    console.error("Falha ao conectar ao MongoDB", err);
    process.exit(1);
});