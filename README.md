# Notre Maison V1.4

Portail tablette avec missions compactes, checklist détaillée, mode Une étape à la fois et création guidée. Le déverrouillage parent et la politique écran Fully de V1.3 sont conservés.

**Avant de publier : appliquer une seule fois le complément SQL commun.** Lire INSTALLATION_V12.md. Ne pas le relancer si déjà appliqué depuis l’archive Mes Missions V12.

Cette archive se dépose, après décompression, à la racine du dépôt listes-famille. Conserver assets, src et tous les nouveaux scripts. URL : https://lumawork.github.io/listes-famille/.

L’association de la tablette reste dans son navigateur. Vider uniquement le cache, pas les données du site. Les réglages locaux d’écran ne changent pas les téléphones. Voir ECRAN_FULLY.md.

Développement : Node 22+, npm ci, npm run build, npm test, npm run test:ui. Le bundle assets/app.js est déjà construit. La tablette affiche les données communes ; la reprise unique des listes personnelles se fait depuis Mes Missions à la connexion de chaque compte.
