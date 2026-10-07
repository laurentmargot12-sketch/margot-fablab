// Crée la page de paiement Stripe pour le panier.
// Les prix sont relus depuis content/creations.json sur le site : un visiteur ne peut pas les modifier.
// Réglage nécessaire dans Netlify : variable d'environnement STRIPE_SECRET_KEY (clé secrète Stripe).
// Optionnel : STRIPE_SHIPPING_RATE (identifiant d'un tarif de livraison créé dans Stripe, shr_…).

const slug = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const reponse = (code, corps) => new Response(JSON.stringify(corps), { status: code, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return reponse(405, { erreur: "Méthode non autorisée" });
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) return reponse(503, { erreur: "Le paiement n'est pas encore configuré" });

  let demande;
  try { demande = await req.json(); } catch { return reponse(400, { erreur: "Panier illisible" }); }
  const ids = [...new Set(Array.isArray(demande.articles) ? demande.articles.map(String) : [])].slice(0, 30);
  if (!ids.length) return reponse(400, { erreur: "Ton panier est vide" });

  const origine = new URL(req.url).origin;
  const contenu = await fetch(origine + "/content/creations.json").then((r) => r.json());
  const catalogue = Object.fromEntries((contenu.creations || []).map((c) => [slug(c.titre), c]));

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", origine + "/#merci");
  params.append("cancel_url", origine + "/#panier");
  params.append("locale", "fr");
  for (const pays of ["FR", "BE", "CH", "LU", "DE", "ES", "IT", "NL", "PT", "GB"]) params.append("shipping_address_collection[allowed_countries][]", pays);
  if (process.env.STRIPE_SHIPPING_RATE) params.append("shipping_options[0][shipping_rate]", process.env.STRIPE_SHIPPING_RATE);

  let i = 0;
  for (const id of ids) {
    const c = catalogue[id];
    if (!c || !c.a_vendre || c.statut !== "disponible" || !(Number(c.prix) > 0)) {
      return reponse(409, { erreur: `« ${c ? c.titre : id} » n'est plus disponible, retire-la du panier` });
    }
    params.append(`line_items[${i}][quantity]`, "1");
    params.append(`line_items[${i}][price_data][currency]`, "eur");
    params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(Number(c.prix) * 100)));
    params.append(`line_items[${i}][price_data][product_data][name]`, c.titre);
    if (c.format) params.append(`line_items[${i}][price_data][product_data][description]`, c.format);
    i++;
  }

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + cle, "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  const session = await r.json();
  if (!r.ok) return reponse(502, { erreur: "Stripe a refusé la commande" });
  return reponse(200, { url: session.url });
};
