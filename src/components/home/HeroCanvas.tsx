"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  targetPixelRatio,
  shouldAntialias,
  POWER_PREFERENCE,
  createFpsGovernor,
  warmGpuProfile,
} from "@/lib/renderQuality";
import { scheduleGlCreate, noteGlRelease } from "@/lib/glScheduler";
import { registerPageReady } from "@/lib/pageReady";

const LIGHT_COLOR      = 0x4419AE;
const BACKGROUND_COLOR = 0x08001A;
const LIGHT_INTENSITY  = 30;
const LIGHT_Z          = 10;
const PLANE_COLOR      = 0x060018;
const SHAPE_COLOR      = 0x0d0030;
const HOVER_SCALE      = 1.12;
const SCROLL_TRAVEL    = 100;

// Dissolvenza del canvas all'ingresso/uscita dalla piega hero: uno stacco
// netto fra la scena 3D e lo sfondo piatto sotto si nota anche quando i
// colori sono vicini, una dissolvenza lo maschera.
const CONTEXT_FADE_MS  = 400;

// Tetto oltre il quale l'hero si dichiara pronto comunque, così lo splash non
// resta appeso su un primo fotogramma che non arriva.
const HERO_READY_FALLBACK_MS = 5000;

// Le velocità del loop sono espresse per fotogramma a 60fps; moltiplicate per
// `step` valgono a qualunque frame rate.
const REFERENCE_FPS = 60;

