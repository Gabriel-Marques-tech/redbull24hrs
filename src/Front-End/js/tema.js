(function () {
    const STORAGE_KEY = 'redbull24h-tema';
    const root = document.documentElement;
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    root.dataset.theme = savedTheme || (prefersDark ? 'dark' : 'light');

    function updateButton(button) {
        const dark = root.dataset.theme === 'dark';
        button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
        button.setAttribute('title', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
        button.setAttribute('aria-pressed', String(dark));
        const icon = button.querySelector('.tema-icone');
        if (dark) {
            icon.textContent = '\u2600';
        } else {
            icon.innerHTML = '<svg class="icone-lua" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"></path></svg>';
        }
        button.querySelector('.tema-texto').textContent = dark ? 'Tema claro' : 'Tema escuro';
    }

    function createThemeButton() {
        if (document.querySelector('.tema-toggle')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tema-toggle';
        button.innerHTML = '<span class="tema-icone" aria-hidden="true"></span><span class="tema-texto"></span>';
        updateButton(button);

        button.addEventListener('click', function () {
            root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem(STORAGE_KEY, root.dataset.theme);
            updateButton(button);
        });

        document.body.appendChild(button);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            createThemeButton();
        });
    } else {
        createThemeButton();
    }
})();
