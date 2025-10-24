document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('button');

    const createParticleAtEdge = (button) => {
        const particle = document.createElement('span');
        particle.className = 'particle';
        
        const rect = button.getBoundingClientRect();
        const size = Math.random() * 5 + 3; // Tamanho 3px a 8px
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        const edge = Math.floor(Math.random() * 4);
        let startX, startY, translateX, translateY;
        const distance = Math.random() * 30 + 40; // Distância 40px a 70px

        switch (edge) {
            case 0: // Topo
                startX = Math.random() * rect.width;
                startY = 0;
                translateX = (Math.random() - 0.5) * 60; // Espalha
                translateY = -distance; // Move para CIMA
                break;
            case 1: // Direita
                startX = rect.width;
                startY = Math.random() * rect.height;
                translateX = distance; // Move para DIREITA
                translateY = (Math.random() - 0.5) * 60;
                break;
            case 2: // Baixo
                startX = Math.random() * rect.width;
                startY = rect.height;
                translateX = (Math.random() - 0.5) * 60;
                translateY = distance; // Move para BAIXO
                break;
            case 3: // Esquerda
                startX = 0;
                startY = Math.random() * rect.height;
                translateX = -distance; // Move para ESQUERDA
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
        let particleInterval;

        button.addEventListener('mouseenter', () => {
            particleInterval = setInterval(() => {
                createParticleAtEdge(button);
            }, 50); // Cria uma partícula a cada 50ms
        });

        button.addEventListener('mouseleave', () => {
            clearInterval(particleInterval);
        });
    });
});