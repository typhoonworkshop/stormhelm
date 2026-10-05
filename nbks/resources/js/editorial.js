function nbs(selector = "[data-nb]", heading = "<h3>Notes</h3>") {
  const container = document.createElement("div");
  let headings = [];

  function hashLinkCheck(hashLink) {
    // Retry briefly because target nodes may appear after async DOM updates.
    let hashLinkChecks = 0;
    const hashLinkChecker = setInterval((checksLimit = 2) => {
      let div = document.getElementById(
        hashLink.substring(hashLink.indexOf("#") + 1)
      );
      if (div) {
        div.scrollIntoView();
        clearInterval(hashLinkChecker);
      }
      if (++hashLinkChecks >= checksLimit && !div)
        clearInterval(hashLinkChecker);
    }, 100);
  }

  function observed() {
    let nbNum = 0;
    const h = Array.from(document.querySelectorAll(selector));
    // Rebuild only when the set/order of note markers has changed.
    if (h.length !== headings.length || h.some((h, i) => headings[i] !== h)) {
      headings = h;
      // Replace the full notes block from current marker elements.
      container.innerHTML = heading;
      const inner = document.createElement("div");
      headings.forEach((h) => {
        // Replace each marker content with a backlink token like [1], [2], ...
        h.innerHTML = `<a class=nb href=#_${h.dataset.nb}>[${++nbNum}]</a>`;
        h.onclick = (e) => {
          e.preventDefault();
          hashLinkCheck(e.target.href);
        };
        const p = document.createElement("p");
        p.className = "nb";
        p.id = `_${h.dataset.nb}`;
        const atag = document.createElement("a");
        atag.href = `#${h.id}`;
        atag.textContent = `${nbNum}.`;
        // Jump back from the note entry to its in-text marker.
        atag.onclick = (e) => { e.preventDefault(); h.scrollIntoView(); };
        const noteEl = document.getElementById(h.dataset.nb);
        p.appendChild(atag);
        // Parse note HTML into DOM nodes so tags render instead of printing literally.
        p.insertAdjacentHTML("beforeend", " " + (noteEl ? noteEl.innerHTML : ""));
        inner.appendChild(p);
      });
      container.appendChild(inner);
    }
  }

  // Observe DOM mutations so notes stay synchronized with live notebook content.
  const observer = new MutationObserver(observed);
  observer.observe(document.body, { childList: true, subtree: true });
  observed();
  return container;
}
export { nbs };