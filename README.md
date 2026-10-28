# Notre Maison 1.2 — code pour GitHub

Livraison du 26 octobre 2026. Version autonome issue du portail familial existant, adaptée à GitHub Pages. **Aucun compte ChatGPT ni serveur ChatGPT n’est nécessaire au fonctionnement de cette version.** Elle utilise la base Supabase de Mes Missions.

## Installer dans un second dépôt

1. Décompresser l’archive et ouvrir le dossier `notre-maison`.
2. Créer toi-même, lorsque tu le souhaites, un dépôt GitHub nommé `notre-maison`. La configuration fournie suppose le compte `lumawork` ; changer les liens si tu choisis un autre compte ou nom.
3. Mettre **le contenu** de ce dossier à la racine du dépôt : `index.html` doit être directement à la racine, avec `assets`, `config.js`, `sw.js`, etc. Ne pas déposer uniquement le ZIP ou imbriquer un second dossier `notre-maison`. Exclure `node_modules`.
4. Vérifier `config.js` : `missionsUrl` pointe vers le dépôt existant `https://lumawork.github.io/listes-nana/`. L’URL Supabase et sa clé publique réutilisent le projet existant.
5. Quand tu décides de publier : GitHub → Settings → Pages → « Deploy from a branch » → branche choisie → `/ (root)`.

Les fichiers construits sont fournis : **aucune commande n’est nécessaire pour cette installation**. Aucun dépôt n’a été créé, aucun code n’a été poussé et aucun site n’a été déployé par cette livraison. Aucun workflow de publication automatique n’est ajouté.

## Première ouverture

Le mode aperçu affiche exclusivement des exemples fictifs. Pour retrouver la famille : **Connecter Mes Missions**, puis le compte Mes Missions existant. Le moteur et les occurrences sont communs aux deux applications ; les listes V10 non reprises restent dans leur onglet historique.

Pour la tablette commune : depuis un compte parent, créer un accès **Tablette familiale · trois listes**, puis associer la tablette avec son identifiant et son code. La caméra et les raccourcis demandent leurs autorisations supplémentaires. L’accès tablette ne permet pas l’administration. Un code pour une seule liste ne donne accès qu’à cette liste.

Les avatars se modifient depuis le portrait : six choix prédéfinis, photo JPEG/PNG/WebP et retour à l’avatar par défaut. Une photo est recadrée au centre et allégée avant envoi ; le recadrage manuel n’est pas inclus.

## Données et sécurité

- Une seule base Supabase existante et les mêmes comptes. Aucune donnée personnelle ni photo réelle n’est incluse dans le code livré.
- Autorisation de chaque action par les RPC : foyer, personne, rôle, appareil, version et identifiant de demande. Une coche locale ne vaut jamais confirmation serveur.
- Hors connexion : lecture du dernier instantané associé à ce compte ou à cet appareil, au maximum 24 h. Aucune validation hors ligne n’est mise en attente pour un envoi ultérieur. Le cache est effacé à la déconnexion et lors d’un refus d’accès connu. Une révocation ne peut être découverte par un appareil resté hors ligne qu’à sa reconnexion ou à l’expiration du cache.
- GitHub Pages ne fournit pas de cookies serveur HttpOnly : la session Supabase et l’association sont conservées dans le stockage local du navigateur. Utiliser un profil de navigateur réservé à la tablette et un code limité ; ne pas y conserver un compte parent ouvert. La politique CSP limite les scripts au site et toutes les données familiales sont protégées côté Supabase.
- Les clés `sb_publishable_` sont publiques. Aucun secret `service_role` n’est nécessaire dans ce site statique.

La base existante est déjà équipée du moteur V11 : aucune migration SQL supplémentaire n’est nécessaire pour cette adaptation. Le dossier Mes Missions contient les références SQL et la procédure de vérification.

## Modifier le code plus tard

Les sources éditables sont dans `src/`. `style.css` et `config.js` restent directement éditables, sans build. Si tu modifies `src/` :

```sh
npm ci
npm test
npm run build
```

Le build régénère `assets/app.js` et ses mentions de licences. Il ne publie rien. Ajouter ensuite ces fichiers construits au dépôt avec les sources. Les versions des dépendances sont verrouillées dans `package-lock.json`.

Les chemins des ressources, du manifeste et du service worker sont relatifs : le code fonctionne à la racine ou sous un chemin de projet GitHub Pages. La PWA nécessite HTTPS. Le mode `file://` ne convient pas.

Voir `RECETTE_ET_LIMITES.md` pour le périmètre vérifié et les essais Android encore nécessaires.
