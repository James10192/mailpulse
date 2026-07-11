---
name: MailPulse
description: Plateforme marketing multicanal pensée pour l'Afrique francophone.
colors:
  signal-orange: "#f97316"
  action-orange: "#ea580c"
  action-orange-hover: "#f97316"
  ink: "#09090b"
  ink-soft: "#18181b"
  paper: "#ffffff"
  app-canvas: "#fafafa"
  panel-dark: "#18181b"
  border-light: "#e4e4e7"
  border-dark: "#27272a"
  muted-light: "#f4f4f5"
  muted-text: "#71717a"
  muted-text-dark: "#a1a1aa"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#dc2626"
typography:
  display:
    fontFamily: "Space Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
components:
  button-primary:
    backgroundColor: "{colors.action-orange}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.action-orange-hover}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    height: "40px"
  badge-default:
    backgroundColor: "#fff7ed"
    textColor: "{colors.action-orange}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: MailPulse

## 1. Overview

**Creative North Star: "Le cockpit de campagne francophone"**

MailPulse doit se lire comme un outil de pilotage : dense quand la décision l'exige, calme quand l'utilisateur doit agir, toujours lisible. Le dashboard est la référence par défaut. La landing peut porter davantage de présence de marque, mais le produit garde une grammaire d'interface sobre, fiable et opérationnelle.

La surface doit inspirer confiance aux équipes marketing de PME africaines francophones. L'identité locale passe par les mots, les workflows, le FCFA, WhatsApp, la délivrabilité et les preuves de maîtrise, pas par une décoration plaquée. L'accent orange signale l'action, le statut actif et les points d'attention.

MailPulse rejette explicitement le clone SaaS américain générique et l'outil trop développeur. Si une interface met l'API, l'effet visuel ou la métrique décorative avant la tâche marketing, elle n'est pas dans le système.

**Key Characteristics:**
- Interface produit claire, dense et stable.
- Accent orange rare, visible et actionnable.
- Neutres zinc pour les surfaces, bordures et états secondaires.
- Français naturel, libellés métier, hiérarchie courte.
- Motion réservée aux états, aux transitions et au feedback.

## 2. Colors

La palette est restreinte : un orange signal, des neutres zinc, puis des couleurs sémantiques pour les états.

### Primary
- **Orange signal**: l'accent de marque et d'action. Il sert aux CTA, états actifs, focus rings, icônes d'intention et indicateurs de progression. Il ne doit pas devenir une couleur décorative de fond.
- **Orange action**: variante plus profonde pour les boutons primaires et les actions engageantes. Le hover revient vers Orange signal pour donner une réponse immédiate.

### Secondary
- **Zinc opérationnel**: les gris zinc portent le dashboard, les textes secondaires, les bordures, les tableaux, la sidebar et les panneaux. Ils gardent l'interface professionnelle sans la refroidir.

### Tertiary
- **États métier**: emerald pour succès, amber pour avertissement, red pour erreur. Les états doivent rester fonctionnels : message clair, contraste suffisant, jamais couleur seule.

### Neutral
- **Paper**: surface claire principale des cartes, formulaires et modales.
- **App canvas**: fond clair du dashboard pour distinguer les panneaux.
- **Ink**: texte principal et titres.
- **Muted text**: texte secondaire uniquement, jamais pour information critique.
- **Panel dark**: surface sombre pour la landing, les overlays et certains contextes techniques.

### Named Rules

**The One Signal Rule.** L'orange est réservé à l'action, au focus, au statut actif et aux signaux de progression. Si plus de 10% d'un écran produit est orange, l'écran crie au lieu d'aider.

**The Neutral Workbench Rule.** Le dashboard repose sur des surfaces zinc et blanches, avec des bordures calmes. Les fonds saturés sont interdits sur les workflows répétitifs.

## 3. Typography

**Display Font:** Space Mono, avec fallback monospace.
**Body Font:** Plus Jakarta Sans, avec fallback system sans.
**Label/Mono Font:** Plus Jakarta Sans pour les labels, Space Mono pour chiffres, métriques et fragments techniques.

**Character:** Plus Jakarta Sans donne au produit une base moderne, claire et non intimidante. Space Mono apporte une précision de cockpit pour les métriques, montants, identifiants et moments de marque, mais ne doit pas envahir les contrôles.

### Hierarchy
- **Display** (700, 3rem à 4.5rem sur landing, 1.1): réservé à la landing et aux très grands moments de marque. Pas dans les labels ou boutons produit.
- **Headline** (600, 1.5rem, 1.25): titres de pages dashboard et sections majeures.
- **Title** (600, 1rem, 1): titres de cartes, modales, panneaux et blocs de formulaire.
- **Body** (400, 0.875rem, 1.5): contenu produit, descriptions, cellules de tableau et aide contextuelle.
- **Label** (500, 0.75rem, 0.02em): en-têtes de tableau, badges et micro-libellés. L'uppercase doit rester rare et fonctionnel.

### Named Rules

