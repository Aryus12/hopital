# Correctifs NOVASANTÉ — rendez-vous

## Problème corrigé
Le formulaire dépendait de plusieurs appels Supabase séparés pour obtenir le planning, les absences et les créneaux déjà pris. En cas d'échec d'un seul appel, aucune heure n'était affichée. Les erreurs de réservation étaient également trop génériques.

## Modifications
- La disponibilité est maintenant calculée par une seule fonction SQL `get_available_slots`.
- Le calcul tient compte des jours de consultation, horaires, durées, pauses, absences, rendez-vous en attente/confirmés et de l'heure locale `Africa/Porto-Novo`.
- La fonction ne renvoie que des heures au format `HH:MM`, jamais les données des patients.
- L'API `/api/availability` utilise ce RPC, désactive le cache et renvoie des erreurs lisibles.
- Le formulaire réinitialise l'heure lorsqu'on change de médecin ou de date, affiche le chargement, les erreurs et le nombre de créneaux.
- L'API de réservation valide à nouveau les champs côté serveur et traduit les erreurs de la base en messages compréhensibles.
- Les anciens RPC publics `get_booked_slots` et `is_specialist_absent` ont été désactivés, car remplacés par le RPC unique.

## Vérifications faites sur le projet Supabase connecté
- Fonction SQL `get_available_slots` créée et permissions `anon` / `authenticated` vérifiées.
- Dr Amina, lundi 16 novembre 2026 : 8 créneaux retournés (08:00 à 11:30).
- Dr Marc, lundi 16 novembre 2026 : 12 créneaux retournés, avec la pause 12:00–13:00 exclue.
- Dr Sophie, mardi 17 novembre 2026 : 12 créneaux retournés, avec la pause 12:00–13:00 exclue.
- Les rendez-vous existants restent privés ; le RPC ne retourne que les heures disponibles.
- Les changements SQL ont été appliqués au projet Supabase `NovaSante`.

## Pour lancer le projet
1. Décompresser l'archive.
2. Ouvrir le dossier `novasante-nextjs` dans un terminal.
3. Installer les dépendances : `npm install`.
4. Lancer : `npm run dev`.
5. Tester `/rendez-vous`, sélectionner un spécialiste puis une date de consultation.

## Limite de validation
L'environnement de préparation n'avait pas accès au registre npm et l'archive source ne contenait pas de `package-lock.json`. La compilation Next.js complète n'a donc pas pu être exécutée ici. Aucun faux rendez-vous n'a été ajouté à la base pendant les tests.
