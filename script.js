document.addEventListener('DOMContentLoaded', () => {
    
    // --- Variáveis Globais ---
    let shoppingList = [];
    let activeParticleIntervals = [];
    let currentTotal = 0.0;

    // --- Seletores de Elementos Principais ---
    const btnAcessar = document.getElementById('btn-acessar'); 
    const btnReset = document.getElementById('btn-reset');

    // --- Funções Auxiliares ---
    const stopAllParticles = () => {
        activeParticleIntervals.forEach(clearInterval);
        activeParticleIntervals = [];
        document.querySelectorAll('[data-particle-interval-id]').forEach(btn => {
            delete btn.dataset.particleIntervalId; 
        });
    };

    const saveListToStorage = () => {
        try {
            localStorage.setItem('minhaListaDeCompras', JSON.stringify(shoppingList));
        } catch (error) { console.error("Erro ao salvar:", error); alert("Erro ao salvar a lista!"); }
    };

    const loadListFromStorage = () => {
        try {
            const savedList = localStorage.getItem('minhaListaDeCompras');
            shoppingList = savedList ? JSON.parse(savedList) : []; 
             shoppingList = shoppingList.map(item => ({
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
            localStorage.removeItem('minhaListaDeCompras'); 
        }
    };
    
    const recalculateTotal = () => {
        currentTotal = shoppingList.reduce((sum, item) => sum + (item.paid && item.price ? item.price : 0), 0);
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
    
    const addItemToList = (e) => { 
        e.preventDefault();
        const form = e.target;
        const itemNameInput = form.querySelector('#item-name-input');
        const itemQtyInput = form.querySelector('#item-qty-input');
        const itemObsInput = form.querySelector('#item-obs-input');
        const itemName = itemNameInput.value.trim();
        const itemQty = parseInt(itemQtyInput.value, 10);
        const itemObs = itemObsInput.value.trim();
        
        let valid = true;
        if (!itemName) { itemNameInput.style.borderColor = 'red'; valid = false; } else { itemNameInput.style.borderColor = ''; }
        if (isNaN(itemQty) || itemQty < 1) { itemQtyInput.style.borderColor = 'red'; valid = false; } else { itemQtyInput.style.borderColor = ''; }
        if (!valid) return;

        shoppingList.push({ name: itemName, quantity: itemQty, observation: itemObs, paid: false, price: 0 });
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

        // --- INÍCIO DOS NOVOS CONTROLES ---
        const controlsContainer = createElement('div', 'list-controls');
        
        // Barra de Pesquisa
        const searchBar = createElement('div', 'search-bar');
        const searchInput = createElement('input', '', { type: 'text', id: 'search-input', placeholder: 'Pesquisar na lista...' });
        searchBar.appendChild(searchInput);

        // Filtros
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
        `;
        filterGroup.append(valorFilter, sortFilter);
        controlsContainer.append(searchBar, filterGroup);
        // --- FIM DOS NOVOS CONTROLES ---

        const listContent = createElement('ul', 'shopping-list');
        const totalDiv = createElement('div', 'shopping-list-total');
        totalDiv.innerHTML = `Total: <span>R$ ${currentTotal.toFixed(2)}</span>`;
        
        const footer = createElement('div', 'modal-footer');
        const closeButton = createElement('button', 'modal-close-footer-btn', { type: 'button' }, ['Fechar']);
        footer.appendChild(closeButton);

        
        // --- INÍCIO DA LÓGICA DE FILTRAGEM DINÂMICA ---
        
        // Esta função interna irá redesenhar a lista com base nos filtros
        const updateListView = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const valor = valorFilter.value;
            const sort = sortFilter.value;

            let filteredList = [...shoppingList];

            // 1. Filtrar por Pesquisa
            if (searchTerm) {
                filteredList = filteredList.filter(item => 
                    item.name.toLowerCase().includes(searchTerm) || 
                    item.observation.toLowerCase().includes(searchTerm)
                );
            }

            // 2. Filtrar por Valor (Pago/Pendente)
            if (valor === 'com-valor') {
                filteredList = filteredList.filter(item => item.paid);
            } else if (valor === 'sem-valor') {
                filteredList = filteredList.filter(item => !item.paid);
            }

            // 3. Ordenar
            if (sort === 'alfa') {
                filteredList.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sort === 'preco-desc') {
                filteredList.sort((a, b) => (b.price || 0) - (a.price || 0));
            }

            // 4. Limpar e Renderizar a lista
            listContent.innerHTML = ''; // Limpa a lista antiga

            if (filteredList.length === 0) {
                 listContent.appendChild(createElement('p', 'empty-list-msg', {}, ['Nenhum item encontrado.']));
            } else {
                filteredList.forEach((item) => {
                    const indexInOriginalList = shoppingList.indexOf(item); // Pega o índice original
                    
                    const isPaid = item.paid ?? false; 
                    const price = item.price ?? 0;   
                    const quantity = item.quantity || 1; 
                    const observation = item.observation || ''; 
                    const name = item.name || 'Item Inválido';

                    const li = createElement('li', `shopping-list-item ${isPaid ? 'paid' : ''}`);
                    const itemInfo = createElement('div', 'item-info');
                    itemInfo.innerHTML = `<span class="item-name">${name} <span class="item-qty">(x${quantity})</span></span> ${observation ? `<span class="item-obs">${observation}</span>` : ''}`;
                    
                    const itemActions = createElement('div', 'item-actions');
                    
                    const payButton = createElement('button', 'btn-pagar-item', { 'data-index': indexInOriginalList, title: 'Pagar', disabled: isPaid });
                    payButton.innerHTML = isPaid ? `R$&nbsp;${price.toFixed(2)}` : `<span>R$</span>`; 
                    payButton.addEventListener('click', (e) => {
                        if (e.currentTarget.disabled) return; 
                        createPriceModal(e.currentTarget.dataset.index);
                    });

                    const editButton = createElement('button', 'btn-editar-item', { 'data-index': indexInOriginalList, title: 'Editar' });
                    editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>`;
                    editButton.addEventListener('click', (e) => createEditModal(e.currentTarget.dataset.index));

                    const deleteButton = createElement('button', 'btn-excluir-item', { 'data-index': indexInOriginalList, title: 'Excluir' });
                    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;
                    deleteButton.addEventListener('click', (e) => deleteItem(e.currentTarget.dataset.index));

                    itemActions.append(payButton, editButton, deleteButton);
                    li.append(itemInfo, itemActions);
                    listContent.appendChild(li);
                });
            }
        };
        // --- FIM DA LÓGICA DE FILTRAGEM ---

        // Adiciona os "ouvintes" para os filtros
        searchInput.addEventListener('input', updateListView);
        valorFilter.addEventListener('change', updateListView);
        sortFilter.addEventListener('change', updateListView);

        // Monta o modal
        modalContent.append(btnAddInternal, title, controlsContainer, listContent, totalDiv, footer);
        modalContainer.append(modalBackdrop, modalContent);
        document.body.appendChild(modalContainer);

        modalBackdrop.addEventListener('click', () => closeAndDestroyModal());
        closeButton.addEventListener('click', () => closeAndDestroyModal());

        // Chama a função pela primeira vez para renderizar a lista
        updateListView();
    };


    const createEditModal = (index) => { 
        const itemIndex = parseInt(index, 10);
        const item = shoppingList[itemIndex];
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
        form.addEventListener('submit', (e) => saveEdit(e, itemIndex));
        cancelButton.addEventListener('click', () => closeAndDestroyModal('.edit-modal'));

        document.getElementById('edit-item-name').focus();
    };

    const saveEdit = (e, index) => { 
        e.preventDefault();
        const itemIndex = parseInt(index, 10);
        const item = shoppingList[itemIndex];
        if (!item) return;

        const newNameInput = document.getElementById('edit-item-name');
        const newQtyInput = document.getElementById('edit-item-qty');
        const newObsInput = document.getElementById('edit-item-obs');

        const newName = newNameInput.value.trim();
        const newQty = parseInt(newQtyInput.value, 10);
        const newObs = newObsInput.value.trim();

        let valid = true;
        if (!newName) { newNameInput.style.borderColor = 'red'; valid = false; } else { newNameInput.style.borderColor = ''; }
        if (isNaN(newQty) || newQty < 1) { newQtyInput.style.borderColor = 'red'; valid = false; } else { newQtyInput.style.borderColor = ''; }
        if (!valid) return;

        item.name = newName; item.quantity = newQty; item.observation = newObs;
        if (item.paid) { item.paid = false; item.price = 0; } 

        saveListToStorage();
        closeAndDestroyModal('.edit-modal');
        closeAndDestroyModal('.modal-container'); 
        createMainListModal(); 
    };

    const deleteItem = (index) => { 
        const itemIndex = parseInt(index, 10);
        const item = shoppingList[itemIndex];
        if (!item) return;
        if (window.confirm(`Excluir "${item.name}"?`)) {
            shoppingList.splice(itemIndex, 1);
            saveListToStorage();
            recalculateTotal(); 
            closeAndDestroyModal('.modal-container'); 
            createMainListModal(); 
        }
    };

    const createPriceModal = (index) => { 
        const itemIndex = parseInt(index, 10);
        const item = shoppingList[itemIndex];
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
        form.addEventListener('submit', (e) => confirmPrice(e, itemIndex));
        cancelButton.addEventListener('click', () => closeAndDestroyModal('.price-modal'));
    };
    
    const confirmPrice = (e, index) => { 
        e.preventDefault();
        const itemIndex = parseInt(index, 10);
        const item = shoppingList[itemIndex];
        if (!item) return;

        const priceInput = document.getElementById('item-price-input');
        const price = parseFloat(priceInput.value);
        const typeRadio = document.querySelector('input[name="price-type"]:checked');
        const type = typeRadio ? typeRadio.value : 'unit';

        if (isNaN(price) || price < 0) { priceInput.style.borderColor = 'red'; return; } 
        else { priceInput.style.borderColor = ''; }

        item.price = (type === 'unit') ? (price * item.quantity) : price;
        item.paid = true;
        
        saveListToStorage();
        
        closeAndDestroyModal('.price-modal');
        closeAndDestroyModal('.modal-container'); 
        createMainListModal(); 
    };

    const resetData = () => { 
         if (window.confirm("Apagar TODA a lista?")) {
            localStorage.removeItem('minhaListaDeCompras');
            location.reload(); 
        }
    };

    // --- Inicialização e Event Listeners Principais ---
    btnAcessar.addEventListener('click', () => { stopAllParticles(); createMainListModal(); });
    btnReset.addEventListener('click', resetData);
    loadListFromStorage(); 

    // --- Lógica das Partículas (Otimizada) ---
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

    // --- Animações de Saída do Modal ---
    const styleSheet = document.createElement("style"); 
    styleSheet.innerText = ` .modal-closing .modal-backdrop { animation: fadeOut 0.25s ease-out forwards; } .modal-closing .modal-content { animation: slideOut 0.25s ease-out forwards; } @keyframes fadeOut { to { opacity: 0; } } @keyframes slideOut { to { transform: translateY(-20px) scale(0.98); opacity: 0; } } `;
    document.head.appendChild(styleSheet);

}); // Fim