"use client";
import { Component } from "react";

/* ==========================================================================
   GameErrorBoundary (2026-07) — filet de sécurité autour du jeu monté.
   ==========================================================================
   Sans lui, la moindre exception non rattrapée dans un moteur de jeu
   (chacun fait entre 400 et 1900 lignes) faisait tomber TOUTE la page de la
   room : écran blanc, aucune issue pour le joueur à part recharger à la
   main. Ce boundary limite les dégâts au seul encart du jeu et offre une
   porte de sortie propre ("Revenir au salon", câblée par la page room :
   reset complet de la room côté hôte, simple retour de vue côté invité).

   Composant de CLASSE obligatoire : componentDidCatch/getDerivedStateFromError
   n'ont pas d'équivalent hooks à ce jour.

   La page room le monte avec une `key` qui change à chaque jeu ET à chaque
   lancement (launch_at) : un boundary "cassé" est donc naturellement jeté
   et remplacé par une instance fraîche quand l'hôte relance une partie —
   pas besoin de mécanique de reset interne.

   L'erreur est volontairement re-loggée en console avec un préfixe ARCARDI
   clair : c'est ce qui permet un signalement utile ("ouvre la console")
   plutôt qu'un écran blanc muet.
   ========================================================================== */
export default class GameErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error, info) {
    console.error("[ARCARDI] Le jeu en cours a planté (rattrapé par GameErrorBoundary) :", error, info?.componentStack);
  }

  render() {
    const { t, onBack } = this.props;
    if (!this.state.crashed) return this.props.children;
    return (
      <div className="panel game-crash-panel" role="alert">
        <span className="game-crash-icon" aria-hidden="true">🧯</span>
        <h2>{t("gameCrashTitle")}</h2>
        <p className="hint">{t("gameCrashText")}</p>
        <button className="btn" onClick={onBack}>{t("gameCrashBack")}</button>
      </div>
    );
  }
}
