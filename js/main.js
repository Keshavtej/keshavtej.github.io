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
    const artwork = document.querySelector(".ops-art");
    const modeLabel = document.querySelector(".ops-canvas-mode");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const palette = {
        sre: {
            background: "#0b2014",
            dark: "#153b25",
            mid: "#2d7043",
            bright: "#8fd05f",
            signal: "#d4ff8c",
            cool: "#73c8c9",
            mosaicAlpha: 1
        },
        devops: {
            background: "#111d17",
            dark: "#21382d",
            mid: "#46685d",
            bright: "#84aca2",
            signal: "#d5e7e2",
            cool: "#6f958b",
            mosaicAlpha: 0.74
        }
    };

    let mode = "sre";
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let startTime = performance.now();
    let artworkVisible = true;
    let pageVisible = !document.hidden;

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
        restartAnimation();
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
                    pixelRect(
                        column * size,
                        row * size,
                        size + 1,
                        size + 1,
                        color,
                        (0.34 + noise) * colors.mosaicAlpha
                    );
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
        const compact = width < 330;
        const longLabel = label.length > 8;
        const nodeWidth = longLabel ? (compact ? 84 : 100) : (compact ? 58 : 70);
        const nodeHeight = longLabel ? (compact ? 40 : 46) : (compact ? 34 : 40);
        const halfWidth = nodeWidth / 2;
        const halfHeight = nodeHeight / 2;
        context.strokeStyle = colors.bright;
        context.lineWidth = 1.5;
        context.globalAlpha = 0.86;
        context.strokeRect(Math.round(x - halfWidth), Math.round(y - halfHeight), nodeWidth, nodeHeight);
        pixelRect(x - halfWidth + 8, y - 9, 10, 10, colors.signal);
        pixelRect(x - halfWidth + 24, y - 9, nodeWidth - 32, 4, colors.bright, 0.7);
        pixelRect(x - halfWidth + 24, y - 1, nodeWidth - 44, 4, colors.cool, 0.58);
        context.globalAlpha = 1;
        context.fillStyle = colors.signal;
        const labelSize = label.length > 10 ? (compact ? 9 : 11) : (compact ? 10 : 12);
        context.font = `700 ${labelSize}px ui-monospace, monospace`;
        context.textAlign = "center";
        context.fillText(label, Math.round(x), Math.round(y + halfHeight + 18));
        context.textAlign = "left";

        if (pulse > 0) {
            context.strokeStyle = colors.signal;
            context.globalAlpha = 0.24 * (1 - pulse);
            context.strokeRect(
                x - halfWidth - 5 - pulse * 10,
                y - halfHeight - 5 - pulse * 10,
                nodeWidth + 10 + pulse * 20,
                nodeHeight + 10 + pulse * 20
            );
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
            [width * 0.20, height * 0.25, "OBSERVABILITY"],
            [width * 0.78, height * 0.23, "RELIABILITY"],
            [width * 0.80, height * 0.68, "INCIDENT MGMT"],
            [width * 0.22, height * 0.73, "AUTOMATION"]
        ];

        nodes.forEach(([x, y]) => connect(centerX, centerY, x, y, colors, travel));
        drawNode(centerX, centerY, "SRE CORE", colors, pulse);
        pixelRect(centerX - 34, centerY - 31, 68, 14, colors.cool, 0.24);
        context.fillStyle = colors.signal;
        context.font = "700 8px ui-monospace, monospace";
        context.textAlign = "center";
        context.fillText("AI ANALYSIS", Math.round(centerX), Math.round(centerY - 21));
        context.textAlign = "left";
        nodes.forEach(([x, y, label], index) => drawNode(x, y, label, colors, (pulse + index * 0.19) % 1));

        context.fillStyle = colors.signal;
        context.font = "700 12px ui-monospace, monospace";
        context.fillText("AI SIGNAL CORRELATION", 18, 26);
        pixelRect(18, 38, Math.max(96, width * 0.28), 5, colors.dark);
        pixelRect(18, 38, Math.max(92, width * 0.27), 5, colors.signal, 0.82);
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

        const assistTop = height * 0.23;
        const assistLeft = width * 0.18;
        const assistWidth = width * 0.64;
        context.strokeStyle = colors.cool;
        context.globalAlpha = 0.52;
        context.strokeRect(assistLeft, assistTop - 12, assistWidth, 24);
        context.globalAlpha = 1;
        context.fillStyle = colors.signal;
        context.font = `${width < 330 ? 7 : 9}px ui-monospace, monospace`;
        context.textAlign = "center";
        context.fillText("AI ASSIST  /  REVIEW · TEST · ANALYZE", width * 0.5, assistTop + 3);
        context.textAlign = "left";

        stages.slice(0, 3).forEach(([x]) => {
            context.strokeStyle = colors.cool;
            context.globalAlpha = 0.20;
            context.setLineDash([2, 4]);
            context.beginPath();
            context.moveTo(x, assistTop + 12);
            context.lineTo(x, y - (width < 330 ? 24 : 30));
            context.stroke();
            context.setLineDash([]);
            context.globalAlpha = 1;
        });

        for (let index = 0; index < stages.length - 1; index += 1) {
            const nodeOffset = width < 330 ? 30 : 36;
            connect(stages[index][0] + nodeOffset, y, stages[index + 1][0] - nodeOffset, y, colors, (travel + index * 0.24) % 1);
        }
        stages.forEach(([x, label], index) => drawNode(x, y, label, colors, (travel + index * 0.2) % 1));

        for (let index = 0; index < 5; index += 1) {
            const x = width * 0.18 + index * Math.min(56, width * 0.12);
            const barHeight = 18 + hash(index, 9) * 54;
            pixelRect(x, height * 0.82 - barHeight, 22, barHeight, index < 4 ? colors.mid : colors.signal, 0.74);
        }

        context.fillStyle = colors.signal;
        context.font = "700 12px ui-monospace, monospace";
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

        if (!reducedMotion.matches && artworkVisible && pageVisible) {
            animationFrame = requestAnimationFrame(draw);
        } else {
            animationFrame = 0;
        }
    }

    function restartAnimation() {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        draw(performance.now());
    }

    function setMode(nextMode) {
        mode = nextMode;
        startTime = performance.now();
        if (artwork) {
            artwork.dataset.activeMode = mode;
        }
        controls.forEach((control) => {
            const active = control.dataset.mode === mode;
            control.classList.toggle("is-active", active);
            control.setAttribute("aria-pressed", String(active));
        });
        canvas.setAttribute("aria-label", mode === "sre"
            ? "Animated pixel artwork showing AI-assisted signal correlation within an SRE platform"
            : "Animated pixel artwork showing AI verification within a DevOps delivery pipeline");
        if (modeLabel) {
            modeLabel.textContent = mode.toUpperCase();
        }
        restartAnimation();
    }

    controls.forEach((control) => {
        const activate = () => setMode(control.dataset.mode);
        control.addEventListener("pointerenter", activate);
        control.addEventListener("focus", activate);
        control.addEventListener("click", activate);
    });

    reducedMotion.addEventListener("change", () => {
        restartAnimation();
    });

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement);

    if ("IntersectionObserver" in window) {
        const visibilityObserver = new IntersectionObserver(([entry]) => {
            artworkVisible = entry.isIntersecting;
            if (artworkVisible) {
                restartAnimation();
            } else {
                cancelAnimationFrame(animationFrame);
                animationFrame = 0;
            }
        }, { threshold: 0.01 });
        visibilityObserver.observe(artwork || canvas);
    }

    document.addEventListener("visibilitychange", () => {
        pageVisible = !document.hidden;
        if (pageVisible) {
            restartAnimation();
        } else {
            cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        }
    });

    if (artwork) {
        artwork.dataset.activeMode = mode;
    }
    resizeCanvas();
}
