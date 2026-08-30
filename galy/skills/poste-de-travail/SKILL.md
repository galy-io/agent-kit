---
name: poste-de-travail
description: Mettre en place la réserve de copies de travail isolées et l'icône de lancement qui les ouvre — nommée d'après le produit de l'équipe, avec son icône, et qui se met à jour toute seule à chaque lancement. Se charge sur « installe le lanceur », « je veux une icône sur mon bureau », « mets en place les worktrees », ou à la fin d'un audit où `environment_bootstraps` n'est pas au vert. Elle écrit dans le dépôt ET sur la machine : elle demande avant, toujours.
---

# poste-de-travail — la copie isolée par défaut, et l'icône qui l'ouvre

Deux agents dans le même dossier se détruisent l'un l'autre. Ce n'est pas une hypothèse : un
`git checkout` est global au dossier, il change la branche sous les pieds de qui travaille en
même temps, et **rien ne l'en avertit**. La discipline ne suffit pas — la personne qui livre ne
voit pas la session qui bascule.

Ce qui suffit, c'est que la copie isolée soit **le chemin le plus court**. Une icône qui ouvre
une session déjà installée dans un worktree propre, à jour, avec le bon jeton : personne ne
retourne travailler dans le checkout principal, parce que ce serait plus de travail.

C'est le critère `environment_bootstraps`, et sa garde est écrite noir sur blanc : *les copies de
travail sont isolées les unes des autres, sinon deux agents en parallèle se détruisent.*

## Elle touche deux endroits, et un seul a une différence à relire

C'est toute la raison pour laquelle cette skill demande, alors que `galy:adapt` ne demande pas.

| Où | Quoi | Comment ça se juge |
|---|---|---|
| **Le dépôt** | les scripts : le lanceur, le module qui dit ce qu'est un slot libre, l'installateur de l'icône, l'icône | une demande de fusion — elle montre le diff exact et ne change rien tant que personne ne fusionne |
| **La machine** | les worktrees sur le disque, le raccourci sur le bureau, le profil de terminal | **rien à relire.** Une fois fait, c'est fait |

La seconde ligne n'a pas de juge. **Alors on demande, et on demande avant d'exécuter quoi que ce
soit** — pas après avoir créé les dossiers, pas « je prépare et tu valides ».

### La question, une fois, avant tout

`AskUserQuestion`, et elle nomme ce qui va s'écrire et où :

> **Je peux mettre en place l'environnement de travail : une réserve de copies isolées du dépôt,
> et une icône sur votre bureau qui en ouvre une propre à chaque fois.**
>
> Cela écrit à deux endroits : des scripts dans le dépôt (proposés par une demande de fusion,
> que vous relisez), et sur votre poste — des dossiers de travail à côté du dépôt, un raccourci
> sur le bureau, un profil de terminal. Cette moitié-là ne se relit pas.
>
> — *Oui, les deux* (recommandé)
> — *Les scripts seulement* — la demande de fusion, rien sur le poste ; ils l'installeront eux-mêmes
> — *Non*

Sur *non*, tu enregistres le critère sur ce qui est vrai et tu passes. Pas d'insistance, pas de
seconde question plus tard dans la même passe.

## L'icône porte le nom de LEUR produit

Le développeur d'AlumnForce reçoit une icône **AlumnForce**. Pas « Galy-Dev », pas « Galy », pas
le logo d'un fournisseur.

Ce n'est pas de la courtoisie. Cette icône se pose sur leur bureau, à côté de leurs propres
outils, et c'est **leur environnement de développement** qu'elle ouvre — pas notre produit. Une
icône à notre nom se lit comme un agent commercial installé sur le poste, et elle se supprime
dans la semaine.

- **Le nom** vient de leur produit, pas de leur dépôt : `AlumnForce`, pas `alumnforce-back`.
  Demande-le si le dépôt ne le dit pas clairement.
- **L'icône** est la leur — la favicon de leur site convertie, ou un fichier qu'ils fournissent.
  Green Acres emploie la favicon de `green-acres.com`, et c'est exactement le bon réflexe.
  Sans icône trouvable, demande plutôt que de mettre celle de Galy.
- **Le profil de terminal**, s'il y en a un, porte un identifiant à eux. Deux environnements qui
  partageraient le même se repeindraient mutuellement l'onglet.

## Les cinq propriétés, et chacune vient d'une panne réelle

