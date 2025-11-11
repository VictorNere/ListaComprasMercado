document.addEventListener('DOMContentLoaded', () => {
    
    // --- Configurações Locais ---
    let shoppingList = [];
    let activeParticleIntervals = [];
    let currentTotal = 0.0;
    const STORAGE_KEY = 'minhaListaDeCompras'; // Chave do localStorage

    // --- Seletores de Elementos Principais ---
    const btnAcessar = document.getElementById('btn-acessar'); 
    const btnReset = document.getElementById('btn-reset');

    // --- Funções Auxiliares (Partículas, Modais, etc.) ---
    const stopAllParticles = () => {
        activeParticleIntervals.forEach(clearInterval);
        activeParticleIntervals = [];
        document.querySelectorAll('[data-particle-interval-id]').forEach(btn => {
            delete btn.dataset.particleIntervalId; 
        });
    };

    const closeAndDestroyModal = (modalSelector = '.modal-container') => {
        const modalContainer = document.querySelector(modalSelector);
        if (modalContainer) {
            modalContainer.classList.add('modal-closing'); 
            modalContainer.addEventListener('animationend', () => {
                if (modalContainer) modalContainer.remove();
            }, { once: true });
            setTimeout(() => { if (modalContainer) modalContainer.remove(); }, 500); 
        }
    };
    
    const createElement = (tag, className = '', attributes = {}, children = []) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'disabled' && !value) return; 
            element.setAttribute(key, value === true ? '' : value);
        });
        children.forEach(child => {
             if (typeof child === 'string') element.appendChild(document.createTextNode(child)); 
             else if (child instanceof Node) element.appendChild(child);
        });
        return element;
    };

    // --- LÓGICA DE DADOS (localStorage) ---

    // 1. Salva a lista no localStorage
    const saveListToStorage = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(shoppingList));
        } catch (error) { 
            console.error("Erro ao salvar:", error); 
            alert("Erro ao salvar a lista!"); 
        }
    };

    // 2. Carrega a lista do localStorage
    const loadListFromStorage = () => {
        try {
            const savedList = localStorage.getItem(STORAGE_KEY);
            shoppingList = savedList ? JSON.parse(savedList) : []; 
            // Sanitiza os dados (garante que todos os campos existam)
            shoppingList = shoppingList.map((item, index) => ({
                 itemId: item.itemId || `item-${Date.now()}-${index}`, // Adiciona um ID se não tiver
                 name: item.name || 'Nome Inválido',
                 quantity: item.quantity || 1,
                 observation: item.observation || '',
                 paid: item.paid || false,
                 price: item.price || 0
             }));
            recalculateTotal();
        } catch (error) { 
            console.error("Erro ao carregar:", error); 
            shoppingList = []; 
            alert("Erro ao carregar a lista salva! A lista foi resetada."); 
            localStorage.removeItem(STORAGE_KEY); 
        }
    };

    // 3. Recalcula o total
    const recalculateTotal = () => {
        currentTotal = shoppingList.reduce((sum, item) => sum + (item.paid && item.price ? item.price : 0), 0);
        const totalDiv = document.querySelector('.shopping-list-total span');
        if (totalDiv) {
            totalDiv.textContent = `R$ ${currentTotal.toFixed(2)}`;
        }
    };
    
    // --- Funções de Criação de Modais ---
    const createAddModal = () => {
        const modalContainer = createElement('div', 'modal-container add-modal', { style: 'z-index: 1010;' });
        const modalBackdrop = createElement('div', 'modal-backdrop', { style: 'z-index: 1011;' });
        const modalContent = createElement('div', 'modal-content', { style: 'max-width: 550px; z-index: 1012;' });
        
        const title = createElement('h2', '', {}, ['Adicionar Novo Item']);
        const form = createElement('form', '', { id: 'add-item-form' });
        form.innerHTML = `
            <div class="form-group"> <label for="item-name-input">Nome</label> <input type="text" id="item-name-input" placeholder="Ex: Arroz"> </div>
            <div class="form-group"> <label for="item-qty-input">Qtde</label> <input type="number" id="item-qty-input" value="1" min="1"> </div>
            <div class="form-group"> <label for="item-obs-input">Obs</label> <input type="text" id="item-obs-input" placeholder="Ex: Fatiado..."> </div>
            <button type="submit" class="modal-add-btn"> 
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" /></svg> 
                <span>Adicionar</span> 
            </button>
        `;
        
        const footer = createElement('div', 'modal-footer');
        const closeButton = createElement('button', 'modal-close-footer-btn', { type: 'button' }, ['Fechar']);
        footer.appendChild(closeButton);

        modalContent.append(title, form, footer);
        modalContainer.append(modalBackdrop, modalContent);
        document.body.appendChild(modalContainer);

        modalBackdrop.addEventListener('click', () => closeAndDestroyModal('.add-modal')); 
        form.addEventListener('submit', addItemToList);
        closeButton.addEventListener('click', () => closeAndDestroyModal('.add-modal'));
    };
    
    // ATUALIZADO: Salva no localStorage
    const addItemToList = (e) => { 
        e.preventDefault();
        const form = e.target;
        const itemNameInput = form.querySelector('#item-name-input');
        const itemQtyInput = form.querySelector('#item-qty-input');
        const itemObsInput = form.querySelector('#item-obs-input');
        
        const newItemData = {
            itemId: `item-${Date.now()}`,
            name: itemNameInput.value.trim(),
            quantity: parseInt(itemQtyInput.value, 10),
            observation: itemObsInput.value.trim(),
            paid: false,
            price: 0
        };
        
        if (!newItemData.name || isNaN(newItemData.quantity) || newItemData.quantity < 1) {
             alert("Por favor, preencha o nome e a quantidade (mínimo 1).");
             return;
        }

        shoppingList.push(newItemData);
        saveListToStorage();
        recalculateTotal();
            
        closeAndDestroyModal('.modal-container'); 
        createMainListModal(); 
        closeAndDestroyModal('.add-modal');
    };

    
    const createMainListModal = () => {
        stopAllParticles();
        recalculateTotal();
        
        const modalContainer = createElement('div', 'modal-container');
        const modalBackdrop = createElement('div', 'modal-backdrop');
        const modalContent = createElement('div', 'modal-content modal-main-list');
        
        const btnAddInternal = createElement('button', 'btn-add-internal', { title: 'Adicionar Item' });
        btnAddInternal.innerHTML = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" /></svg>`;
        btnAddInternal.addEventListener('click', () => {
            createAddModal(); 
        });
        
        const title = createElement('h2', '', {}, ['Lista de Compras']);

        const controlsContainer = createElement('div', 'list-controls');
        
        const searchBar = createElement('div', 'search-bar');
        const searchInput = createElement('input', '', { type: 'text', id: 'search-input', placeholder: 'Pesquisar na lista...' });
        searchBar.appendChild(searchInput);

        const filterGroup = createElement('div', 'filter-group');
        const valorFilter = createElement('select', '', { id: 'filter-valor' });
        valorFilter.innerHTML = `
            <option value="todos">Com/Sem Valor</option>
            <option value="com-valor">Com Valor (Pagos)</option>
            <option value="sem-valor">Sem Valor (Pendentes)</option>
        `;
        const sortFilter = createElement('select', '', { id: 'filter-sort' });
        sortFilter.innerHTML = `
            <option value="default">Ordenar por...</option>
            <option value="alfa">Ordem Alfabética</option>
            <option value="preco-desc">Mais Caro -> Mais Barato</option>
            <option value="preco-asc">Mais Barato -> Mais Caro</option>
        `;
        filterGroup.append(valorFilter, sortFilter);
        controlsContainer.append(searchBar, filterGroup);

        const listContent = createElement('ul', 'shopping-list');
        const totalDiv = createElement('div', 'shopping-list-total');
        totalDiv.innerHTML = `Total: <span>R$ ${currentTotal.toFixed(2)}</span>`;
        
        const footer = createElement('div', 'modal-footer');
        const footerActionsLeft = createElement('div', 'footer-actions-left');
        
        const btnImport = createElement('button', 'modal-close-footer-btn', { title: 'Importar lista de arquivo .json' });
        btnImport.innerHTML = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg> <span>Imp</span>`;
        
        const btnExport = createElement('button', 'modal-close-footer-btn', { title: 'Exportar lista para arquivo .json' });
        btnExport.innerHTML = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> <span>Exp</span>`;

        // REMOVIDO o botão Sinc

        const importInput = createElement('input', 'hidden-file-input', { type: 'file', accept: '.json' });
        
        btnImport.addEventListener('click', () => importInput.click());
        btnExport.addEventListener('click', exportList);
        importInput.addEventListener('change', (e) => importList(e));
        
        footerActionsLeft.append(btnImport, btnExport, importInput); // REMOVIDO btnSync
        
        const closeButton = createElement('button', 'modal-close-footer-btn', { type: 'button' }, ['Fechar']);
        closeButton.addEventListener('click', () => closeAndDestroyModal());

        footer.append(footerActionsLeft, closeButton);
        
        
        const updateListView = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const valor = valorFilter.value;
            const sort = sortFilter.value;

            let filteredList = [...shoppingList];

            if (searchTerm) {
                filteredList = filteredList.filter(item => 
                    item.name.toLowerCase().includes(searchTerm) || 
                    item.observation.toLowerCase().includes(searchTerm)
                );
            }

            if (valor === 'com-valor') {
                filteredList = filteredList.filter(item => item.paid);
            } else if (valor === 'sem-valor') {
                filteredList = filteredList.filter(item => !item.paid);
            }

            if (sort === 'alfa') {
                filteredList.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sort === 'preco-desc') {
                filteredList.sort((a, b) => (b.price || 0) - (a.price || 0));
            } else if (sort === 'preco-asc') {
                filteredList.sort((a, b) => (a.price || 0) - (b.price || 0));
            }

            listContent.innerHTML = ''; 

            if (filteredList.length === 0) {
                 listContent.appendChild(createElement('p', 'empty-list-msg', {}, ['Nenhum item encontrado.']));
            } else {
                filteredList.forEach((item) => {
                    const isPaid = item.paid ?? false; 
                    const price = item.price ?? 0;   
                    const quantity = item.quantity || 1; 
                    const observation = item.observation || ''; 
                    const name = item.name || 'Item Inválido';

                    const li = createElement('li', `shopping-list-item ${isPaid ? 'paid' : ''}`);
                    const itemInfo = createElement('div', 'item-info');
                    itemInfo.innerHTML = `<span class="item-name">${name} <span class="item-qty">(x${quantity})</span></span> ${observation ? `<span class="item-obs">${observation}</span>` : ''}`;
                    
                    const itemActions = createElement('div', 'item-actions');
                    
                    const payButton = createElement('button', 'btn-pagar-item', { 'data-item-id': item.itemId, title: 'Pagar', disabled: isPaid });
                    payButton.innerHTML = isPaid ? `R$&nbsp;${price.toFixed(2)}` : `<span>R$</span>`; 
                    payButton.addEventListener('click', (e) => {
                        if (e.currentTarget.disabled) return; 
                        createPriceModal(e.currentTarget.dataset.itemId); 
                    });

                    const editButton = createElement('button', 'btn-editar-item', { 'data-item-id': item.itemId, title: 'Editar' });
                    editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>`;
                    editButton.addEventListener('click', (e) => createEditModal(e.currentTarget.dataset.itemId)); 

                    const deleteButton = createElement('button', 'btn-excluir-item', { 'data-item-id': item.itemId, title: 'Excluir' });
                    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;
                    deleteButton.addEventListener('click', (e) => deleteItem(e.currentTarget.dataset.itemId)); 

                    itemActions.append(payButton, editButton, deleteButton);
                    li.append(itemInfo, itemActions);
                    listContent.appendChild(li);
                });
            }
        };

        searchInput.addEventListener('input', updateListView);
        valorFilter.addEventListener('change', updateListView);
        sortFilter.addEventListener('change', updateListView);

        modalContent.append(btnAddInternal, title, controlsContainer, listContent, totalDiv, footer);
        modalContainer.append(modalBackdrop, modalContent);
        document.body.appendChild(modalContainer);

        modalBackdrop.addEventListener('click', () => closeAndDestroyModal());
        closeButton.addEventListener('click', () => closeAndDestroyModal());

        updateListView();
    };

    // REMOVIDO: createSyncModal() foi deletado.

    const createEditModal = (itemId) => { 
        const item = shoppingList.find(i => i.itemId === itemId);
        if (!item) return;

        const modalContainer = createElement('div', 'modal-container edit-modal', { style: 'z-index: 1010;' });
        const modalBackdrop = createElement('div', 'modal-backdrop', { style: 'z-index: 1011;' });
        const modalContent = createElement('div', 'modal-content', { style: 'z-index: 1012; max-width: 550px;' });

        const title = createElement('h2', '', {}, ['Editar Item']);
        const form = createElement('form', '', { id: 'edit-item-form' });

        form.innerHTML = `
            <div class="form-group"> <label for="edit-item-name">Nome</label> <input type="text" id="edit-item-name" value="${item.name || ''}"> </div>
            <div class="form-group"> <label for="edit-item-qty">Qtde</label> <input type="number" id="edit-item-qty" value="${item.quantity || 1}" min="1"> </div>
            <div class="form-group"> <label for="edit-item-obs">Obs</label> <input type="text" id="edit-item-obs" value="${item.observation || ''}"> </div>
            <button type="submit" class="modal-save-btn"> 
                 <svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                 <span>Salvar</span> 
            </button>
        `;

        const footer = createElement('div', 'modal-footer');
        const cancelButton = createElement('button', 'modal-close-footer-btn', { type: 'button' }, ['Cancelar']);
        footer.appendChild(cancelButton);

        modalContent.append(title, form, footer);
        modalContainer.append(modalBackdrop, modalContent);
        document.body.appendChild(modalContainer);

        modalBackdrop.addEventListener('click', () => closeAndDestroyModal('.edit-modal'));
        form.addEventListener('submit', (e) => saveEdit(e, itemId));
        cancelButton.addEventListener('click', () => closeAndDestroyModal('.edit-modal'));

        document.getElementById('edit-item-name').focus();
    };

    // ATUALIZADO: Salva no localStorage
    const saveEdit = (e, itemId) => { 
        e.preventDefault();
        const itemIndex = shoppingList.findIndex(i => i.itemId === itemId);
        if (itemIndex === -1) return;
        
        const newNameInput = document.getElementById('edit-item-name');
        const newQtyInput = document.getElementById('edit-item-qty');
        const newObsInput = document.getElementById('edit-item-obs');

        const updatedData = {
            name: newNameInput.value.trim(),
            quantity: parseInt(newQtyInput.value, 10),
            observation: newObsInput.value.trim(),
            paid: false, 
            price: 0
        };

        if (!updatedData.name || isNaN(updatedData.quantity) || updatedData.quantity < 1) {
             alert("Nome e quantidade são obrigatórios.");
             return;
        }
        
        // Atualiza o item no array
        shoppingList[itemIndex] = { ...shoppingList[itemIndex], ...updatedData };
        saveListToStorage();
        recalculateTotal();

        closeAndDestroyModal('.edit-modal');
        closeAndDestroyModal('.modal-container'); 
        createMainListModal(); 
    };

    // ATUALIZADO: Salva no localStorage
    const deleteItem = (itemId) => { 
        const itemIndex = shoppingList.findIndex(i => i.itemId === itemId);
        if (itemIndex === -1) return;
        
        const item = shoppingList[itemIndex];
        if (window.confirm(`Excluir "${item.name}"?`)) {
            shoppingList.splice(itemIndex, 1); // Remove do array
            saveListToStorage();
            recalculateTotal();
            
            closeAndDestroyModal('.modal-container'); 
            createMainListModal(); 
        }
    };

    const createPriceModal = (itemId) => { 
        const item = shoppingList.find(i => i.itemId === itemId);
        if (!item || item.paid) return; 

        const modalContainer = createElement('div', 'modal-container price-modal', { style: 'z-index: 1010;' });
        const modalBackdrop = createElement('div', 'modal-backdrop', { style: 'z-index: 1011;' });
        const modalContent = createElement('div', 'modal-content', { style: 'z-index: 1012; max-width: 500px;' });

        const form = createElement('form', '', { id: 'price-form' });
        form.innerHTML = `
            <h3>Preço</h3> <p>${item.name} (x${item.quantity})</p>
            <div class="price-options-group"> <label class="radio-label"> <input type="radio" name="price-type" value="unit" checked> Unid </label> <label class="radio-label"> <input type="radio" name="price-type" value="total"> Total </label> </div>
            <div class="form-group"> <label for="item-price-input">Valor (R$)</label> <input type="number" id="item-price-input" step="0.01" min="0" placeholder="0.00"> </div>
            <button type="submit" class="modal-add-btn">Confirmar</button>
        `;

        const footer = createElement('div', 'modal-footer');
        const cancelButton = createElement('button', 'modal-close-footer-btn', { type: 'button' }, ['Cancelar']);
        footer.appendChild(cancelButton);

        modalContent.append(form, footer);
        modalContainer.append(modalBackdrop, modalContent);
        document.body.appendChild(modalContainer);
        
        modalBackdrop.addEventListener('click', () => closeAndDestroyModal('.price-modal'));
        form.addEventListener('submit', (e) => confirmPrice(e, itemId));
        cancelButton.addEventListener('click', () => closeAndDestroyModal('.price-modal'));
    };
    
    // ATUALIZADO: Salva no localStorage
    const confirmPrice = (e, itemId) => { 
        e.preventDefault();
        const itemIndex = shoppingList.findIndex(i => i.itemId === itemId);
        if (itemIndex === -1) return;

        const priceInput = document.getElementById('item-price-input');
        const price = parseFloat(priceInput.value);
        const typeRadio = document.querySelector('input[name="price-type"]:checked');
        const type = typeRadio ? typeRadio.value : 'unit';

        if (isNaN(price) || price < 0) { 
            priceInput.style.borderColor = 'red'; 
            return; 
        } 
        
        const finalPrice = (type === 'unit') ? (price * shoppingList[itemIndex].quantity) : price;
        
        shoppingList[itemIndex].price = finalPrice;
        shoppingList[itemIndex].paid = true;
        
        saveListToStorage();
        recalculateTotal();
            
        closeAndDestroyModal('.price-modal');
        closeAndDestroyModal('.modal-container'); 
        createMainListModal(); 
    };

    // ATUALIZADO: Limpa o localStorage
    const resetData = () => { 
         if (window.confirm("Apagar TODA a lista? Esta ação não pode ser desfeita.")) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload(); 
        }
    };

    // Exportar: Já funciona lendo a variável global
    const exportList = () => {
        if (shoppingList.length === 0) {
            alert("Sua lista está vazia. Adicione itens antes de exportar.");
            return;
        }
        const jsonString = JSON.stringify(shoppingList, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = createElement('a', '', { href: url, download: 'lista-de-compras.json' });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ATUALIZADO: Importar salva no localStorage
    const importList = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.includes('json')) {
            alert('Erro: O arquivo selecionado não é .json.');
            event.target.value = null; 
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedList = JSON.parse(e.target.result);
                if (!Array.isArray(importedList)) {
                    throw new Error('O arquivo não contém uma lista (array) válida.');
                }
                if (window.confirm("Isso irá substituir sua lista atual. Deseja continuar?")) {
                    
                    // Sanitiza e salva no localStorage
                    shoppingList = importedList.map((item, index) => ({
                         itemId: item.itemId || `item-${Date.now()}-${index}`,
                         name: item.name || 'Nome Inválido',
                         quantity: item.quantity || 1,
                         observation: item.observation || '',
                         paid: item.paid || false,
                         price: item.price || 0
                     }));
                    
                    saveListToStorage();
                    recalculateTotal();
                    
                    closeAndDestroyModal('.modal-container');
                    createMainListModal();
                }
            } catch (error) {
                console.error("Erro ao importar:", error);
                alert("Erro ao ler o arquivo. Verifique se o JSON é válido.");
            } finally {
                event.target.value = null; 
            }
        };
        reader.readAsText(file);
    };


    // --- Inicialização e Event Listeners Principais ---
    const initializeApp = () => {
        loadListFromStorage(); // Carrega do localStorage ao iniciar
    };
    
    btnAcessar.addEventListener('click', () => { 
        stopAllParticles(); 
        createMainListModal(); 
    });
    btnReset.addEventListener('click', resetData);
    
    initializeApp(); // Inicia o app

    // --- Lógica das Partículas (Sem alterações) ---
    const createParticleAtEdge = (button) => { 
         const particle = document.createElement('span'); particle.className = 'particle';
         const rect = button.getBoundingClientRect(); const size = Math.random() * 4 + 2; 
         particle.style.cssText = `width: ${size}px; height: ${size}px; left: ${rect.width/2}px; top: ${rect.height/2}px;`; 
         const angle = Math.random() * Math.PI * 2; const distance = Math.random() * 40 + 50; 
         const translateX = Math.cos(angle) * distance; const translateY = Math.sin(angle) * distance;
         particle.style.setProperty('--translateX', `${translateX}px`); particle.style.setProperty('--translateY', `${translateY}px`);
         button.appendChild(particle);
         particle.addEventListener('animationend', () => particle.remove(), { once: true });
    };

    document.querySelectorAll('.button-group button, .social-links a, .reset-btn').forEach(el => { 
        let intervalId = null;
        el.addEventListener('mouseenter', () => {
            if (el.closest('.modal-content') || intervalId) return;
            intervalId = setInterval(() => { if(Math.random() < 0.6) createParticleAtEdge(el); }, 70); 
            activeParticleIntervals.push(intervalId);
        });
        el.addEventListener('mouseleave', () => {
            if (intervalId) { clearInterval(intervalId); activeParticleIntervals = activeParticleIntervals.filter(id => id !== intervalId); intervalId = null; }
        });
    });

    const styleSheet = document.createElement("style"); 
    styleSheet.innerText = ` .modal-closing .modal-backdrop { animation: fadeOut 0.25s ease-out forwards; } .modal-closing .modal-content { animation: slideOut 0.25s ease-out forwards; } @keyframes fadeOut { to { opacity: 0; } } @keyframes slideOut { to { transform: translateY(-20px) scale(0.98); opacity: 0; } } `;
    document.head.appendChild(styleSheet);

}); // Fim