// Dopo una pausa lunga, meglio perdere avanzamento che far scattare le forme
// di mezzo giro in un fotogramma.
const MAX_DELTA = 1 / 20;

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Canvas del renderer corrente, per poterlo far dissolvere all'uscita dalla
  // piega prima di smontare davvero il contesto — vedi l'effetto di
  // armo/disarmo più sotto.
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  // Il contesto WebGL non nasce al mount ma quando lo concede `glScheduler`:
  // tornando alla home da una pagina progetto questo contesto verrebbe creato
  // nello stesso istante in cui viene liberato quello della pagina che se ne
  // va, ed è quell'accavallamento che fa cadere il driver AMD dei Mac Intel.
  const [armed, setArmed] = useState(false);

  // Lo splash di pagina aspetta questa scena, e solo questa: è l'unica
  // superficie 3D sopra la piega, quindi scoprire prima mostrerebbe un hero
  // vuoto. La registrazione sta al mount e non dentro la scena, perché il turno
  // nella coda GL può arrivare dopo la finestra di grazia del loader — e lì
  // "nessuno registrato" verrebbe letto come "niente da aspettare".
  const markReadyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const { markReady, unregister } = registerPageReady();
    markReadyRef.current = markReady;

    // Se il primo fotogramma non arriva mai — coda ferma, scheda in secondo
    // piano — lo splash non deve restare appeso.
    const fallback = setTimeout(markReady, HERO_READY_FALLBACK_MS);

    return () => {
      clearTimeout(fallback);
      markReadyRef.current = null;
      unregister();
    };
  }, []);

  // Arma/disarma il contesto in base alla piega hero (`#hero-fold` in
  // `page.tsx`), non solo al mount: la home tiene questo canvas E quello
  // della sezione skill vivi insieme se il primo non si smonta mai, ed è
  // proprio il carico sostenuto di due contesti WebGL contemporanei la causa
  // dei GPU Reset osservati sugli iMac dei clienti. Appena la piega esce dallo
  // schermo il contesto va smontato per davvero — non solo in pausa — per
  // liberare anche la memoria video, non solo il ciclo di render.
  //
  // Unico consumatore di questo componente: `HeroAmbientLight` (CSS, non
  // WebGL) ha preso il posto di `HeroCanvas` sulle pagine progetto e skill,
  // dove serviva solo la luce senza forme — quindi `#hero-fold` c'è sempre.
  useEffect(() => {
    const foldEl = document.getElementById("hero-fold");
    if (!foldEl) return;

    // Assesta il cambio di stato: scrollando il bordo attraversa la piega più
    // volte in un fotogramma, e distruggere/ricreare il contesto ad ogni
    // giro sarebbe lo stesso thrash di memoria video che il resize-debounce
    // evita altrove in questo file.
    const SETTLE_MS = 200;
    // Il colore piatto dietro non può inseguire una scena che cambia con
    // mouse e scroll: uno stacco netto si nota comunque, una dissolvenza no.
    // Il contesto resta vivo (e continua a costare) per questi fotogrammi in
    // più — accettabile, è un tetto basso una tantum al cambio di stato, non
    // un carico sostenuto.
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelCreate: (() => void) | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => {
          clearTimeout(fadeTimer);
          if (visible) {
            // Rientro: se stava sfumando fuori la richiamiamo subito, niente
            // dissolvenza al ritorno — era già così prima di questo cambio.
            if (canvasElRef.current) canvasElRef.current.style.opacity = "1";
            warmGpuProfile();
            cancelCreate = scheduleGlCreate(() => setArmed(true));
          } else {
            cancelCreate?.();
            cancelCreate = null;
            const canvas = canvasElRef.current;
            if (canvas) {
              canvas.style.transition = `opacity ${CONTEXT_FADE_MS}ms ease`;
              canvas.style.opacity = "0";
              fadeTimer = setTimeout(() => setArmed(false), CONTEXT_FADE_MS);
            } else {
              setArmed(false);
            }
          }
        }, SETTLE_MS);
      },
      { threshold: 0 }
    );
    observer.observe(foldEl);

    return () => {
      observer.disconnect();
      clearTimeout(fadeTimer);
      clearTimeout(settleTimer);
      cancelCreate?.();
    };
  }, []);

  useEffect(() => {
    if (!armed) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);

    // Dimensioni da window: clientWidth può essere 0 prima del layout.
    const w = () => window.innerWidth || 1;
    const h = () => window.innerHeight || 1;

    const camera = new THREE.PerspectiveCamera(60, w() / h(), 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      antialias: shouldAntialias(w(), h()),
      // Senza, su portatili a GPU ibrida Chrome sceglie l'integrata.
      powerPreference: POWER_PREFERENCE,
    });
    renderer.setPixelRatio(targetPixelRatio(w(), h()));
    // `false`: three non scrive width/height inline sul canvas. La dimensione a
    // schermo la detta il CSS qui sotto, così durante un ridimensionamento il
    // canvas riempie sempre il viewport anche mentre il buffer e' ancora a
    // quello di prima — il compositore lo stira, e non si vede il buco che
    // lascerebbe un canvas rimasto piccolo.
    renderer.setSize(w(), h(), false);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    // Parte trasparente: rientrando nella piega da un disarmo appena
    // avvenuto (rientro rapido, niente coda) eviterebbe altrimenti un
    // fotogramma non ancora disegnato mostrato a piena opacità.
    renderer.domElement.style.opacity = "0";
    mount.appendChild(renderer.domElement);
    canvasElRef.current = renderer.domElement;

    // Luci
    scene.add(new THREE.AmbientLight(0x110033, 1));
    scene.add(new THREE.HemisphereLight(0x1a0050, 0x000010, 0.4));

    // Parte già accesa, altrimenti resta invisibile fino al primo movimento.
    const mouseLight = new THREE.DirectionalLight(LIGHT_COLOR, LIGHT_INTENSITY);
    mouseLight.position.set(0, 0, LIGHT_Z);
    scene.add(mouseLight);
    scene.add(mouseLight.target);

    // Piano di sfondo
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      new THREE.MeshStandardMaterial({ color: PLANE_COLOR, roughness: 0.6, metalness: 0.2 })
    );
    plane.position.z = -4;
    scene.add(plane);

    // Forme geometriche
    const shapeMat = new THREE.MeshStandardMaterial({
      color: SHAPE_COLOR,
      roughness: 0.5,
      metalness: 0.3,
    });

    const shapes: THREE.Mesh[] = [];
    const baseY: number[]      = [];
    const scales: { current: number; target: number }[] = [];

    const defs = [
      { geo: new THREE.TetrahedronGeometry(2.07, 0), x: -2.5, y:  1.2, z: -1,   rx: 0.3, ry: 0.5 },
      { geo: new THREE.TetrahedronGeometry(1.61, 0), x:  3.2, y: -0.8, z: -2,   rx: 0.8, ry: 0.2 },
      { geo: new THREE.OctahedronGeometry(1.38,  0), x:  0.5, y: -2.0, z: -1.5, rx: 0.1, ry: 0.9 },
      { geo: new THREE.TetrahedronGeometry(1.15, 0), x: -3.5, y: -1.5, z: -0.5, rx: 0.6, ry: 0.3 },
      { geo: new THREE.OctahedronGeometry(0.92,  0), x:  2.8, y:  2.0, z: -0.8, rx: 0.4, ry: 0.7 },
    ];

    defs.forEach(({ geo, x, y, z, rx, ry }) => {
      const flatGeo = geo.index ? geo.toNonIndexed() : geo;
      flatGeo.computeVertexNormals();
      const mesh = new THREE.Mesh(flatGeo, shapeMat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, 0);
      scene.add(mesh);
      shapes.push(mesh);
      baseY.push(y);
      scales.push({ current: 1, target: 1 });
    });

    // Mouse & raycaster — dirty flag: raycast solo quando mouse si muove
    const mouse          = new THREE.Vector2(0, 0);
    const raycaster      = new THREE.Raycaster();
    const targetLightPos = new THREE.Vector3(0, 0, LIGHT_Z);
    // Parte già alla piena intensità, non a 0: il decadimento verso il target
    // nel loop di animazione spegnerebbe la luce nel giro di ~1s se il mouse
    // non si muove — cosa che sui touch, dove non esiste un vero "mousemove",
    // non succede mai finché non si trascina un dito sullo schermo.
    let lightIntensityTarget = LIGHT_INTENSITY;
    let mouseDirty           = false;
    let hovered: THREE.Object3D | null = null;

    const updateMouse = (nx: number, ny: number) => {
      mouse.set(nx, ny);
      targetLightPos.set(nx * 5, ny * 4, LIGHT_Z);
      lightIntensityTarget = LIGHT_INTENSITY;
      mouseDirty = true;
    };

    const onMouseMove = (e: MouseEvent) => updateMouse(
      (e.clientX / window.innerWidth)  * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateMouse(
        (e.touches[0].clientX / window.innerWidth)  * 2 - 1,
        -(e.touches[0].clientY / window.innerHeight) * 2 + 1
      );
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Scroll
    let scrollY       = 0;
    let scrollYSmooth = 0;
    let scrollMax     = document.body.scrollHeight - window.innerHeight;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Trascinando il bordo della finestra `resize` arriva a ogni fotogramma, e
    // `setSize` a ogni giro distrugge e rialloca il framebuffer: su uno schermo
    // Retina sono 3024x1964 con multisample, sessanta volte al secondo. E' un
    // thrash di memoria GPU che il driver non regge — su macOS si porta dietro
    // tutta la macchina. Si ridimensiona a trascinamento fermo, e nel frattempo
    // il canvas resta stirato dal compositore, che costa quanto scalare
    // un'immagine.
    const RESIZE_SETTLE_MS = 150;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    // Ultima dimensione davvero applicata: gli eventi `resize` arrivano anche
    // quando cambia solo la barra degli indirizzi mobile, e riallocare per una
    // dimensione identica e' lavoro puro.
    let lastW = w();
    let lastH = h();

    const applyResize = () => {
      const nw = w();
      const nh = h();
      // `scrollMax` non costa nulla e serve subito: si aggiorna sempre.
      scrollMax = document.body.scrollHeight - window.innerHeight;
      if (nw === lastW && nh === lastH) return;
      lastW = nw;
      lastH = nh;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      // Il budget dipende dall'area: ingrandendo la finestra il ratio va giu'.
      renderer.setPixelRatio(targetPixelRatio(nw, nh));
      renderer.setSize(nw, nh, false);
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyResize, RESIZE_SETTLE_MS);
    };
    window.addEventListener("resize", onResize);

    // Pause RAF quando tab nascosta o canvas fuori viewport
    let active = true;
    const onVisibility = () => { active = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => { active = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(mount);

    let firstFrameDone = false;

    let frameId: number;
    let elapsed = 0;
    const clock = new THREE.Clock();

    // Un canvas a tutto schermo è dominato dal riempimento: se non si regge,
    // scende il pixel ratio invece degli fps.
    const sampleFps = createFpsGovernor(targetPixelRatio(w(), h()), (pr) => {
      renderer.setPixelRatio(pr);
      renderer.setSize(w(), h(), false);
    });

    // Smorzamento esponenziale indipendente dal frame rate: `rate` è la
    // frazione colmata in un fotogramma a 60fps.
    const damp = (rate: number, step: number) => 1 - Math.pow(1 - rate, step);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!active) {
        // Scarta il delta accumulato da fermi.
        clock.getDelta();
        return;
      }

      const delta = Math.min(clock.getDelta(), MAX_DELTA);
      // Dai delta già limitati: `getElapsedTime()` correrebbe anche durante un
      // blocco, sfasando il galleggiamento.
      elapsed += delta;
      const t = elapsed;
      // Fotogrammi a 60fps trascorsi: 1 a 60fps, 2 a 30fps.
      const step  = delta * REFERENCE_FPS;

      sampleFps(performance.now());

      mouseLight.position.lerp(targetLightPos, damp(0.08, step));
      mouseLight.intensity +=
        (lightIntensityTarget - mouseLight.intensity) * damp(0.06, step);

      scrollYSmooth += (scrollY - scrollYSmooth) * damp(0.07, step);

      if (mouseDirty) {
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(shapes);
        hovered = hits.length > 0 ? hits[0].object : null;
        mouseDirty = false;
      }

      const scaleDamp = damp(0.08, step);

      shapes.forEach((mesh, i) => {
        scales[i].target   = mesh === hovered ? HOVER_SCALE : 1;
        scales[i].current += (scales[i].target - scales[i].current) * scaleDamp;
        mesh.scale.setScalar(scales[i].current);

        mesh.rotation.x += 0.001  * step * (i % 2 === 0 ? 1 : -1);
        mesh.rotation.y += 0.0015 * step * (i % 3 === 0 ? 1 : -1);

        const depth          = 1 + Math.abs(mesh.position.z) * 0.15;
        const scrollProgress = scrollMax > 0 ? scrollYSmooth / scrollMax : 0;
        const scrollOffset   = scrollProgress * SCROLL_TRAVEL / depth;
        const floating       = Math.sin(t * 0.3 + i) * 0.15;
        mesh.position.y      = baseY[i] + floating + scrollOffset;
      });

      renderer.render(scene, camera);

      // Dopo il primo fotogramma davvero disegnato: shader compilati e
      // geometrie caricate sulla GPU, quindi scoprire non mostra un vuoto.
      if (!firstFrameDone) {
        firstFrameDone = true;
        renderer.domElement.style.transition = `opacity ${CONTEXT_FADE_MS}ms ease`;
        renderer.domElement.style.opacity = "1";
        markReadyRef.current?.();
      }
    };

    // Shader e geometrie sulla GPU prima del primo giro, così il costo non
    // cade sul primo fotogramma.
    renderer.compile(scene, camera);
    clock.getDelta();
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      renderer.dispose();
      // Rilascia il contesto WebGL: la navigazione SPA li accumulerebbe.
      renderer.forceContextLoss();
      // Il prossimo contesto aspetta che questo sia davvero sparito.
      noteGlRelease();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (canvasElRef.current === renderer.domElement) canvasElRef.current = null;
    };
  }, [armed]);

  return <div ref={mountRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}
