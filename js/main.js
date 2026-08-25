const year = document.getElementById("year");
if (year) {
    year.textContent = new Date().getFullYear();
}

const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const allowedThemes = ["light", "dark", "black"];

function setTheme(theme) {
    const nextTheme = allowedThemes.includes(theme) ? theme : "light";
    document.documentElement.dataset.theme = nextTheme;
    themeButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.themeChoice === nextTheme));
    });

    try {
        localStorage.setItem("portfolio-theme", nextTheme);
    } catch {
        // The selected theme still applies for the current page.
    }
}

themeButtons.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
});

setTheme(document.documentElement.dataset.theme);

const readingProgressBar = document.getElementById("reading-progress-bar");
if (readingProgressBar) {
    const updateReadingProgress = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
        readingProgressBar.style.transform = `scaleX(${progress})`;
    };
    updateReadingProgress();
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress);
}

const canvas = document.getElementById("ops-canvas");

if (canvas) {
    const context = canvas.getContext("2d");
    const controls = [...document.querySelectorAll(".ops-mode")];
    const modeLabel = document.querySelector(".ops-canvas-mode");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const palette = {
        sre: {
            background: "#0b2014",
            dark: "#153b25",
            mid: "#2d7043",
            bright: "#8fd05f",
            signal: "#d4ff8c",
            cool: "#73c8c9"
        },
        devops: {
            background: "#0a1c29",
            dark: "#15394b",
            mid: "#236f7c",
            bright: "#65c6bd",
            signal: "#d8fb8f",
            cool: "#79b7ef"
        }
    };

    let mode = "sre";
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let startTime = performance.now();

    function hash(x, y, seed = 0) {
        const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
        return value - Math.floor(value);
    }

    function resizeCanvas() {
        const bounds = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = Math.max(1, Math.round(bounds.width));
        height = Math.max(1, Math.round(bounds.height));
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw(performance.now());
    }

    function pixelRect(x, y, w, h, color, alpha = 1) {
        context.globalAlpha = alpha;
        context.fillStyle = color;
        context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        context.globalAlpha = 1;
    }

    function drawMosaic(colors, time) {
        const size = Math.max(12, Math.floor(width / 30));
        const columns = Math.ceil(width / size);
        const rows = Math.ceil(height / size);
        const drift = reducedMotion.matches ? 0 : Math.floor(time / 900);

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const noise = hash(column, row, drift);
                if (noise < 0.28) {
                    const color = noise < 0.09 ? colors.mid : colors.dark;
                    pixelRect(column * size, row * size, size + 1, size + 1, color, 0.34 + noise);
                }
            }
        }
    }

    function drawScanLines(colors, time) {
        const offset = reducedMotion.matches ? 0 : (time / 35) % 12;
        for (let y = -12 + offset; y < height; y += 12) {
            pixelRect(0, y, width, 1, colors.signal, 0.09);
        }

        for (let index = 0; index < 38; index += 1) {
            const y = hash(index, 2) * height;
            const x = hash(index, 5, mode === "sre" ? 1 : 2) * width;
            const length = 8 + hash(index, 7) * 64;
            const shimmer = reducedMotion.matches ? 0.35 : 0.16 + Math.sin(time / 240 + index) * 0.12;
            pixelRect(x, y, length, 1, colors.signal, Math.max(0.05, shimmer));
        }
    }

    function drawNode(x, y, label, colors, pulse) {
        context.strokeStyle = colors.bright;
        context.lineWidth = 1;
        context.globalAlpha = 0.72;
        context.strokeRect(Math.round(x - 25), Math.round(y - 14), 50, 28);
        pixelRect(x - 21, y - 9, 6, 6, colors.signal);
        pixelRect(x - 11, y - 8, 28, 2, colors.bright, 0.6);
        pixelRect(x - 11, y - 3, 20, 2, colors.cool, 0.48);
        context.globalAlpha = 1;
        context.fillStyle = colors.signal;
        context.font = "500 8px ui-monospace, monospace";
        context.fillText(label, Math.round(x - 24), Math.round(y + 24));

        if (pulse > 0) {
            context.strokeStyle = colors.signal;
            context.globalAlpha = 0.24 * (1 - pulse);
            context.strokeRect(x - 30 - pulse * 10, y - 19 - pulse * 10, 60 + pulse * 20, 38 + pulse * 20);
            context.globalAlpha = 1;
        }
    }

    function connect(x1, y1, x2, y2, colors, progress) {
        context.strokeStyle = colors.mid;
        context.lineWidth = 2;
        context.setLineDash([3, 5]);
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.setLineDash([]);

        const x = x1 + (x2 - x1) * progress;
        const y = y1 + (y2 - y1) * progress;
        pixelRect(x - 3, y - 3, 6, 6, colors.signal, 0.9);
    }

    function drawSre(colors, time) {
        const pulse = reducedMotion.matches ? 0.2 : (time / 1200) % 1;
        const travel = reducedMotion.matches ? 0.58 : (time / 1800) % 1;
        const centerX = width * 0.5;
        const centerY = height * 0.48;
        const nodes = [
            [width * 0.20, height * 0.25, "EDGE"],
            [width * 0.76, height * 0.23, "API"],
            [width * 0.82, height * 0.68, "DB"],
            [width * 0.22, height * 0.73, "QUEUE"]
        ];

        nodes.forEach(([x, y]) => connect(centerX, centerY, x, y, colors, travel));
        drawNode(centerX, centerY, "SRE CORE", colors, pulse);
        nodes.forEach(([x, y, label], index) => drawNode(x, y, label, colors, (pulse + index * 0.19) % 1));

        context.fillStyle = colors.signal;
        context.font = "600 10px ui-monospace, monospace";
        context.fillText("99.99% UPTIME", 18, 26);
        pixelRect(18, 34, Math.max(80, width * 0.24), 4, colors.dark);
        pixelRect(18, 34, Math.max(78, width * 0.235), 4, colors.signal, 0.82);
    }

    function drawDevops(colors, time) {
        const travel = reducedMotion.matches ? 0.72 : (time / 1500) % 1;
        const y = height * 0.49;
        const stages = [
            [width * 0.13, "CODE"],
            [width * 0.38, "BUILD"],
            [width * 0.63, "TEST"],
            [width * 0.87, "SHIP"]
        ];

        for (let index = 0; index < stages.length - 1; index += 1) {
            connect(stages[index][0] + 27, y, stages[index + 1][0] - 27, y, colors, (travel + index * 0.24) % 1);
        }
        stages.forEach(([x, label], index) => drawNode(x, y, label, colors, (travel + index * 0.2) % 1));

        for (let index = 0; index < 5; index += 1) {
            const x = width * 0.18 + index * Math.min(56, width * 0.12);
            const barHeight = 18 + hash(index, 9) * 54;
            pixelRect(x, height * 0.82 - barHeight, 22, barHeight, index < 4 ? colors.mid : colors.signal, 0.74);
        }

        context.fillStyle = colors.signal;
        context.font = "600 10px ui-monospace, monospace";
        context.fillText("PIPELINE HEALTHY", 18, 26);
        context.fillStyle = colors.cool;
        context.fillText("DEPLOY 04/04", Math.max(18, width - 96), 26);
    }

    function draw(now) {
        const time = now - startTime;
        const colors = palette[mode];
        context.clearRect(0, 0, width, height);
        context.fillStyle = colors.background;
        context.fillRect(0, 0, width, height);
        drawMosaic(colors, time);
        drawScanLines(colors, time);

        if (mode === "sre") {
            drawSre(colors, time);
        } else {
            drawDevops(colors, time);
        }

        if (!reducedMotion.matches) {
            animationFrame = requestAnimationFrame(draw);
        }
    }

    function setMode(nextMode) {
        mode = nextMode;
        startTime = performance.now();
        controls.forEach((control) => {
            const active = control.dataset.mode === mode;
            control.classList.toggle("is-active", active);
            control.setAttribute("aria-pressed", String(active));
        });
        canvas.setAttribute("aria-label", mode === "sre"
            ? "Animated pixel artwork showing an SRE reliability system"
            : "Animated pixel artwork showing a DevOps delivery pipeline");
        if (modeLabel) {
            modeLabel.textContent = mode.toUpperCase();
        }
        cancelAnimationFrame(animationFrame);
        draw(performance.now());
    }

    controls.forEach((control) => {
        const activate = () => setMode(control.dataset.mode);
        control.addEventListener("pointerenter", activate);
        control.addEventListener("focus", activate);
        control.addEventListener("click", activate);
    });

    reducedMotion.addEventListener("change", () => {
        cancelAnimationFrame(animationFrame);
        draw(performance.now());
    });

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement);
    resizeCanvas();
}
