/* Le contenu vient des fichiers content/*.json, modifiés depuis l'espace admin. */
const slug = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function chargerContenu() {
  if (window.CONTENU) return window.CONTENU;
  const lire = (f) => fetch("content/" + f + ".json", { cache: "no-cache" }).then((r) => r.json());
  const [site, rubriques, creations, projets] = await Promise.all(["site", "rubriques", "creations", "projets"].map(lire));
  return { site, rubriques, creations, projets };
}

function preparer(C) {
  const S = Object.assign({}, C.site);
  S.rubriques = (C.rubriques.rubriques || []).map((r) => ({ id: slug(r.nom), nom: r.nom, texte: r.texte || "" }));
  S.creations = (C.creations.creations || []).map((c) => ({
    id: slug(c.titre), titre: c.titre, rubrique: slug(c.rubrique), annee: c.annee, format: c.format || "",
    description: c.description || "", image: c.image || "", teinte: c.teinte || "papier", vente: c
  }));
  S.boutique = S.creations.filter((c) => c.vente.a_vendre).map((c) => ({
    id: c.id, creation: c.id, prix: Number(c.vente.prix) || 0, statut: c.vente.statut || "disponible",
    note: c.vente.mention_prix || ""
  }));
  S.projets = (C.projets.projets || []).map((p) => ({ ...p, id: slug(p.titre), creations: (p.creations || []).map(slug) }));
  const A = S.apropos || {};
  S.apropos = { accroche: A.accroche || "", photo: A.photo || "", parcours: A.parcours || [],
    texte: String(A.texte || "").split(/\n\s*\n/).filter(Boolean) };
  return S;
}

chargerContenu().then((C) => demarrer(preparer(C))).catch(() => {
  document.querySelector("main").innerHTML = '<p class="mono">Le contenu n\'a pas pu être chargé. Ouvre le site depuis son adresse en ligne (ou un petit serveur local), pas en double-cliquant sur le fichier.</p>';
});

function demarrer(S) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const parId = Object.fromEntries(S.creations.map((c) => [c.id, c]));
  const rubrique = (id) => S.rubriques.find((r) => r.id === id) || { nom: id };
  const euros = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  /* Visuel : vraie image si renseignée, sinon un visuel provisoire */
  function visuel(c, ratio) {
    const style = ratio ? ` style="--ratio:${ratio}"` : "";
    if (c.image) return `<div class="visuel"${style}><img src="${esc(c.image)}" alt="${esc(c.titre)}" loading="lazy"></div>`;
    return `<div class="visuel visuel--${c.teinte || "papier"}"${style} role="img" aria-label="${esc(c.titre)} (image à venir)">
      <span class="provisoire">image à venir</span><span class="mot">${esc(c.titre)}</span></div>`;
  }
  /* Déco : étoiles et flèches dessinées (images/deco) */
  const deco = (nom, cls = "") => `<img class="deco ${nom.includes("noire") ? "deco--noire " : ""}${cls}" src="images/deco/${nom}.png" alt="" aria-hidden="true">`;
  const decoTexte = (nom, cls = "") => `<img class="deco-texte ${nom.includes("noire") ? "deco--noire " : ""}${cls}" src="images/deco/${nom}.png" alt="" aria-hidden="true">`;

  function carte(c, ratio) {
    return `<button class="oeuvre" type="button" data-oeuvre="${c.id}">${visuel(c, ratio)}
      <span class="legende"><span>${esc(c.titre)}</span><span class="type">${esc(rubrique(c.rubrique).nom)}</span></span></button>`;
  }

  /* ---------- Accueil ---------- */
  function accueil() {
    const [a, b, c] = [S.creations[0], S.creations[2], S.creations[4]];
    const annonce = Array(6).fill(`<span>${esc(S.annonce)}</span>${decoTexte("etoile-rouge", "d-defile")}`).join("");
    return `
    <div class="hero">
      ${deco("etoile-rouge-grande", "d-hero-etoile tourne")}
      <div>
        <h1><span class="nom">${esc(S.nom)}</span> fabrique des images, des <em>objets</em> &amp; des histoires.</h1>
        <div class="chapo">
          <p>${esc(S.apropos.accroche)}</p>
          <span class="main-ecrite">voir le travail ↓</span>
        </div>
      </div>
      <div class="collage" aria-hidden="true">
        ${deco("etoile-noire-eclat", "d-collage-eclat")}
        <div class="a">${visuel(a, "auto")}</div>
        <div class="b">${visuel(b, "3 / 4")}</div>
        <div class="c">${visuel(c, "1")}</div>
        <span class="scotch"></span><span class="scotch scotch--rose"></span>
      </div>
    </div>
    <div class="defilant" aria-label="${esc(S.annonce)}"><div>${annonce}${annonce}</div></div>
    <div>
      <div class="titre-section"><h2>Rubriques ${decoTexte("etoile-noire-petite", "tourne")}</h2><span class="etiquette">${S.rubriques.length} techniques</span></div>
      <ul class="rubriques">${S.rubriques.map((r, i) => {
        const n = S.creations.filter((c) => c.rubrique === r.id).length;
        return `<li><a href="#creations-${r.id}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="r">${esc(r.nom)}</span><span class="t">${esc(r.texte)}</span><span class="fl">${n} pièce${n > 1 ? "s" : ""} →</span></a></li>`;
      }).join("")}</ul>
    </div>
    <div>
      <div class="titre-section"><h2>En <em>ce moment</em> ${decoTexte("etoile-rose", "balance")}</h2><a class="lien-fleche" href="#creations">Toutes les créations →</a></div>
      <div class="selection" style="margin-top:28px">${S.creations.slice(0, 3).map((c) => carte(c)).join("")}</div>
    </div>
