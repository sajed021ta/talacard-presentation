const fa = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
// Shared by the editor and the public viewer, keeping the same reading order.
export function renderNavigation(deck, index, choose) {
  const chapter = deck.scenes[index].chapter;
  const chapters = [...new Set(deck.scenes.map(s => s.chapter))];
  const list = document.querySelector('#chapter-list'), pages = document.querySelector('#page-tabs');
  list.replaceChildren(); pages.replaceChildren();
  for (const name of chapters) {
    const matching = deck.scenes.map((s, i) => [s, i]).filter(([s]) => s.chapter === name);
    const b = document.createElement('button'); b.className = 'chapter-button';
    b.textContent = name; b.setAttribute('aria-current', name === chapter ? 'true' : 'false');
    b.onclick = () => choose(matching[0][1]); list.append(b);
    if (name !== chapter) continue;
    for (const [s, i] of matching) {
      const page = document.createElement('button'); page.textContent = s.label;
      page.setAttribute('aria-current', i === index ? 'page' : 'false'); page.dataset.scene = i;
      page.onclick = () => choose(i); pages.append(page);
    }
  }
  document.querySelector('#scene-heading').textContent = `${chapter} / ${deck.scenes[index].label}`;
  const count = document.querySelector('#page-count'); if (count) count.textContent = fa(deck.scenes.length);
  document.querySelector('#page-location').textContent = `صفحهٔ ${fa(index + 1)} از ${fa(deck.scenes.length)}`;
  // Only the horizontal strip scrolls. Selecting a page never jumps the document.
  requestAnimationFrame(() => {const current = pages.querySelector('[aria-current="page"]'); if(current) {const r=current.getBoundingClientRect(),p=pages.getBoundingClientRect();if(r.left<p.left || r.right>p.right) pages.scrollLeft += r.left-p.left;}});
}
