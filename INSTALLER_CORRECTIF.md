# Correctif Notre Maison V1.2.1 — paramètres depuis la tablette

## Installation dans listes-famille
1. Décompresser cette archive sur le PC.
2. Dans GitHub > listes-famille > Add file > Upload files, déposer tous les fichiers et dossiers extraits à la racine du dépôt. Conserver les dossiers assets, src, scripts et tests. Ne pas déposer le ZIP lui-même.
3. Valider avec Commit changes, attendre la publication GitHub Pages.
4. Dans Fully Kiosk, vider uniquement le cache (pas les données du site), puis recharger. La version affichée en bas doit être V1.2.1. L’association existante est conservée.

## Utilisation sur la tablette
Toucher Paramètres, saisir l’e-mail et le mot de passe du compte parent du même foyer, puis Déverrouiller les paramètres. Modifier et enregistrer. Fermer les paramètres pour revenir au mode familial. Aucun nouveau code d’association nécessaire.

La session parent est conservée uniquement en mémoire et ne remplace pas le jeton d’association. Elle est abandonnée à la fermeture du panneau, après inactivité selon le délai configuré, au rechargement ou au passage en arrière-plan. Ne pas enregistrer le mot de passe dans le gestionnaire de mots de passe de la tablette partagée.
Les permissions parent sont vérifiées par le moteur Supabase existant. Un compte enfant est refusé. Quand les tâches fournissent un identifiant de foyer, une différence de foyer est refusée ; dans un foyer vide, utiliser impérativement le compte parent correspondant à cette tablette : le serveur existant n’expose pas un identifiant de foyer dans son en-tête de réponse.

## Périmètre
Configuration du portail déjà disponible : personnes/avatars, règles, rituels, raccourcis, etc. Ce correctif ne rajoute pas le maintien de l’écran allumé ni le réveil par mouvement : ils se règlent actuellement dans Android/Fully Kiosk.
Aucune modification SQL, aucune migration et aucun déploiement ne sont effectués par cette archive. config.js est celui du projet fourni précédemment ; conserver votre configuration si vous l’avez personnalisée.

## Vérifications
Construction du bundle réussie. 15 tests automatisés passent : association, accès, sessions temporaires, refus compte enfant/autre foyer avec tâches, cache et service worker. Le parcours graphique réel Android/Fully Kiosk reste à valider sur la tablette ; aucun navigateur de test exécutable n’était disponible dans l’environnement de correction.

## Retour arrière
Restaurer assets/app.js, assets/app.js.LEGAL.txt, sw.js et les sources depuis l’archive V1.2 précédente, puis vider le cache Fully. Les données en base ne sont pas modifiées par l’installation.
