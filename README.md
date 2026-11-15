# NOVASANTÉ — Site de démonstration pour une clinique

Application Next.js 15 / React 19 / TypeScript connectée au projet Supabase `NovaSante` (région Paris). Le projet représente **une seule clinique**. Les noms, photos, coordonnées et horaires visibles sont des données fictives à remplacer avant présentation à un établissement réel.

## Fonctionnalités

- Site public : accueil, clinique, spécialités, équipe, services, contact, confidentialité et demande de rendez-vous.
- Rendez-vous : disponibilités lues depuis Supabase, créneaux construits à partir du planning du spécialiste, pause et absences prises en compte, créneaux déjà demandés/confirmés exclus.
- Réservation : Route Handler serveur + fonction SQL transactionnelle, verrouillage concurrent par spécialiste/date, vérification du planning et anti double-réservation, limitation à 5 demandes par empreinte IP et fenêtre de 10 minutes.
- Réception : liste des demandes, filtre par statut, confirmation/refus, clôture et statut absent.
- Médecin : agenda limité aux rendez-vous associés à son spécialiste.
- Administration : gestion des comptes/roles, association médecin-spécialité, horaires, pauses et absences ponctuelles.
- Authentification Supabase SSR avec cookies, récupération de mot de passe, routes protégées et RLS.

## Démarrer en local

1. Installer Node.js 20.9+ (Node 22 recommandé).
2. Copier `.env.example` vers `.env.local` et renseigner les variables Supabase.
3. `npm install`
4. `npm run dev`
5. Ouvrir `http://localhost:3000`.

Variables déjà configurées dans l'archive livrée :

- `NEXT_PUBLIC_SUPABASE_URL=https://wojvtpcgnrzbbdnulsax.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` contient la clé publique `sb_publishable_...` du projet.

La clé publishable peut être exposée au navigateur. **Ne jamais ajouter une clé `service_role` ou `sb_secret_...` dans une variable `NEXT_PUBLIC_` ou dans le dépôt.**

## Créer le premier administrateur

Pour des raisons de sécurité, aucun compte de personnel ni mot de passe n'a été créé automatiquement.

1. Ouvrir le projet Supabase → Authentication → Users.
2. Cliquer sur **Add user**, créer le compte administrateur avec une adresse e-mail que vous contrôlez et un mot de passe temporaire. Confirmer l'utilisateur depuis le tableau de bord si nécessaire.
3. Le trigger crée automatiquement son profil avec le rôle `patient`.
4. Ouvrir SQL Editor et exécuter (remplacer l'adresse par celle du compte créé) :

```sql
update public.profiles p
set role = 'admin', active = true, full_name = 'Administrateur NovaSante'
from auth.users u
where p.id = u.id and lower(u.email) = lower('VOTRE-EMAIL-ADMIN');
```

5. Se connecter à `/connexion`. Depuis Administration, créer les autres comptes dans Authentication → Users puis leur attribuer le rôle `reception` ou `doctor`. Pour un médecin, choisir son spécialiste associé.

Les comptes professionnels doivent être individuels. Désactivez immédiatement les profils d'employés qui quittent la clinique.

## Base de données Supabase

Les huit fichiers SQL du dossier `supabase/migrations/` correspondent à l’historique des migrations du projet distant `NovaSante`.

Les migrations déjà appliquées au projet distant configurent :

- `specialists`, `specialist_schedules`, `specialist_absences`
- `appointments`, `profiles`, `private.booking_rate_limits`
- RLS et politiques staff/admin
- fonctions `request_appointment`, `get_available_slots`, `admin_dashboard_stats`, `current_user_is_admin` (les anciens RPC de disponibilité ont été désactivés)

La fonction `get_available_slots` calcule les heures disponibles côté base de données en tenant compte des horaires, pauses, absences, rendez-vous en attente/confirmés et de l’heure locale du Bénin. Elle ne renvoie que des heures, jamais les données des patients. Les demandes de rendez-vous ne sont jamais accessibles publiquement en lecture. Les visiteurs peuvent seulement soumettre une demande via la fonction SQL contrôlée. Les comptes staff passent par Auth + RLS.

## Avant mise en production chez une clinique

- Remplacer nom, logo, adresse, téléphone, e-mail, photos, médecins et spécialités par les informations autorisées par le prospect.
- Faire valider et renseigner les horaires réels de chaque spécialiste dans Administration.
- Créer les comptes nominatifs du personnel et vérifier les rôles.
- Configurer le SMTP Supabase pour les invitations et réinitialisations de mot de passe.
- Configurer les domaines autorisés et URL de redirection Auth pour le domaine Vercel final.
- Mettre en place sauvegardes, surveillance, politique de conservation et procédure de réponse aux incidents.
- Vérifier les obligations locales de protection des données de santé et faire valider le traitement des données par la clinique.
- Effectuer des tests fonctionnels et de sécurité avec données fictives avant tout usage réel.

## Limites explicites

Ce livrable gère la demande et le suivi des rendez-vous. Il ne constitue pas encore un dossier médical, un logiciel de facturation, un système de prescription ni une plateforme de téléconsultation. Ne pas saisir de diagnostic, ordonnance, résultat d'examen ou autre donnée médicale sensible dans le champ motif. Les contenus et horaires de démonstration ne sont pas des informations vérifiées d'un établissement réel.
