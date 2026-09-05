#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# hook-bancs.sh — LE FILET QUI MANQUAIT LE 2026-09-05.
# ─────────────────────────────────────────────────────────────────────────────
# Ce jour-là, DEUX bancs de contrôle étaient rouges depuis des jours sans que
# personne le sache : le §10 de CLAUDE.md annonçait « TOUS RELANCÉS » en en
# nommant huit sur vingt. Aucun des deux ne signalait un défaut de jeu — les
# deux étaient des bancs dont la règle avait vieilli sous une livraison plus
# récente. Mais tant qu'ils rougissaient pour leur propre raison, la règle
# qu'ils existent pour tenir n'était plus tenue par personne.
#
# ⚠️ UN BANC ROUGE N'EST PAS UNE DETTE QUI ATTEND : C'EST UNE PROTECTION QUI A
# DÉJÀ CESSÉ. D'où ce hook — appelé par le HARNAIS au démarrage d'une session,
# pas par le modèle. La règle « Claude ne lance pas de bancs de son propre chef »
# (§13) reste donc intacte : ce n'est pas un jugement d'agent, c'est un réflexe
# de la machine.
#
# ⚠️ IL EST MUET QUAND TOUT EST VERT, et c'est délibéré : un filet qui parle à
# chaque session cesse d'être lu au bout de trois. Il ne parle que pour dire
# qu'une protection est tombée.
#
# ⚠️ 63 s pour les vingt (mesuré) — d'où `async: true` dans settings.json. Il ne
# doit JAMAIS bloquer un tour.
# ─────────────────────────────────────────────────────────────────────────────
cd "$(dirname "$0")/.." || exit 0
red=""
for b in tools/verify-*.mjs; do
  [ -e "$b" ] || continue
  node "$b" >/dev/null 2>&1 || red="$red $(basename "$b" .mjs)"
done
if [ -n "$red" ]; then
  printf '{"systemMessage":"BANCS ROUGES :%s — un banc rouge ne peut plus rien dire du defaut suivant (CLAUDE.md 10)."}\n' "$red"
fi
exit 0