`;
  }

  /* Plaque en acier gravé qui mène à la boutique */
  function plaqueAcier() {
    const prix = S.boutique.filter((b) => b.statut !== "vendu").map((b) => b.prix).filter(Boolean);
    const an = String(new Date().getFullYear());
    return `<a class="acier" href="#boutique" aria-label="Boutique ouverte : voir les pièces à vendre">
      <div class="ligne-haut" aria-hidden="true"><span class="grave date">${an.slice(0, 2)}<br>${an.slice(2)} ${decoTexte("etoile-rouge", "etoile-plaque tourne")}</span>${prix.length ? `<span class="grave prix-grave">dès ${Math.min(...prix)}€</span>` : ""}</div>
      <div class="grave noms" aria-hidden="true"><span>Pièces uniques</span><span>Petites séries</span><span>Commandes</span></div>
      <div class="grave bas" aria-hidden="true"><span class="heure">Boutique</span><span class="mot-espace">ouverte</span></div>
      <span class="pastille crayon" aria-hidden="true">entre !</span>
      ${deco("etoile-rose", "d-plaque-rose")}
    </a>`;
  }

  /* ---------- Créations ---------- */
  let filtre = "tout";
  function creations() {
    const liste = filtre === "tout" ? S.creations : S.creations.filter((c) => c.rubrique === filtre);
    const bouton = (id, nom, n) => `<button type="button" data-filtre="${id}" aria-pressed="${filtre === id}">${esc(nom)}<sup>${n}</sup></button>`;
    return `
    <div class="titre-page"><h1>Créa<em>tions</em> ${decoTexte("etoile-noire-eclat", "tourne")}</h1><p>Tout le travail, rangé par technique. Clique sur une pièce pour voir les détails.</p></div>
    <div style="display:flex;flex-direction:column;gap:36px">
      <div class="filtres" role="group" aria-label="Filtrer par rubrique">
        ${bouton("tout", "Tout", S.creations.length)}
        ${S.rubriques.map((r) => bouton(r.id, r.nom, S.creations.filter((c) => c.rubrique === r.id).length)).join("")}
      </div>
      <div class="grille">${liste.map((c) => carte(c)).join("") || `<p class="mono">Rien ici pour l'instant.</p>`}</div>
    </div>`;
  }

  /* ---------- Projets ---------- */
  function projets() {
    return `
    <div class="titre-page"><h1>Pro<em>jets</em> ${decoTexte("etoile-rouge", "balance")}</h1><p>Les séries et les commandes, avec leur histoire.</p></div>
    ${S.projets.map((p) => `
      <article class="projet">
        <div class="meta">
          <div class="ligne"><span class="etiquette">${p.annee}</span><span class="etiquette">${esc(p.lieu)}</span></div>
          <h2>${esc(p.titre)}</h2>
          <p>${esc(p.texte)}</p>
        </div>
        <div class="images">${p.creations.map((id) => parId[id]).filter(Boolean).map((c) => carte(c)).join("")}</div>
      </article>`).join("")}`;
  }

  /* ---------- À propos ---------- */
  function apropos() {
    const A = S.apropos;
    const photo = A.photo ? { titre: S.nom, image: A.photo } : { titre: "Portrait", teinte: "papier" };
    return `
    <div class="apropos">
      <div>
        <span class="etiquette">${esc(S.signature)}</span>
        <p class="accroche" style="margin-top:18px">${esc(A.accroche).replace(/scotch/, "<em>scotch</em>")}</p>
        <div class="corps">${A.texte.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
      </div>
      <div class="portrait">${deco("fleche-rose", "d-portrait-fleche balance")}${visuel(photo)}<div class="petit">${visuel(S.creations[0])}</div></div>
    </div>
    <div>
      <div class="titre-section"><h2>Par<em>cours</em></h2></div>
      <ul class="parcours">${A.parcours.map((l) => `<li><span class="an">${esc(l.annee)}</span><span>${esc(l.texte)}</span></li>`).join("")}</ul>
    </div>
    <div>
      <div class="titre-section"><h2>Con<em>tact</em></h2><span class="etiquette">${esc(S.annonce)}</span></div>
      <div class="contact" style="margin-top:24px">
        <div class="bloc"><span class="etiquette">E-mail</span><span class="valeur">${esc(S.email)}</span></div>
        <div class="bloc"><span class="etiquette">Instagram</span><a class="valeur" href="${esc(S.instagram)}" target="_blank" rel="noopener">${esc(S.instagram.replace(/^https?:\/\/(www\.)?/, ""))}</a></div>
        <div class="bloc"><span class="etiquette">Lieu</span><span class="valeur">${esc(S.ville)}</span></div>
      </div>
    </div>`;
  }

  /* ---------- Boutique ---------- */
  function boutonAchat(b) {
    if (b.statut === "vendu") return `<button class="bouton bouton--creux" disabled>Vendu</button>`;
    if (b.statut === "sur commande") return `<button class="bouton bouton--creux" type="button" data-reserver="${b.id}">Commander par message</button>`;
    if (panier.includes(b.id)) return `<a class="bouton bouton--creux" href="#panier">Dans le panier ✓</a>`;
    return `<button class="bouton" type="button" data-ajouter="${b.id}">Ajouter au panier · ${euros(b.prix)}</button>`;
  }
  function boutique() {
    return `
    <div class="titre-page"><h1>Bou<em>tique</em> ${decoTexte("etoile-rouge-grande", "tourne")}</h1><p>Pièces uniques, petites séries et commandes. Expédition en France, remise en main propre possible.</p></div>
    <div class="bande-enveloppe"><span>Expédié de l'atelier</span><span class="crayon main-env">emballé à la main</span><span>Paiement sécurisé</span></div>
    <div style="display:flex;flex-direction:column;gap:36px">
      <div class="produits">${S.boutique.map((b) => {
        const c = parId[b.creation]; if (!c) return "";
        return `<article class="produit produit--${b.statut === "vendu" ? "vendu" : "dispo"}">
          <button class="oeuvre" type="button" data-oeuvre="${c.id}" aria-label="Voir ${esc(c.titre)}">${visuel(c)}</button>
          <div class="haut"><h3>${esc(c.titre)}</h3><span class="prix">${b.note ? `<small>${esc(b.note)}</small>` : ""}${euros(b.prix)}</span></div>
          <div class="details"><span>${esc(rubrique(c.rubrique).nom)}</span><span>${esc(c.format)}</span><span class="statut statut--${b.statut === "vendu" ? "vendu" : "disponible"}">${esc(b.statut)}</span></div>
          <div data-achat="${b.id}">${boutonAchat(b)}</div>
          <p class="info-paiement" data-info="${b.id}" hidden>Écris-moi à <strong style="user-select:all">${esc(S.email)}</strong> en citant « ${esc(c.titre)} ». Je te réponds avec les détails de paiement et de livraison.</p>
        </article>`;
      }).join("")}</div>
      <p class="info-paiement">Ajoute tes pièces au panier, puis paie par carte sur la page sécurisée de Stripe. Pour une commande personnalisée, écris à ${esc(S.email)}.</p>
    </div>`;
  }

  /* ---------- Panier (gardé dans le navigateur du visiteur) ---------- */
  const CLE = "panier-margot";
  const vendable = (id) => S.boutique.some((b) => b.id === id && b.statut === "disponible");
  let panier = [];
  try { panier = JSON.parse(localStorage.getItem(CLE) || "[]").filter(vendable); } catch (e) { panier = []; }
  let refusCookies = false;
  try { refusCookies = localStorage.getItem("cookies-margot") === "refus"; } catch (e) {}
  const sauver = () => { if (refusCookies) return; try { localStorage.setItem(CLE, JSON.stringify(panier)); } catch (e) {} };
  const article = (id) => S.boutique.find((b) => b.id === id);
  function majCompteur(saute) {
    const el = $("[data-compteur]"); el.textContent = panier.length;
    if (saute) { el.classList.remove("saute"); void el.offsetWidth; el.classList.add("saute"); }
  }
  function ajouter(id, depuis) {
    if (panier.includes(id) || !vendable(id)) return;
    panier.push(id); sauver();
    const zone = $(`[data-achat="${id}"]`); if (zone) zone.innerHTML = boutonAchat(article(id));
    // La pièce s'envole vers l'enveloppe de l'en-tête
    const cible = $(".lien-panier .mini-enveloppe");
    const source = depuis && depuis.closest(".produit") && depuis.closest(".produit").querySelector(".visuel");
    if (!source || !cible || matchMedia("(prefers-reduced-motion: reduce)").matches) return majCompteur(true);
    const a = source.getBoundingClientRect(), b = cible.getBoundingClientRect();
    const v = document.createElement("div"); v.className = "volant"; v.innerHTML = visuel(parId[id]);
    v.style.left = a.left + a.width / 2 - 45 + "px"; v.style.top = a.top + a.height / 2 - 56 + "px";
    document.body.appendChild(v);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      v.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.12) rotate(-25deg)`;
      v.style.opacity = ".3";
    }));
    setTimeout(() => { v.remove(); majCompteur(true); }, 760);
  }
  function retirer(id, li) {
    panier = panier.filter((x) => x !== id); sauver(); majCompteur(false);
    const fin = () => { $("#page-panier").innerHTML = pagePanier(); };
    if (li && !matchMedia("(prefers-reduced-motion: reduce)").matches) { li.classList.add("sort"); setTimeout(fin, 340); } else fin();
  }

  function pagePanier() {
    const items = panier.map(article).filter(Boolean);
    const total = items.reduce((t, b) => t + b.prix, 0);
    const xs = ["4%", "28%", "52%", "74%", "16%", "62%"], rs = ["-7deg", "5deg", "-3deg", "8deg", "-10deg", "3deg"];
    const vignettes = items.slice(0, 6).map((b, i) =>
      `<div class="vignette" style="--x:${xs[i]};--r:${rs[i]};--d:${(0.35 + i * 0.15).toFixed(2)}s">${visuel(parId[b.creation], "4 / 5")}</div>`).join("");
    const lignes = items.map((b, i) => {
      const c = parId[b.creation];
      return `<li style="--d:${(0.6 + i * 0.12).toFixed(2)}s"><span class="mini-article">${visuel(c, "1")}</span><span class="texte-article"><span class="nom-article">${esc(c.titre)}</span>
        <span class="ligne-article"><span>${esc(c.format)}</span><span>${euros(b.prix)}</span><button type="button" data-retirer="${b.id}">retirer</button></span></span></li>`;
    }).join("");
    return `
    <div class="panier">
      <div class="enveloppe">
        <div class="haut-env" aria-hidden="true">
          <div class="rabat"></div><div class="dos"></div>
          <div class="vignettes">${vignettes}</div>
          <div class="carte"><span class="titre-carte">${items.length ? "ton panier" : "c'est vide"}</span>
            <span class="sous">${items.length ? `${items.length} pièce${items.length > 1 ? "s" : ""} choisie${items.length > 1 ? "s" : ""}` : "pour l'instant"}</span></div>
        </div>
        <div class="poche">
          ${items.length ? `<ul class="articles" aria-label="Articles du panier">${lignes}</ul>`
            : `<p class="vide">Ton enveloppe attend ses premières pièces.<br><a href="#boutique">Aller à la boutique</a></p>`}
          <div class="pied-env">
            <span>${esc(S.ville)}<br>Expédition soignée</span>
            <span class="signature crayon">${esc(S.nom)}</span>
            <span style="text-align:right">Total<br>${euros(total)}</span>
          </div>
        </div>
      </div>
      ${items.length ? `<div class="actions">${deco("fleche-rose", "d-payer-fleche balance")}<button class="bouton" type="button" data-payer>Payer ${euros(total)}</button><a class="bouton bouton--creux" href="#boutique">Continuer mes achats</a></div>` : ""}
      <p class="message" data-message-paiement hidden></p>
    </div>`;
  }

  async function payer(btn) {
    const msg = $("[data-message-paiement]");
    btn.disabled = true; btn.textContent = "Ouverture du paiement…";
    try {
      const r = await fetch("/.netlify/functions/commande", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articles: panier })
      });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.erreur || "Paiement indisponible");
      window.location.href = d.url;
    } catch (e) {
      btn.disabled = false; btn.textContent = "Réessayer le paiement";
      msg.hidden = false;
      msg.textContent = (e && e.message && e.message !== "Failed to fetch" && !/JSON/.test(e.message) ? e.message + ". " : "Le paiement n'est pas encore activé sur cette version du site. ")
        + `Tu peux envoyer ta sélection à ${S.email}.`;
    }
  }

  function pageMerci() {
    panier = []; sauver(); majCompteur(false);
    return `<div class="titre-page"><h1>Mer<em>ci</em> ${decoTexte("etoile-rose", "tourne")}</h1><p>Ta commande est bien passée. Tu vas recevoir un e-mail de confirmation, et je prépare ton enveloppe à l'atelier.</p></div>
      <a class="lien-fleche" href="#creations">Revoir les créations →</a>`;
  }

  /* ---------- Page introuvable (404) ---------- */
  function introuvable() {
    return `<div class="page-404">
      <p class="code-404" aria-label="Erreur 404"><span>4</span>${decoTexte("etoile-noire-eclat", "tourne")}<span>4</span></p>
      <p class="crayon perdu">oups, cette page s'est perdue à l'atelier</p>
      <p class="explication">Le lien est peut-être ancien, ou la pièce a quitté la boutique. Tout le reste est encore là.</p>
      <div class="actions-404"><a class="bouton" href="#accueil">Retour à l'accueil</a><a class="bouton bouton--creux" href="#creations">Voir les créations</a></div>
      ${deco("etoile-rose", "d-404-rose balance")}${deco("etoile-rouge", "d-404-rouge tourne")}
    </div>`;
  }

  /* ---------- Bannière cookies ---------- */
  function banniereCookies() {
    let choix = null;
    try { choix = localStorage.getItem("cookies-margot"); } catch (e) {}
    if (choix) return;
    const b = document.createElement("aside");
    b.className = "cookies"; b.setAttribute("aria-label", "Cookies");
    b.innerHTML = `${deco("etoile-rose", "d-cookie tourne")}
      <p class="titre-cookie crayon">un petit cookie ?</p>
      <p>Ici, pas de pistage ni de publicité. Le site garde seulement ton panier dans ton navigateur, pour que tu ne le perdes pas en changeant de page.</p>
      <details><summary>En savoir plus</summary><p>Le panier est enregistré sur ton appareil (stockage local) et n'est envoyé à personne. Les polices viennent de Google Fonts. Le paiement se fait sur la page sécurisée de Stripe, qui a ses propres règles.</p></details>
      <div class="boutons-cookie"><button class="bouton" type="button" data-cookies="ok">D'accord</button><button class="bouton bouton--creux" type="button" data-cookies="refus">Non merci</button></div>`;
    document.body.appendChild(b);
    b.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cookies]"); if (!btn) return;
      const v = btn.dataset.cookies;
      try { localStorage.setItem("cookies-margot", v); if (v === "refus") { localStorage.removeItem(CLE); } } catch (e) {}
      if (v === "refus") { refusCookies = true; }
      b.classList.add("cookies--part"); setTimeout(() => b.remove(), 400);
    });
  }

  /* ---------- Fiche ---------- */
  const fiche = $("#fiche");
  function ouvrirFiche(id) {
    const c = parId[id]; if (!c) return;
    const b = S.boutique.find((x) => x.creation === id);
    const p = S.projets.find((x) => x.creations.includes(id));
    fiche.innerHTML = `<div class="contenu">
      ${visuel(c)}
      <div class="col">
        <button class="fermer" type="button" data-fermer>Fermer ✕</button>
        <span class="etiquette">${esc(rubrique(c.rubrique).nom)}</span>
        <h3>${esc(c.titre)}</h3>
        ${c.description ? `<p>${esc(c.description)}</p>` : ""}
        <dl>
          <dt>Année</dt><dd>${c.annee}</dd>
          <dt>Format</dt><dd>${esc(c.format)}</dd>
          ${p ? `<dt>Projet</dt><dd><a href="#projets" data-fermer>${esc(p.titre)}</a></dd>` : ""}
          ${b ? `<dt>Prix</dt><dd>${euros(b.prix)} · ${esc(b.statut)}</dd>` : ""}
        </dl>
        ${b ? `<div data-achat="${b.id}">${boutonAchat(b)}</div>` : ""}
      </div></div>`;
    if (typeof fiche.showModal === "function") fiche.showModal(); else fiche.setAttribute("open", "");
  }
  function fermerFiche() { if (fiche.open) fiche.close ? fiche.close() : fiche.removeAttribute("open"); }

  /* ---------- Navigation ---------- */
  const pages = { accueil, creations, projets, apropos, boutique, panier: pagePanier, merci: pageMerci, introuvable };
  function afficher() {
    let h = (location.hash || "#accueil").slice(1);
    if (h === "creations") filtre = "tout";
    if (h.startsWith("creations-")) { filtre = h.slice(10); h = "creations"; }
    if (!pages[h]) h = h ? "introuvable" : "accueil";
    for (const nom of Object.keys(pages)) {
      const el = $("#page-" + nom);
      el.hidden = nom !== h;
      if (nom === h) el.innerHTML = pages[nom]();
    }
    document.querySelectorAll(".entete nav a").forEach((a) => {
      if (a.getAttribute("href") === "#" + h) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-oeuvre]"); if (o) return ouvrirFiche(o.dataset.oeuvre);
    const f = e.target.closest("[data-filtre]");
    if (f) { filtre = f.dataset.filtre; $("#page-creations").innerHTML = creations(); return; }
    const aj = e.target.closest("[data-ajouter]"); if (aj) return ajouter(aj.dataset.ajouter, aj);
    const rt = e.target.closest("[data-retirer]"); if (rt) return retirer(rt.dataset.retirer, rt.closest("li"));
    const py = e.target.closest("[data-payer]"); if (py) return payer(py);
    const r = e.target.closest("[data-reserver]");
    if (r) { const info = $(`[data-info="${r.dataset.reserver}"]`); info.hidden = !info.hidden; return; }
    if (e.target.closest("[data-fermer]") || e.target === fiche) fermerFiche();
  });

  // Textes communs
  document.querySelectorAll("[data-nom]").forEach((el) => (el.innerHTML = `<b>${esc(S.nom)}</b> fablab`));
  $("[data-nom-pied]").textContent = S.nom;
  $("[data-ville]").textContent = "[ " + S.ville + " ]";
  $("[data-email]").textContent = S.email;
  $("[data-annee]").textContent = new Date().getFullYear();

  majCompteur(false);
  banniereCookies();
  window.addEventListener("hashchange", afficher);
  afficher();
}