**The Dashboard Sans Rule.** Dans l'application, Plus Jakarta Sans porte l'interface. Space Mono est un accent de précision pour les données, pas une police de contrôle.

**The No Shouting Rule.** Les grandes tailles et le tracking serré appartiennent à la landing. Les écrans produit utilisent une échelle fixe, compacte et prévisible.

## 4. Elevation

MailPulse est plat par défaut et utilise surtout les bordures, les fonds et les états actifs pour créer la hiérarchie. Les ombres existent pour les overlays, les tooltips, les modales, les menus et les panneaux mobiles. Les cartes de dashboard ne doivent pas flotter sans raison.

### Shadow Vocabulary
- **Surface low** (`shadow-sm`): carte ou sidebar flottante, uniquement quand une bordure seule ne suffit pas.
- **Overlay medium** (`shadow-lg`): modale, dialog, popover ou panneau qui doit se détacher du contenu.
- **Overlay high** (`shadow-xl` / `shadow-2xl`): sheet latérale, menu important ou élément temporaire au-dessus de l'application.

### Named Rules

**The Flat-By-Default Rule.** Une surface au repos utilise une bordure et un fond, pas une ombre large. L'ombre doit expliquer une superposition, un mouvement ou une interaction.

## 5. Components

Les composants sont tactiles, sobres et opérationnels. Ils doivent ressembler à une même famille : rayon contenu, icônes Lucide 16px, focus orange, états disabled visibles, densité assumée.

### Buttons
- **Shape:** coins légèrement arrondis (10px), hauteur standard 40px, grande action 44px, petite action 32px.
- **Primary:** Orange action sur texte blanc, padding horizontal 16px standard ou 24px large.
- **Hover / Focus:** hover vers Orange signal, focus ring orange à 40% d'opacité, disabled à 50% d'opacité.
- **Secondary / Ghost / Tertiary:** secondaires en zinc clair ou sombre, ghost sans fond au repos, link en orange avec underline au hover.

### Chips
- **Style:** badges en pilule, 11px, padding compact, fond teinté et texte contrasté.
- **State:** orange pour défaut, emerald pour succès, amber pour warning, red pour erreur, zinc pour secondaire, outline pour neutre.

### Cards / Containers
- **Corner Style:** coins cohérents (10px), parfois 14px sur panneaux plus grands.
- **Background:** blanc en clair, zinc-900 à 50% en sombre.
- **Shadow Strategy:** `shadow-sm` seulement sur les cartes qui doivent se détacher. Bordure zinc par défaut.
- **Border:** zinc-200 en clair, zinc-800 en sombre.
- **Internal Padding:** 20px dans les cartes, 16px pour les blocs compacts.

### Inputs / Fields
- **Style:** hauteur 40px, fond blanc ou zinc-950 en sombre, bordure zinc, rayon 10px, texte 14px.
- **Focus:** ring orange à 40%, pas de double contour décoratif.
- **Error / Disabled:** erreur rouge avec message explicite, disabled visible par opacité et curseur.

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.** Sidebar gauche en dashboard, topbar compacte, items 32 à 36px, icônes 16px, état actif en fond sidebar-accent orange très clair. Sur mobile, la navigation passe en sheet pleine hauteur avec les mêmes items et libellés.

### Tables

Les tableaux sont denses et lisibles : texte 14px, en-têtes 12px uppercase léger, lignes séparées par bordure zinc, hover de ligne en zinc très clair. Les données numériques et taux peuvent utiliser Space Mono.

### Dialogs / Sheets

Les dialogs sont centrés, bordés, rayon 10px, shadow-lg, overlay noir 50%. Les sheets et panneaux latéraux peuvent monter à shadow-2xl, mais seulement parce qu'ils recouvrent l'application.

## 6. Do's and Don'ts

### Do:
- **Do** utiliser Orange signal pour l'action, le focus, l'actif et les indicateurs utiles.
- **Do** garder les surfaces produit calmes : blanc, zinc-50, zinc-100, zinc-800, zinc-950.
- **Do** écrire les labels et états en français naturel, avec le vocabulaire des équipes marketing.
- **Do** donner à chaque composant interactif ses états default, hover, focus, active, disabled, loading et error.
- **Do** réserver Space Mono aux métriques, montants, identifiants, extraits techniques et grands moments de landing.
- **Do** vérifier les contrastes, le clavier, le focus visible et reduced motion avant de livrer.

### Don't:
- **Don't** produire un clone SaaS américain générique : dark template interchangeable, jargon anglophone, promesses vagues, métriques décoratives.
- **Don't** transformer MailPulse en outil trop développeur : discours API-first dominant, dashboard froid, concepts techniques avant les tâches marketing.
- **Don't** utiliser l'orange comme fond décoratif massif dans le dashboard.
- **Don't** mélanger plusieurs formes de boutons, champs ou cartes pour une même action.
- **Don't** mettre des gradients de texte, orbes décoratifs, bento grids répétitifs ou hero metrics décoratifs dans l'application.
- **Don't** utiliser une modale comme premier réflexe quand une action inline, un panneau ou une progression guidée suffit.
