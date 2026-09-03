"use client";
import FermeGame from "@/components/ferme/FermeGame";

export default function DevTestPage() {
  return (
    <FermeGame
      room={{ id: "devtest-room" }}
      me={{ id: "p1", username: "Testeur" }}
      players={[{ profile_id: "p1", username: "Testeur", joined_at: Date.now() }]}
      isHost
      savedCode="XXXX"
    />
  );
}
