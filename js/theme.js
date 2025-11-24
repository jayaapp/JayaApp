document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme on load
    let isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        // notify other modules about current theme
        try { document.dispatchEvent(new Event('themeChanged')); } catch (e) { /* silent */ }
    }

    // Theme toggle functionality
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        let isDarkTheme = document.body.classList.contains('dark-theme');
        localStorage.setItem('darkTheme', isDarkTheme);
        // notify listeners (e.g., background renderer)
        try { document.dispatchEvent(new Event('themeChanged')); } catch (e) { /* silent */ }
    });
});