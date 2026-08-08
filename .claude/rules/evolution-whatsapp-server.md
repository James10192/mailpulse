# Serveur Evolution API (transport WhatsApp Baileys)

Où tourne Evolution, comment l'atteindre, et les pièges qui font perdre des heures.
Aucun secret dans ce fichier : il est versionné.

## Le piège numéro un

`EVOLUTION_API_URL=http://3.144.161.136:8080` dans `.env.local` **pointe vers une
machine morte**. C'est une ancienne instance AWS dont l'IP publique a changé au
premier arrêt (pas d'IP élastique). Tout paraît « Evolution est éteint » alors que
le service tourne parfaitement ailleurs.

**Evolution vit sur le VPS Windows Contabo, celui de KLASSCI College.**

## Le serveur

| | |
|---|---|
| IP publique | `94.72.96.119` |
| Hostname | `vmi3307378` |
| OS | Windows Server 2022 Datacenter |
| Service | `mailpulse-evolution` (géré par NSSM) |
| Dossier | `C:\evolution-api` |
| Écoute | `127.0.0.1:8080` **et rien d'autre** |
| Version | Evolution API 2.3.7, `clientName: mailpulse_evolution` |
| Reverse proxy | Caddy (`klassci-caddy`), auto-TLS Let's Encrypt déjà actif |

Le même serveur héberge KLASSCI College. Ne casse rien en intervenant.

## Y accéder

L'accès SSH est celui de KLASSCI College, il n'est pas dupliqué ici.

```bash
cd ~/Downloads/DEV/KLASSCI-college
ssh -F deploy/ssh_config klassci
```

Le shell distant est PowerShell. La clé privée est dans
`KLASSCI-college/deploy/.ssh/klassci_deploy`, hors de ce dépôt et jamais copiée
dedans. Sous Git Bash, `ssh` peut manquer du PATH :
`export PATH="/c/Windows/System32/OpenSSH:$PATH"`.

## Vérifier que ça tourne

```bash
ssh -F deploy/ssh_config klassci "Get-Service mailpulse-evolution"
ssh -F deploy/ssh_config klassci "(Invoke-WebRequest http://127.0.0.1:8080/ -UseBasicParsing).Content"
ssh -F deploy/ssh_config klassci "nssm restart mailpulse-evolution"
```

Un `curl` depuis ton poste vers `http://94.72.96.119:8080` **timeout, et c'est
normal** : aucune règle de pare-feu n'ouvre 8080. Ne conclus pas que le service
est mort, teste toujours en local sur le serveur d'abord.

## Ce qui bloque encore la production

MailPulse tourne sur Vercel et doit joindre Evolution depuis l'extérieur. Deux
contraintes se combinent :

1. Le port 8080 n'est pas exposé.
2. `evoFetch` (`src/lib/whatsapp-baileys.ts`) **refuse volontairement une URL non
   HTTPS en production**. La clé d'API, les numéros des parents et le contenu des
   messages transitent dans ces requêtes ; en clair sur une IP publique, c'est
   inacceptable.

La bonne réponse est donc un sous-domaine derrière le Caddy déjà en place, par
exemple `evolution.klassci.com` en `reverse_proxy 127.0.0.1:8080`, avec le
certificat automatique. Puis `EVOLUTION_API_URL=https://evolution.klassci.com`.
N'ouvre pas 8080 en direct : ça exposerait l'API en clair.

## La clé d'API

`EVOLUTION_API_KEY` est **globale à tout Evolution** : elle ne connaît aucune
notion de locataire. Qui la détient peut lister toutes les instances, envoyer un
WhatsApp depuis le numéro de n'importe quelle école, rediriger les webhooks
entrants, et lire le QR code pour détourner une session.

La valeur historique est une chaîne lisible sans entropie, présente en clair dans
des `.env` locaux. **Considère-la compromise** : à faire tourner vers 32 octets
aléatoires en même temps que la mise en HTTPS. Ne la colle jamais dans un fichier
versionné, ni dans un message, ni dans une URL.

## Le webhook entrant

MailPulse expose `/api/webhooks/whatsapp/baileys/<applicationId>`. Evolution ne
signe rien : l'authentification est un jeton porteur. Le provisioning imprime
aujourd'hui l'URL avec `?token=...`, ce qui fait atterrir le secret dans les
journaux d'accès. Evolution 2.3.7 accepte des en-têtes de webhook
(`setWebhook(instance, url, headers)` est déjà câblé côté MailPulse) : dès que
c'est vérifié sur cette instance, bascule le jeton dans l'en-tête `Authorization`
et retire le paramètre d'URL.

## Rappels

- Le service tourne sur le serveur de production de KLASSCI College. Pas de build
  lourd, pas de manipulation hasardeuse dessus.
- Commandes SSH courtes et atomiques, jamais de `sleep` chaîné.
- Instances Evolution : une par école. Le nom d'instance n'étant unique que par
  organisation côté base, le webhook entrant résout par identifiant d'application,
  jamais par nom d'instance seul.
