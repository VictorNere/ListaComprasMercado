document.addEventListener('DOMContentLoaded', () => {
    
    let shoppingList = [];
    let activeParticleIntervals = [];

    const btnAdd = document.getElementById('btn-add');
    const modalOverlay = document.querySelector('.modal-overlay');
    const modal = document.querySelector('.modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnConfirmAdd = document.getElementById('btn-confirm-add');
    const itemNameInput = document.getElementById('item-name-input');
    const itemQtyInput = document.getElementById('item-qty-input');

    const openModal = () => {
        activeParticleIntervals.forEach(id => clearInterval(id));
        activeParticleIntervals = [];

        document.querySelectorAll('[data-particle-interval-id]').forEach(btn => {
            delete btn.dataset.particleIntervalId;
        });

        modalOverlay.classList.remove('hidden');
        setTimeout(() => itemNameInput.focus(), 100);
    };

    const closeModal = () => {
        modalOverlay.classList.add('hidden');
    };

    const saveListToStorage = () => {
        localStorage.setItem('minhaListaDeCompras', JSON.stringify(shoppingList));
    };

    const loadListFromStorage = () => {
        const savedList = localStorage.getItem('minhaListaDeCompras');
        if (savedList) {
            shoppingList = JSON.parse(savedList);
        }
    };

    const addItemToList = () => {
        const itemName = itemNameInput.value.trim();
        const itemQty = parseInt(itemQtyInput.value, 10);
        
        if (itemName === '' || isNaN(itemQty) || itemQty < 1) {
            return;
        }

        shoppingList.push({ name: itemName, quantity: itemQty });
        saveListToStorage();
        
        itemNameInput.value = '';
        itemQtyInput.value = '1';
        itemNameInput.focus();
    };

    btnAdd.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    btnConfirmAdd.addEventListener('click', addItemToList);
    
    itemNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addItemToList();
        }
    });
    
    itemQtyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addItemToList();
        }
    });

    loadListFromStorage();

    const buttons = document.querySelectorAll('button');
    const createParticleAtEdge = (button) => {
        const particle = document.createElement('span');
        particle.className = 'particle';
        
        const rect = button.getBoundingClientRect();
        const size = Math.random() * 5 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        const edge = Math.floor(Math.random() * 4);
        let startX, startY, translateX, translateY;
        const distance = Math.random() * 30 + 40;

        switch (edge) {
            case 0:
                startX = Math.random() * rect.width;
                startY = 0;
                translateX = (Math.random() - 0.5) * 60;
                translateY = -distance;
                break;
            case 1:
                startX = rect.width;
                startY = Math.random() * rect.height;
                translateX = distance;
                translateY = (Math.random() - 0.5) * 60;
                break;
            case 2:
                startX = Math.random() * rect.width;
                startY = rect.height;
                translateX = (Math.random() - 0.5) * 60;
                translateY = distance;
                break;
            case 3:
                startX = 0;
                startY = Math.random() * rect.height;
                translateX = -distance;
                translateY = (Math.random() - 0.5) * 60;
                break;
        }

        particle.style.left = `${startX - (size / 2)}px`;
        particle.style.top = `${startY - (size / 2)}px`;

        particle.style.setProperty('--translateX', `${translateX}px`);
        particle.style.setProperty('--translateY', `${translateY}px`);

        button.appendChild(particle);

        particle.addEventListener('animationend', () => {
            particle.remove();
        });
    };

    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            if (button.closest('.modal')) return;
            
            const intervalId = setInterval(() => {
                createParticleAtEdge(button);
            }, 50);
            
            activeParticleIntervals.push(intervalId);
            button.dataset.particleIntervalId = intervalId;
        });

        button.addEventListener('mouseleave', () => {
            if (button.dataset.particleIntervalId) {
                const intervalId = parseInt(button.dataset.particleIntervalId, 10);
                clearInterval(intervalId);
                
                activeParticleIntervals = activeParticleIntervals.filter(id => id !== intervalId);
                delete button.dataset.particleIntervalId;
            }
        });
    });
});