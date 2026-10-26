/* ═══════════════════════════════════════════════════════════════
   ÁUREA JURÍDICA ABOGADOS · app.js
   Dependencias (CDN, ver index.html): Three.js, GSAP + ScrollTrigger, Lenis.
   Cada módulo corre aislado con safe(): si uno falla, el resto sigue y
   el contenido nunca queda oculto (clase .no-anim como respaldo).
═══════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    const WA_NUMBER = '524432152843';
    const root = document.documentElement;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = !!(window.gsap && window.ScrollTrigger);
    const isMobile = () => innerWidth < 900;

    const safe = (name, fn) => {
        try { return fn(); } catch (err) { console.warn('[aurea] módulo "' + name + '" falló:', err); return null; }
    };

    /* Respaldo: si algo impide terminar el arranque, mostrar todo el contenido. */
    setTimeout(() => { if (!window.__aureaReady) root.classList.add('no-anim'); }, 9000);

    /* ─────────────────────────────────────────────
       WHATSAPP: cada CTA abre un mensaje con contexto
    ───────────────────────────────────────────── */
    const waLink = (msg) => 'https://wa.me/' + WA_NUMBER + (msg ? '?text=' + encodeURIComponent(msg) : '');
    const initWaLinks = () => $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });

    /* ─────────────────────────────────────────────
       SEPARADOR DE PALABRAS (máscara para revelar titulares)
    ───────────────────────────────────────────── */
    function splitWords(el) {
        el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
        const walk = (node, cls) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((tok) => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        w.className = 'w';
                        w.setAttribute('aria-hidden', 'true');
                        const i = document.createElement('span');
                        i.className = 'wi' + (cls ? ' ' + cls : '');
                        i.textContent = tok;
                        w.appendChild(i);
                        frag.appendChild(w);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1 && child.tagName !== 'BR') {
                    walk(child, child.classList.contains('g') ? 'gold' : cls);
                }
            });
        };
        walk(el, '');
        return $$('.wi', el);
    }

    /* ─────────────────────────────────────────────
       CARGADOR
    ───────────────────────────────────────────── */
    function waitLoader() {
        const countEl = $('#loader-count');
        const MIN = reduceMotion ? 300 : 2300;
        const t0 = performance.now();
        let ready = false;

        const pageLoaded = new Promise((res) => {
            if (document.readyState === 'complete') res(); else addEventListener('load', res, { once: true });
        });
        const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.all([pageLoaded, fonts]).then(() => { ready = true; });
        setTimeout(() => { ready = true; }, 8000);

        return new Promise((resolve) => {
            const step = () => {
                const t = Math.min((performance.now() - t0) / MIN, 1);
                let pct = 100 * (1 - Math.pow(1 - t, 2.2));
                if (!ready) pct = Math.min(pct, 94);
                if (countEl) countEl.textContent = Math.floor(pct);
                if (pct >= 99.5 && ready) { if (countEl) countEl.textContent = '100'; resolve(); return; }
                requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }

    function exitLoader(onMid) {
        const el = $('#loader');
        if (!el) { onMid && onMid(); return; }
        if (!hasGSAP || reduceMotion) { el.classList.add('is-gone'); onMid && onMid(); return; }
        const tl = gsap.timeline({ onComplete: () => el.remove() });
        tl.to('.loader__core', { opacity: 0, scale: 0.9, duration: 0.55, ease: 'power2.in' })
          .to('.loader__curtain--a', { yPercent: -100, duration: 1.15, ease: 'power4.inOut' }, '>-0.05')
          .to('.loader__curtain--b', { yPercent: 100, duration: 1.15, ease: 'power4.inOut' }, '<')
          .call(() => onMid && onMid(), null, '<0.35');
    }

    /* ─────────────────────────────────────────────
       SCROLL SUAVE (Lenis) + ANCLAS
    ───────────────────────────────────────────── */
    let lenis = null;

    function initSmoothScroll() {
        if (!window.Lenis || reduceMotion) return null;
        lenis = new Lenis({
            duration: 1.3,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });
        if (hasGSAP) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
        return lenis;
    }

    function targetY(el) {
        if (hasGSAP) {
            const st = ScrollTrigger.getAll().find((s) => s.trigger === el && s.vars.pin);
            if (st) return st.start;
        }
        return el.getBoundingClientRect().top + window.scrollY;
    }

    function initAnchors(closeMenu) {
        $$('a[href^="#"]').forEach((a) => {
            a.addEventListener('click', (e) => {
                const id = a.getAttribute('href');
                if (!id || id.length < 2) return;
                const target = $(id);
                if (!target) return;
                e.preventDefault();
                const inMenu = !!a.closest('.menu');
                if (inMenu) closeMenu();
                const go = () => {
                    const y = id === '#inicio' ? 0 : targetY(target);
                    if (lenis) lenis.scrollTo(y, { duration: 1.9, easing: (t) => 1 - Math.pow(1 - t, 4) });
                    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
                };
                inMenu ? setTimeout(go, 420) : go();
            });
        });
    }

    /* ─────────────────────────────────────────────
       MENÚ MÓVIL
    ───────────────────────────────────────────── */
    function initMenu() {
        const menu = $('#menu'), burger = $('#burger'), closeBtn = $('#menu-close');
        if (!menu || !burger) return () => {};
        let open = false;

        const focusables = () => $$('a[href], button:not([disabled])', menu);
        const openMenu = () => {
            if (open) return;
            open = true;
            menu.hidden = false;
            void menu.offsetWidth;
            menu.classList.add('is-open');
            burger.setAttribute('aria-expanded', 'true');
            lenis && lenis.stop();
            root.style.overflow = 'hidden';
            setTimeout(() => closeBtn.focus(), 300);
        };
        const closeMenu = () => {
            if (!open) return;
            open = false;
            menu.classList.remove('is-open');
            burger.setAttribute('aria-expanded', 'false');
            root.style.overflow = '';
            lenis && lenis.start();
            setTimeout(() => { if (!open) menu.hidden = true; }, 900);
        };
        burger.addEventListener('click', openMenu);
        closeBtn.addEventListener('click', () => { closeMenu(); burger.focus(); });
        document.addEventListener('keydown', (e) => {
            if (!open) return;
            if (e.key === 'Escape') { closeMenu(); burger.focus(); }
            if (e.key === 'Tab') {
                const f = focusables();
                const first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        $$('.menu a[data-wa]').forEach((a) => a.addEventListener('click', closeMenu));
        return closeMenu;
    }

    /* ─────────────────────────────────────────────
       HERO 3D (Three.js)
       Emblema "A" extruido en oro, anillos orbitales, satélites
       y un campo de partículas que reacciona al puntero y al scroll.
    ───────────────────────────────────────────── */
    function initHero3D() {
        const canvas = $('#hero-canvas');
        if (!canvas || !window.THREE) { root.classList.add('no-webgl'); return null; }

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        } catch (err) {
            root.classList.add('no-webgl');
            return null;
        }
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 0, 9);

        /* Entorno procedural: cajas de luz cálidas para reflejos metálicos */
        const envCanvas = document.createElement('canvas');
        envCanvas.width = 1024; envCanvas.height = 512;
        const g = envCanvas.getContext('2d');
        const grad = g.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#3a2f18'); grad.addColorStop(0.5, '#1f1809'); grad.addColorStop(1, '#2b2010');
        g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
        [[110, 80, 150, 230, '#fff1c9', 1], [410, 50, 90, 300, '#ffe2a0', 0.95], [690, 100, 210, 120, '#ffffff', 0.9],
         [890, 190, 60, 270, '#ffd27a', 0.8], [240, 390, 320, 40, '#ffb347', 0.5], [560, 20, 140, 36, '#fff6dc', 0.9]]
            .forEach(([x, y, w, h, c, a]) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(x, y, w, h); });
        const envTex = new THREE.CanvasTexture(envCanvas);
        envTex.mapping = THREE.EquirectangularReflectionMapping;
        envTex.colorSpace = THREE.SRGBColorSpace;
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromEquirectangular(envTex).texture;
        envTex.dispose(); pmrem.dispose();

        const key = new THREE.PointLight(0xffe2a0, 90, 22, 2); key.position.set(-4, 3.5, 6);
        const rim = new THREE.PointLight(0xd9b45a, 70, 22, 2); rim.position.set(5, -3, -2);
        scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

        /* Rig que se coloca según el viewport */
        const rig = new THREE.Group();
        scene.add(rig);

        /* ── Emblema ── */
        const emblem = new THREE.Group();
        rig.add(emblem);
        const poly = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
        const part = (pts, depth, z, mat) => {
            const geo = new THREE.ExtrudeGeometry(poly(pts), { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 4, curveSegments: 1 });
            const m = new THREE.Mesh(geo, mat);
            m.position.z = z - depth / 2;
            emblem.add(m);
            return m;
        };
        const goldBright = new THREE.MeshStandardMaterial({ color: 0xe3be63, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 });
        const goldDeep = new THREE.MeshStandardMaterial({ color: 0xc9a04a, metalness: 1, roughness: 0.38, envMapIntensity: 1.9 });
        const goldPale = new THREE.MeshStandardMaterial({ color: 0xf3dc9a, metalness: 1, roughness: 0.18, envMapIntensity: 1.3 });
        part([[-0.22, 1.4], [0.20, 1.4], [-0.80, -1.4], [-1.22, -1.4]], 0.36, 0, goldBright);   // pierna izquierda
        part([[-0.20, 1.4], [0.22, 1.4], [1.22, -1.4], [0.80, -1.4]], 0.34, 0, goldDeep);       // pierna derecha
        part([[-0.55, -0.55], [0.55, -0.55], [0.55, -0.29], [-0.55, -0.29]], 0.2, 0.02, goldPale); // travesaño
        part([[-0.12, -1.4], [0.14, -1.4], [0.14, -0.55], [-0.12, -0.55]], 0.28, 0.02, goldPale);  // asta de la F
        part([[0.14, -1.0], [0.44, -1.0], [0.44, -0.82], [0.14, -0.82]], 0.28, 0.02, goldPale);    // brazo de la F

        /* ── Anillos orbitales y satélites ── */
        const rings = new THREE.Group();
        rig.add(rings);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xd9b45a, transparent: true, opacity: 0.55 });
        const satMat = new THREE.MeshStandardMaterial({ color: 0xf6e3a6, metalness: 1, roughness: 0.15, emissive: 0x6b4d12, emissiveIntensity: 0.6 });
        const makeRing = (radius, tube, tilt, spin, sat) => {
            const pivot = new THREE.Group();
            pivot.rotation.set(tilt[0], tilt[1], tilt[2]);
            pivot.userData.spin = spin;
            pivot.add(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 220), ringMat));
            for (let i = 0; i < sat; i++) {
                const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.075 + i * 0.015, 0), satMat);
                const a = (i / sat) * Math.PI * 2;
                s.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
                s.userData.a = a;
                pivot.add(s);
            }
            rings.add(pivot);
            return pivot;
        };
        const ringA = makeRing(2.35, 0.006, [1.15, 0.2, 0], 0.22, 1);
        const ringB = makeRing(2.8, 0.004, [0.4, 0.9, 0.3], -0.16, 2);

        const dashPts = [];
        for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2; dashPts.push(new THREE.Vector3(Math.cos(a) * 3.25, Math.sin(a) * 3.25, 0)); }
        const dashed = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(dashPts),
            new THREE.LineDashedMaterial({ color: 0xd9b45a, dashSize: 0.1, gapSize: 0.1, transparent: true, opacity: 0.5 })
        );
        dashed.computeLineDistances();
        const ringC = new THREE.Group();
        ringC.rotation.set(1.9, 0.35, 0.1);
        ringC.userData.spin = 0.1;
        ringC.add(dashed);
        rings.add(ringC);

        /* ── Partículas ── */
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = 64;
        const sg = sprite.getContext('2d');
        const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        rg.addColorStop(0, 'rgba(255,244,214,1)'); rg.addColorStop(0.25, 'rgba(246,227,166,.85)'); rg.addColorStop(1, 'rgba(217,180,90,0)');
        sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
        const spriteTex = new THREE.CanvasTexture(sprite);

        const COUNT = isMobile() ? 900 : 2200;
        const pos = new Float32Array(COUNT * 3);
        const col = new Float32Array(COUNT * 3);
        const cA = new THREE.Color(0xf6e3a6), cB = new THREE.Color(0xb08a32), tmp = new THREE.Color();
        for (let i = 0; i < COUNT; i++) {
            const r = 2.6 + Math.pow(Math.random(), 0.8) * 11;
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
            pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.75;
            pos[i * 3 + 2] = r * Math.cos(ph) - 2;
            tmp.copy(cB).lerp(cA, Math.random()).multiplyScalar(0.55 + Math.random() * 0.6);
            col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        }
        const pGeo = new THREE.BufferGeometry();
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const pMat = new THREE.PointsMaterial({ size: 0.095, map: spriteTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
        const points = new THREE.Points(pGeo, pMat);
        scene.add(points);

        /* ── Estado compartido ── */
        const state = { intro: reduceMotion ? 1 : 0, p: 0 };
        const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
        const target = { x: 0, y: 0, s: 1 };

        const layout = () => {
            const w = canvas.clientWidth || innerWidth;
            const h = canvas.clientHeight || innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
            renderer.setPixelRatio(dpr);
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
            const halfW = halfH * camera.aspect;
            if (camera.aspect > 1.05) {
                target.x = halfW * 0.44; target.y = 0.1; target.s = Math.min(1.05, halfH / 3.0);
            } else {
                target.x = 0; target.y = halfH * 0.4; target.s = Math.min(0.72, halfW / 2.9);
            }
            rig.position.set(target.x, target.y, 0);
        };

        /* ── Bucle ── */
        const clock = new THREE.Clock();
        let t = 0, raf = 0, visible = true;
        const ease = (x) => 1 - Math.pow(1 - x, 3);

        const render = () => {
            const dt = Math.min(clock.getDelta(), 0.05);
            t += dt;
            if (!finePointer) { mouse.x = Math.sin(t * 0.35) * 0.5; mouse.y = Math.cos(t * 0.27) * 0.3; }
            mouse.sx += (mouse.x - mouse.sx) * 0.06;
            mouse.sy += (mouse.y - mouse.sy) * 0.06;

            const intro = ease(state.intro);
            const p = state.p;

            emblem.rotation.y = (1 - intro) * Math.PI * 2.6 + Math.sin(t * 0.45) * 0.42 + mouse.sx * 0.38 + p * Math.PI * 1.5;
            emblem.rotation.x = mouse.sy * 0.16 + Math.sin(t * 0.3) * 0.04;
            emblem.position.y = Math.sin(t * 0.9) * 0.1;
            emblem.scale.setScalar(Math.max(0.0001, intro));

            rig.scale.setScalar(target.s * (1 - p * 0.3));
            rig.position.set(target.x, target.y + p * 2.4, 0);

            rings.children.forEach((r, i) => {
                r.rotation.z += dt * r.userData.spin * (1 + p * 4);
                r.children.forEach((c) => { if (c.isMesh && c.userData.a !== undefined) c.rotation.y += dt * 1.4; });
                const k = Math.max(0, Math.min(1, intro * 1.4 - i * 0.15));
                r.scale.setScalar(Math.max(0.0001, k));
            });

            points.rotation.y = t * 0.025 + mouse.sx * 0.12 + p * 0.8;
            points.rotation.x = mouse.sy * -0.08 + p * 0.25;
            pMat.opacity = intro * 0.9;
            pMat.size = 0.095 + Math.sin(t * 0.8) * 0.01;

            key.position.x = -4 + Math.sin(t * 0.6) * 2 + mouse.sx * 2;
            camera.position.z = 9 - p * 2.2;
            camera.position.x = mouse.sx * 0.25;
            camera.position.y = mouse.sy * 0.18;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        };
        const loop = () => { raf = requestAnimationFrame(loop); render(); };
        const start = () => { if (!raf && !reduceMotion) { clock.getDelta(); loop(); } };
        const stop = () => { cancelAnimationFrame(raf); raf = 0; };

        layout();
        new ResizeObserver(() => { layout(); if (reduceMotion) render(); }).observe(canvas);
        window.addEventListener('pointermove', (e) => {
            if (!finePointer) return;
            mouse.x = (e.clientX / innerWidth) * 2 - 1;
            mouse.y = -((e.clientY / innerHeight) * 2 - 1);
        }, { passive: true });
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            visible ? start() : stop();
        }, { threshold: 0 }).observe($('#inicio'));

        if (reduceMotion) { state.intro = 1; render(); } else { start(); }

        return {
            intro() {
                if (reduceMotion || !hasGSAP) { state.intro = 1; return; }
                gsap.to(state, { intro: 1, duration: 2.8, ease: 'power2.out' });
            },
            setProgress(v) { state.p = v; }
        };
    }

    /* ─────────────────────────────────────────────
       RED DE NODOS 2D (sección de contacto)
    ───────────────────────────────────────────── */
    function initNetwork() {
        const c = $('#net');
        if (!c || reduceMotion) return;
        const ctx = c.getContext('2d');
        let w = 0, h = 0, nodes = [], raf = 0, visible = false;
        const mouse = { x: -999, y: -999 };

        const size = () => {
            const r = c.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = r.width; h = r.height;
            c.width = w * dpr; c.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(Math.min(isMobile() ? 34 : 70, (w * h) / 15000));
            nodes = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
                r: Math.random() * 1.5 + 0.7
            }));
        };
        const draw = () => {
            raf = requestAnimationFrame(draw);
            ctx.clearRect(0, 0, w, h);
            for (const n of nodes) {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832);
                ctx.fillStyle = 'rgba(246,227,166,.75)'; ctx.fill();
            }
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < 130) {
                        ctx.strokeStyle = 'rgba(217,180,90,' + ((1 - d / 130) * 0.28).toFixed(3) + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
                if (dm < 170) {
                    ctx.strokeStyle = 'rgba(246,227,166,' + ((1 - dm / 170) * 0.55).toFixed(3) + ')';
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                    a.x += (mouse.x - a.x) * 0.004; a.y += (mouse.y - a.y) * 0.004;
                }
            }
        };
        size();
        new ResizeObserver(size).observe(c);
        c.parentElement.addEventListener('pointermove', (e) => {
            const r = c.getBoundingClientRect();
            mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
        }, { passive: true });
        c.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        new IntersectionObserver(([e]) => {
            visible = e.isIntersecting;
            if (visible && !raf) draw();
            if (!visible) { cancelAnimationFrame(raf); raf = 0; }
        }).observe(c);
    }

    /* ─────────────────────────────────────────────
       FORMULARIO → WHATSAPP
    ───────────────────────────────────────────── */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const status = $('#form-status');
        const btn = $('button[type="submit"]', form);
        const btnLabel = $('span', btn);
        const fields = {
            name: { el: $('#f-name'), err: $('#f-name-err'), msg: 'Escribe tu nombre completo.', ok: (v) => v.trim().length >= 3 },
            topic: { el: $('#f-topic'), err: $('#f-topic-err'), msg: 'Selecciona qué te está pasando.', ok: (v) => !!v }
        };
        const setErr = (f, on) => {
            f.el.setAttribute('aria-invalid', on ? 'true' : 'false');
            f.err.textContent = on ? f.msg : '';
        };
        Object.values(fields).forEach((f) => {
            f.el.addEventListener('input', () => { if (f.ok(f.el.value)) setErr(f, false); });
            f.el.addEventListener('change', () => { if (f.ok(f.el.value)) setErr(f, false); });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let firstBad = null;
            Object.values(fields).forEach((f) => {
                const bad = !f.ok(f.el.value);
                setErr(f, bad);
                if (bad && !firstBad) firstBad = f.el;
            });
            if (firstBad) { firstBad.focus(); status.textContent = ''; return; }

            const name = fields.name.el.value.trim();
            const topic = fields.topic.el.value;
            const phone = $('#f-phone').value.trim();
            const msg = $('#f-msg').value.trim();
            const text = ['Hola, soy ' + name + '.', 'Asunto: ' + topic + '.']
                .concat(msg ? ['Mi caso: ' + msg] : [], phone ? ['Mi teléfono: ' + phone] : [])
                .join('\n');

            btn.disabled = true;
            btnLabel.textContent = 'Abriendo WhatsApp...';
            setTimeout(() => {
                /* sin 'noopener' en las features: con él window.open siempre devuelve null */
                const w = window.open(waLink(text), '_blank');
                if (w) { try { w.opener = null; } catch (e) { /* noop */ } }
                else window.location.href = waLink(text);
                status.textContent = 'Listo. Continúa tu conversación en WhatsApp.';
                form.reset();
                btn.disabled = false;
                btnLabel.textContent = 'Enviar mi caso por WhatsApp';
            }, 800);
        });
    }

    /* ─────────────────────────────────────────────
       PILARES (acordeón de imágenes) + PREGUNTAS
    ───────────────────────────────────────────── */
    function initPillars() {
        const items = $$('.pillar');
        if (!items.length) return;
        const activate = (p) => items.forEach((i) => {
            const on = i === p;
            i.classList.toggle('is-active', on);
            $('.pillar__btn', i).setAttribute('aria-expanded', String(on));
        });
        let intent = 0;
        items.forEach((p) => {
            $('.pillar__btn', p).addEventListener('click', () => activate(p));
            if (finePointer) {
                p.addEventListener('pointerenter', () => {
                    if (innerWidth < 900) return;
                    clearTimeout(intent);
                    intent = setTimeout(() => activate(p), 110);
                });
                p.addEventListener('pointerleave', () => clearTimeout(intent));
            }
        });
    }

    function initFaq() {
        const list = $$('.faq details');
        list.forEach((d) => d.addEventListener('toggle', () => {
            if (d.open) list.forEach((o) => { if (o !== d) o.open = false; });
            if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 120);
        }));
    }

    function initBentoSpotlight() {
        if (!finePointer) return;
        $$('.bento__cell').forEach((cell) => {
            cell.addEventListener('pointermove', (e) => {
                const r = cell.getBoundingClientRect();
                cell.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                cell.style.setProperty('--my', (e.clientY - r.top) + 'px');
            }, { passive: true });
        });
    }

    function initMagnetic() {
        if (!finePointer || !hasGSAP || reduceMotion) return;
        $$('[data-magnetic]').forEach((el) => {
            el.style.transition = 'box-shadow .5s, background-position .7s';
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    /* ─────────────────────────────────────────────
       ESCENAS DE SCROLL (GSAP + ScrollTrigger)
    ───────────────────────────────────────────── */
    function initScenes(hero3d) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        const nav = $('#nav');
        const mm = gsap.matchMedia();

        /* Barra de progreso y navegación inteligente */
        gsap.to('.progress__bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                const y = self.scroll();
                nav.classList.toggle('is-solid', y > 40);
                nav.classList.toggle('is-hidden', y > 500 && self.direction === 1 && !$('#menu.is-open'));
            }
        });

        /* Hero: acople con la escena 3D + salida */
        ScrollTrigger.create({
            trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true,
            onUpdate: (self) => hero3d && hero3d.setProgress(self.progress)
        });
        gsap.to('.hero__copy', { yPercent: -14, opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '#inicio', start: '20% top', end: 'bottom top', scrub: true } });
        $$('[data-parallax]').forEach((el) => {
            gsap.to(el, { y: () => parseFloat(el.dataset.parallax) * innerHeight * 0.8, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });
        });

        /* Titulares por palabra */
        $$('[data-split]').forEach((h) => {
            const words = splitWords(h);
            gsap.set(words, { yPercent: 118, y: 0 });
            gsap.to(words, {
                yPercent: 0, duration: 1.15, ease: 'power4.out', stagger: 0.07,
                scrollTrigger: { trigger: h, start: 'top 86%', once: true }
            });
        });

        /* Bloques que aparecen */
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 90%', once: true,
            onEnter: (batch) => {
                batch.forEach((e) => { e.style.transition = 'none'; });
                gsap.to(batch, {
                    opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, overwrite: true,
                    onComplete: () => batch.forEach((e) => {
                        e.classList.add('is-revealed');
                        gsap.set(e, { clearProps: 'opacity,transform' });
                        e.style.transition = '';
                    })
                });
            }
        });

        /* Marquee único: velocidad ligada al scroll */
        const track = $('#marquee-track');
        if (track) {
            const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 38, repeat: -1 });
            ScrollTrigger.create({
                trigger: '.marquee', start: 'top bottom', end: 'bottom top',
                onUpdate: (self) => {
                    const v = Math.abs(self.getVelocity()) / 260;
                    gsap.to(loop, { timeScale: (self.direction === 1 ? 1 : -1) * (1 + Math.min(v, 7)), duration: 0.4, overwrite: true });
                    gsap.to(loop, { timeScale: self.direction === 1 ? 1 : -1, duration: 1.2, delay: 0.4, overwrite: false });
                }
            });
        }

        /* Situaciones: tres estados fijados con cambio de imagen */
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            const states = $$('.sit__state'), imgs = $$('.sit__img'), tabs = $$('.sit__nav li');
            if (states.length < 3) return;
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: '#situaciones', start: 'top top', end: '+=280%', pin: true, scrub: 0.8, anticipatePin: 1,
                    onUpdate: (self) => {
                        const i = self.progress < 0.333 ? 0 : self.progress < 0.667 ? 1 : 2;
                        tabs.forEach((t, k) => t.classList.toggle('is-on', k === i));
                    }
                }
            });
            tl.fromTo($('img', imgs[0]), { scale: 1.12 }, { scale: 1.02, duration: 2 }, 0);
            [1, 2].forEach((i) => {
                const at = i * 2;
                tl.to(states[i - 1], { autoAlpha: 0, y: -36, duration: 0.6, ease: 'power2.in' }, at - 0.5)
                  .fromTo(states[i], { autoAlpha: 0, y: 44 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at - 0.1)
                  .fromTo(imgs[i], { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power2.inOut' }, at - 0.5)
                  .fromTo($('img', imgs[i]), { scale: 1.25 }, { scale: 1.03, duration: 2 }, at - 0.5);
            });
            tl.to({}, { duration: 0.01 }, 6);
        });
        mm.add('(prefers-reduced-motion: reduce)', () => {
            $('#situaciones') && $('#situaciones').classList.add('is-static');
            $('#despacho') && $('#despacho').classList.add('is-static');
        });

        /* Imagen que se abre a pantalla completa */
        mm.add({ motion: '(prefers-reduced-motion: no-preference)', desk: '(min-width: 768px)' }, (ctx) => {
            if (!ctx.conditions.motion) return;
            const from = ctx.conditions.desk ? 'inset(22% 30% 22% 30% round 28px)' : 'inset(25% 11% 25% 11% round 22px)';
            const tl = gsap.timeline({
                scrollTrigger: { trigger: '#despacho', start: 'top top', end: '+=240%', pin: true, scrub: 0.8, anticipatePin: 1 }
            });
            tl.fromTo('.exp__media', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 2 }, 0)
              .fromTo('.exp__img', { scale: 1.35 }, { scale: 1, ease: 'none', duration: 3 }, 0)
              .fromTo('.exp__word--a', { xPercent: 0 }, { xPercent: -24, ease: 'power1.in', duration: 2 }, 0)
              .fromTo('.exp__word--b', { xPercent: 0 }, { xPercent: 24, ease: 'power1.in', duration: 2 }, 0)
              .fromTo('.exp__front', { opacity: 0, y: 54 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 1 }, 1.7)
              .to({}, { duration: 0.6 }, 3);
        });

        /* Materias: desplazamiento horizontal en escritorio */
        mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
            const trackEl = $('#mat-track');
            if (!trackEl) return;
            const dist = () => Math.max(0, trackEl.scrollWidth - innerWidth);
            const pan = gsap.to(trackEl, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: { trigger: '#materias', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
            });
            gsap.to('.mat__progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#materias', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });
            $$('.mat__panel').forEach((p) => {
                gsap.fromTo($('.mat__letter', p), { xPercent: 28 }, { xPercent: -28, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } });
                gsap.from($('.mat__content', p), { opacity: 0.1, y: 46, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: pan, start: 'left 92%', end: 'left 58%', scrub: true } });
            });
        });
        mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
            $$('.mat__panel').forEach((p) => {
                gsap.from(p, { opacity: 0, y: 60, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
                gsap.fromTo($('.mat__letter', p), { yPercent: 12 }, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
            });
        });

        /* Método: línea que se llena + nodos que se encienden */
        gsap.fromTo('.met__fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#met-steps', start: 'top 62%', end: 'bottom 62%', scrub: true } });
        $$('.met__step').forEach((s) => {
            ScrollTrigger.create({
                trigger: s, start: 'top 64%',
                onEnter: () => s.classList.add('is-on'),
                onLeaveBack: () => s.classList.remove('is-on')
            });
        });

        /* Paralaje suave en imágenes del bento */
        $$('.bento__cell > img').forEach((img) => {
            gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
    }

    /* ─────────────────────────────────────────────
       INTRO DEL HERO
    ───────────────────────────────────────────── */
    function prepareHero() {
        const h1 = $('[data-hero-title]');
        if (!h1) return;
        if (!hasGSAP || reduceMotion) { h1.classList.add('is-split'); return; }
        const words = splitWords(h1);
        gsap.set(words, { yPercent: 118, y: 0 });
        h1.classList.add('is-split');
    }

    function playHeroIntro(hero3d) {
        hero3d && hero3d.intro();
        if (!hasGSAP || reduceMotion) { $$('[data-hero]').forEach((e) => { e.style.opacity = 1; }); return; }
        const words = $$('.hero__title .wi');
        const nav = $('#nav');
        gsap.set(nav, { yPercent: -100, opacity: 0 });
        gsap.timeline({ defaults: { ease: 'power4.out' } })
            .fromTo('.hero .eyebrow', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1 }, 0.1)
            .to(words, { yPercent: 0, duration: 1.5, stagger: 0.1 }, 0.2)
            .fromTo('.hero__lead', { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1 }, 0.85)
            .fromTo('.hero .cta-row', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.1 }, 1.05)
            .to(nav, { yPercent: 0, opacity: 1, duration: 1.2, onComplete: () => gsap.set(nav, { clearProps: 'transform,opacity' }) }, 0.6);
    }

    function initWaFloat() {
        const fab = $('#wa-float');
        if (!fab) return;
        setTimeout(() => fab.classList.add('is-in'), 900);
        setTimeout(() => fab.classList.add('show-tip'), 5200);
        setTimeout(() => fab.classList.remove('show-tip'), 11500);
    }

    /* ─────────────────────────────────────────────
       ARRANQUE
    ───────────────────────────────────────────── */
    async function boot() {
        safe('wa-links', initWaLinks);
        if (!hasGSAP) root.classList.add('no-anim');

        const hero3d = safe('hero3d', initHero3D);
        safe('smooth', initSmoothScroll);
        lenis && lenis.stop();
        const closeMenu = safe('menu', initMenu) || (() => {});
        safe('anchors', () => initAnchors(closeMenu));
        safe('hero-prep', prepareHero);
        safe('form', initForm);
        safe('pillars', initPillars);
        safe('faq', initFaq);
        safe('bento', initBentoSpotlight);
        safe('network', initNetwork);
        if (hasGSAP) safe('scenes', () => initScenes(hero3d));
        safe('magnetic', initMagnetic);

        await waitLoader();
        root.classList.remove('is-loading');
        hasGSAP && ScrollTrigger.refresh();
        lenis && lenis.start();

        exitLoader(() => {
            safe('hero-intro', () => playHeroIntro(hero3d));
            safe('wa-float', initWaFloat);
            window.__aureaReady = true;
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
