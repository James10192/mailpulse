# Serveur Evolution API (transport WhatsApp Baileys)

Où tourne Evolution, comment l'atteindre, et les pièges qui font perdre des heures.
Aucun secret dans ce fichier : il est versionné.

## L'URL à utiliser

```
EVOLUTION_API_URL=https://college.klassci.com/evolution
```

Publique, en HTTPS, déjà servie par le Caddy du serveur. **Ne crée pas de
sous-domaine `evolution.klassci.com`** : il n'apporte rien, il faudrait un
enregistrement DNS, et modifier le Caddyfile ferait courir un risque inutile à la
production de KLASSCI College.

## Le piège numéro un

Une ancienne configuration traîne, avec **deux valeurs périmées à la fois** :
`http://3.144.161.136:8080` (instance AWS dont l'IP publique a changé à l'arrêt,
faute d'IP élastique) et une clé `mailpulse-evo-secret-2026` que le serveur
refuse en 401. Résultat : tout paraît « Evolution est éteint » alors que le
service tourne parfaitement. Avant de conclure à une panne, vérifie l'URL et la
clé.

**Evolution vit sur le VPS Windows Contabo, celui de KLASSCI College.**

## Le serveur

| | |
|---|---|
| IP publique | `94.72.96.119` |
| Hostname | `vmi3307378` |
| OS | Windows Server 2022 Datacenter |
| Service | `mailpulse-evolution` (géré par NSSM) |
| Dossier | `C:\evolution-api` |
| Écoute | `127.0.0.1:8080`, jamais exposé en direct |
| Accès public | `https://college.klassci.com/evolution` (Caddy strip le préfixe) |
| Version | Evolution API 2.3.7, `clientName: mailpulse_evolution` |
| Reverse proxy | Caddy (`klassci-caddy`), config `C:\klassci\deploy\Caddyfile` |

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
normal** : aucune règle de pare-feu n'ouvre 8080 et il ne faut pas l'ouvrir, ce
serait exposer l'API en clair. L'accès public passe uniquement par le chemin
HTTPS ci-dessus. Ne conclus pas que le service est mort : teste
`https://college.klassci.com/evolution/`, puis en local sur le serveur.

Depuis ton poste :

```bash
curl -s https://college.klassci.com/evolution/
curl -s -H "apikey: <cle>" https://college.klassci.com/evolution/instance/fetchInstances
```

`evoFetch` (`src/lib/whatsapp-baileys.ts`) **refuse volontairement une URL non
HTTPS en production** : la clé d'API, les numéros des parents et le contenu des
messages transitent dans ces requêtes. L'URL ci-dessus satisfait cette contrainte.

## La clé d'API

Elle vit dans `C:\evolution-api\.env` sur le serveur, sous
`AUTHENTICATION_API_KEY`, et c'est la source de vérité. 48 caractères aléatoires.

```bash
ssh -F deploy/ssh_config klassci "Select-String -Path C:\evolution-api\.env -Pattern '^AUTHENTICATION_API_KEY='"
```

Elle est **globale à tout Evolution** : elle ne connaît aucune notion de
locataire. Qui la détient peut lister toutes les instances, envoyer un WhatsApp
depuis le numéro de n'importe quelle école, rediriger les webhooks entrants, et
lire le QR code pour détourner une session. Ne la colle jamais dans un fichier
versionné, ni dans un message, ni dans une URL. Si elle fuit, fais-la tourner sur
le serveur puis mets à jour `.env.local` et Vercel.

## L'URL de production de MailPulse

**`https://mailpulse-two.vercel.app`**

Le projet Vercel n'a pas de domaine personnalisé, et ses alias par défaut
(`mailpulse-james10192s-projects.vercel.app`, l'URL de chaque déploiement) sont
protégés par le SSO Vercel : ils redirigent au lieu de servir, donc aucun webhook
ne peut les joindre.

⚠️ **`mailpulse.vercel.app` n'est pas ce projet.** Le nom est pris par un tiers et
répond 200, ce qui le rend très facile à confondre. Ne jamais déduire le domaine
en testant des noms : le vérifier avec `vercel ls mailpulse` ou en appelant une
route connue, un vrai déploiement renvoie `Unauthorized` en texte brut sur le
webhook, pas une redirection ni du JSON de protection.

## Ce qui est déjà provisionné (pilote KLASSCI)

| | |
|---|---|
| Organisation | `mon-org` / `cmn9rqwxh000004ky0azejp5x` |
| Application externe | clé `klassci`, id `cmskwhilx0000f0lc1jmq8og2` |
| Instance Evolution | `mp-cmn9rqwxh000004ky0azejp5x`, statut `open` |
| Numéro WhatsApp | `22541540178` |
| Template | `parent_chatbot.invitation` (fr) |
| Webhook Evolution | posé, jeton en en-tête `Authorization`, évènement `MESSAGES_UPSERT` |

Les secrets (clé de commande, jeton entrant) ne sont affichés qu'une fois par le
script. Perdus, ils se regénèrent avec `--rotate-command-credential` et
`--rotate-inbound-token`.

**La KEK lie la base au déploiement.** Les secrets sont chiffrés en base avec
`EXTERNAL_APPLICATION_KEK`. Si Vercel n'a pas exactement la même valeur que celle
ayant servi au provisioning, rien n'est déchiffrable et le webhook répond 503.
Changer la KEK impose de reprovisionner.

## Le webhook entrant

MailPulse expose `/api/webhooks/whatsapp/baileys/<applicationId>`. Evolution ne
signe rien : l'authentification est un jeton porteur.

**Vérifié sur cette instance : Evolution 2.3.7 accepte et conserve les en-têtes de
webhook.** Le jeton n'a donc rien à faire dans l'URL, où il atterrirait dans tous
les journaux d'accès. Configure le webhook ainsi :

```bash
curl -X POST -H "apikey: <cle>" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"<url-sans-token>",
       "headers":{"Authorization":"Bearer <jeton>"},
       "byEvents":false,"base64":false,"events":["MESSAGES_UPSERT"]}}' \
  https://college.klassci.com/evolution/webhook/set/<instance>
```

Le corps attendu est la forme v2 imbriquée sous `webhook`. Relire la config avec
`GET /webhook/find/<instance>`, qui renvoie `null` tant que rien n'est posé.

Le script de provisioning imprime encore l'URL avec `?token=`. C'est un repli
hérité : préfère toujours l'en-tête.

## Rappels

- Le service tourne sur le serveur de production de KLASSCI College. Pas de build
  lourd, pas de manipulation hasardeuse dessus.
- Commandes SSH courtes et atomiques, jamais de `sleep` chaîné.
- Instances Evolution : une par école. Le nom d'instance n'étant unique que par
  organisation côté base, le webhook entrant résout par identifiant d'application,
  jamais par nom d'instance seul.
