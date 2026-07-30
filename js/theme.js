(function () {
    const allowedThemes = ["light", "dark", "black"];
    let savedTheme = "light";

    try {
        const storedTheme = localStorage.getItem("portfolio-theme");
        if (allowedThemes.includes(storedTheme)) {
            savedTheme = storedTheme;
        }
    } catch {
        // Storage may be unavailable in privacy-focused browser modes.
    }

    document.documentElement.dataset.theme = savedTheme;
})();