Deux implémentations de référence existent, et elles se lisent : `scripts/Open-GalyWorktree.ps1`,
`scripts/GalyWorktrees.psm1`, `scripts/Install-GalyShortcut.ps1` dans le dépôt de Galy. **Lis-les
avant d'écrire.** Ce qui suit dit ce qu'elles font ; elles disent comment.

1. **Le bassin s'énumère par le gestionnaire de versions, jamais par un préfixe de dossier.**
   `git worktree list --porcelain`. Un préfixe est une convention, donc une chose qu'on oublie,
   et il fait tomber sur le worktree d'un autre dépôt.

2. **Il ne manque jamais de slot : il en crée un.** Renvoyer quelqu'un vers le checkout principal
   faute de place, c'est fabriquer exactement la collision qu'on prétend éviter. Un slot dont la
   branche est déjà fusionnée et qui ne bouge plus se récupère — rien n'est détruit, la branche
   garde sa référence, on s'en détache seulement.

3. **Le checkout principal est exclu du bassin.** C'est la maison du lanceur et le seul chemin
   que le raccourci connaît. Une session qui y travaillerait réécrirait le script sous les pieds
   du prochain double-clic.

4. **Une seule règle écrite une seule fois** pour dire ce qu'est un slot libre — le lanceur et la
   garde de session la lisent au même endroit. Deux lectures qui se contrediraient produiraient
   précisément les deux sessions dans le même dossier.

5. **Le lanceur se met à jour à chaque lancement.** C'est la propriété qui fait que les
   améliorations se propagent, et sans elle chaque poste gèle au jour de son installation.

### La mise à jour au lancement, en détail

C'est la moitié que les gens omettent, et c'est celle qui rend l'outil vivant.

Au démarrage, avant tout le reste : `fetch`, `merge --ff-only`, et **si la référence a bougé,
ré-exécuter le lanceur fraîchement sorti** — sinon le code déjà chargé en mémoire reste l'ancien,
et la mise à jour ne prend qu'au lancement suivant. Un drapeau d'environnement empêche la seconde
passe de refaire la récupération, sinon c'est une boucle.

Trois gardes, chacune non négociable :

- **Borné en temps et non interactif.** Un jeton expiré doit échouer vite. Une invite
  d'authentification pendue derrière une fenêtre qu'on ne voit pas est un lanceur qui ne démarre
  jamais, sans message.
- **Jamais bloquant.** Échec de mise à jour = avertissement, et on continue avec la version
  locale. Un poste hors ligne doit ouvrir sa session.
- **Depuis le checkout du lanceur**, pas depuis le worktree qu'on vient de choisir : c'est le seul
  chemin stable que le raccourci connaît.

Green Acres va un cran plus loin — un condensé d'une liste fixe de fichiers de mise en place,
comparé à une empreinte posée sur le poste, qui ne rejoue l'installateur que s'il a changé. C'est
la bonne réponse quand la mise en place dépasse le lanceur (tâches planifiées, variables,
raccourcis multiples). En dessous, le `ff-only` suffit et se relit en dix lignes.

## Ce qu'elle ne fait jamais

- **Écraser un raccourci qui pointe ailleurs.** Un autre checkout du même dépôt s'est déjà fait
  détourner son icône en silence : le propriétaire ne s'en aperçoit qu'au double-clic qui
  l'emmène ailleurs. On refuse, on le dit, et on ne passe outre que sur demande explicite.
- **Écrire un chemin sous le dossier d'un utilisateur** dans un script commité. Ça marche chez
  son auteur et chez personne d'autre. Tout se déduit de l'emplacement du script.
- **Poser le raccourci sur un seul bureau.** La redirection vers un espace de fichiers
  d'entreprise laisse un bureau synchronisé *et* un bureau local, tous deux affichés selon le
  contexte : un raccourci posé sur le mauvais est simplement invisible.
- **Installer quoi que ce soit qu'on n'a pas nommé dans la question.** Une tâche planifiée, un
  démarrage automatique, un service : chacun est une nouvelle question, pas un détail
  d'implémentation.

## Ce que tu rends

Trois lignes, pas un rapport :

- ce qui est parti dans la demande de fusion, avec son lien ;
- ce qui a été posé sur le poste, et où — le chemin du raccourci, le nombre de copies prêtes ;
- l'état de `environment_bootstraps` tel que tu l'as enregistré après coup.

Puis dis-leur de fermer la session et de rouvrir **par l'icône** : c'est le seul moyen de
vérifier que la chaîne complète marche, et ça se voit en dix secondes.
