import { media, interview, textile } from './content.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const dialog = document.querySelector('#image-dialog');
const close = () => dialog.close();
document.querySelector('.dialog-close').addEventListener('click', close);
dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });

function placeholder(item) {
  const box = el('div', 'media-placeholder');
  box.append(el('span', 'missing-label', 'Место для фотографии'), el('span', 'media-title', item.label), el('p', 'media-description', item.caption));
  return box;
}

document.querySelectorAll('[data-media]').forEach((host) => {
  const item = media[host.dataset.media];
  const figure = el('figure', 'media-figure');
  if (item.src) {
    const button = el('button', 'photo-button');
    button.type = 'button';
    button.setAttribute('aria-label', `Увеличить: ${item.label}`);
    const image = el('img');
    image.src = item.src;
    if (item.srcset) {
      image.srcset = item.srcset;
      image.sizes = host.dataset.media === 'library' || host.dataset.media === 'weavingWide'
        ? '(max-width: 600px) 90vw, 88vw'
        : '(max-width: 600px) 90vw, 45vw';
    }
    if (item.width && item.height) { image.width = item.width; image.height = item.height; }
    image.alt = item.alt || item.label;
    image.loading = host.dataset.media === 'hero' ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      button.replaceWith(placeholder({ ...item, caption: 'Фотография не загрузилась. Можно продолжить чтение и вернуться к ней позже.' }));
    }, { once: true });
    button.append(image);
    button.addEventListener('click', () => {
      const large = dialog.querySelector('img');
      large.src = item.large || item.src;
      large.alt = item.alt || item.label;
      dialog.querySelector('figcaption').textContent = [item.label, item.location, item.credit].filter(Boolean).join(' · ');
      dialog.showModal();
    });
    figure.append(button);
  } else figure.append(placeholder(item));
  const caption = el('figcaption', 'media-caption');
  caption.append(el('p', '', item.location), el('p', '', item.credit || 'Фото: автор — уточнить'));
  figure.append(caption);
  host.append(figure);
});

document.querySelectorAll('[data-interview]').forEach((host) => {
  interview[host.dataset.interview].forEach((item) => {
    const isReady = Boolean(item.question && item.paragraphs?.some((p) => p.trim()));
    const article = el('article', `interview-item ${isReady ? 'qa' : 'interview-missing'}`);
    if (isReady) {
      article.append(el('h3', 'qa-question', item.question));
      const answer = el('div', 'qa-answer');
      answer.append(el('span', 'speaker', 'Наталья Семёнова'));
      item.paragraphs.forEach((text) => answer.append(el('p', '', text)));
      article.append(answer);
    } else {
      article.append(el('h3', '', item.topic), el('p', '', item.source), el('p', 'pending-copy', 'Место для подлинного интервью. Текст ожидает подключения.'));
    }
    host.append(article);
  });
});

if (textile.src) {
  for (const side of ['left', 'right']) {
    const image = el('img', `thread-layer thread-${side}`);
    image.src = textile.src;
    image.alt = '';
    image.addEventListener('error', () => image.remove(), { once: true });
    document.querySelector('#thread-layers').append(image);
  }
}

// Native scroll only. One rAF per frame; text never waits for an entrance animation.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width: 600px)');
const hero = document.querySelector('.hero');
const scale = document.querySelector('.scale-stage');
const scaleTrack = document.querySelector('.scale-track');
const detail = document.querySelector('.scale-detail');
const wide = document.querySelector('.scale-wide');
const firstChapter = document.querySelector('#origins');
const layers = [...document.querySelectorAll('.thread-layer')];
const textileMargin = document.querySelector('.textile-margin img');
const clamp = (v) => Math.min(1, Math.max(0, v));
let scheduled = false;

function frame() {
  scheduled = false;
  const animate = !reducedMotion.matches;
  const desktop = !mobile.matches;
  if (firstChapter.getBoundingClientRect().top > innerHeight * .45) {
    document.querySelectorAll('.chapter-nav [aria-current]').forEach((link) => link.removeAttribute('aria-current'));
  }
  const progress = animate ? clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight * .8)) : 0;
  layers.forEach((layer, index) => {
    const direction = index === 0 ? -1 : 1;
    layer.style.setProperty('--thread-x', `${direction * progress * (desktop ? 90 : 24)}px`);
    layer.style.setProperty('--thread-y', `${progress * (desktop ? 28 : 8)}px`);
  });
  if (textileMargin) {
    const offset = animate ? Math.max(-18, Math.min(18, (innerHeight / 2 - textileMargin.parentElement.getBoundingClientRect().top) * (desktop ? .035 : .012))) : 0;
    textileMargin.style.transform = `translate3d(0, ${offset}px, 0)`;
  }
  const rect = scaleTrack.getBoundingClientRect();
  const reveal = animate && desktop ? clamp((-rect.top + innerHeight * .06) / Math.max(1, rect.height - scale.offsetHeight)) : 1;
  scale.style.setProperty('--detail-progress', reveal);
  detail.classList.toggle('is-visible', reveal > .5);
  // Only one overlapping view can receive keyboard focus; both are available on mobile/reduced motion.
  wide.inert = animate && desktop && reveal > .5;
  detail.inert = animate && desktop && reveal <= .5;
}
function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(frame); } }
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule, { passive: true });
reducedMotion.addEventListener('change', schedule);
mobile.addEventListener('change', schedule);
frame();

const chapterLinks = [...document.querySelectorAll('.chapter-nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        chapterLinks.forEach((link) => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    });
  }, { rootMargin: '-10% 0px -55% 0px' });
  chapterLinks.forEach((link) => observer.observe(document.querySelector(link.hash)));
}
