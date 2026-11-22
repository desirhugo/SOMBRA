/**
 * SOMBRA · data/videos.js
 * ---------------------------------------------------------------------------
 * Vídeos de YouTube que se recomiendan en el informe final para cada punto a mejorar
 * (21-nov-2026, a petición del usuario: «una recomendación en YouTube… para aprender a
 * hacerlo bien»; el mejor vídeo en cualquier idioma).
 *
 * Cómo se eligieron: búsqueda en YouTube por el fallo concreto; se prefieren canales de
 * entrenadores conocidos y títulos que tratan justo ese fallo. Cada vídeo se comprobó el
 * 21-nov-2026 con el servicio oEmbed de YouTube (existe; título y canal coinciden). Se eligieron
 * por título, canal y descripción: no se han visto enteros. `alt`: otro vídeo del mismo fallo
 * en español, cuando lo hay.
 *
 * Claves: las de `video` en REPORT_LINKS de js/vision/coach.js.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};
  SB.data.videos = {
    cargar: {
      id: 'k1C-uhQnnI8', title: 'Stop Telegraphing Punches in Boxing', channel: 'Tony Jeffries', lang: 'inglés',
      alt: { id: 'j_m4UuesaYw', title: 'Deja de Telegrafiar tus Golpes', channel: 'VITERI BOXING', lang: 'español' }
    },
    guardia: {
      id: 'krh00SNH1Hg', title: 'How to Avoid Dropping Hands in Boxing (KEEP HANDS UP!)', channel: 'Tony Jeffries', lang: 'inglés',
      alt: { id: 'ODt8eDN4uFU', title: 'Tips Para Mejorar LA GUARDIA - «3 Minutos de Boxeo» Cap. 1', channel: 'Como Boxear', lang: 'español' }
    },
    barbilla: {
      id: '4h_Frg_r-qI', title: 'Best Boxing Drill to Keep your CHIN DOWN!!', channel: 'Tony Jeffries', lang: 'inglés',
      alt: { id: 'PTgvWX9mJF8', title: 'Nunca cometas este error en el boxeo', channel: 'Tony Jeffries Español', lang: 'español' }
    },
    recogida: { id: 'rRKy88DvJzA', title: '20 Punch & Retraction Drills', channel: 'Ian Streetz', lang: 'inglés' },
    cadera: { id: 'mvGQ3cQvsKo', title: 'Right Cross punching technique - grounded position', channel: 'Expert Boxing', lang: 'inglés' },
    rectos: { id: 'vyTaKpylOcU', title: 'How to Throw a 1 - 2 / Jab - Cross in Boxing', channel: 'Tony Jeffries', lang: 'inglés' },
    equilibrio: { id: 'UCkOixnskC4', title: 'Master Your Jab: Why Leaning Forward is Killing Your Technique', channel: 'Lentz Lundy Boxing', lang: 'inglés' },
    codos: { id: 'h07PpXCJJoE', title: 'Common Boxing Mistake #3 - Why You Need to Keep Your Elbow In For The Jab', channel: 'Ritchie Yip', lang: 'inglés' },
    base: { id: '6I4tjlp1_6o', title: '5 Common Boxing Stance Mistakes To Avoid', channel: 'FightCamp', lang: 'inglés' },
    tecnica: { id: 'KsgNqWsVjUE', title: 'Teaching the Hook & Uppercut to Beginners: «Bicep on Forearm»', channel: 'fightTIPS', lang: 'inglés' }
  };
})(window.SB = window.SB || {});
