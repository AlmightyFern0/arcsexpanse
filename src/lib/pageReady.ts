"use client";

// Lo splash di pagina aspetta chiunque si registri qui: l'hero (sempre,
// three.js locale) e le scene Spline che si costruiscono da zero (parse,
// compilazione shader, upload texture — lavoro sincrono che può richiedere
// secondi). Chi riprende una scena dal parcheggio non si registra: non c'è
// niente da aspettare, la GPU ha già tutto pronto.

type Listener = () => void;

let total = 0;
let ready = 0;
const listeners = new Set<Listener>();

export function registerPageReady() {
  total += 1;
  listeners.forEach((l) => l());
  let done = false;

  return {
    markReady: () => {
      if (done) return;
      done = true;
      ready += 1;
      listeners.forEach((l) => l());
    },
    unregister: () => {
      total -= 1;
      if (done) ready -= 1;
      listeners.forEach((l) => l());
    },
  };
}

export function subscribePageReadyStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPageReadyStatus() {
  return { total, ready };
}
