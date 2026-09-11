"use client";
import { useSearchParams } from "next/navigation";
import OusThatGame from "@/components/ousthat/OusThatGame";

const PLAYERS = [
  { profile_id: "p1", profiles: { username: "Guillaume" }, joined_at: Date.now() },
  { profile_id: "p2", profiles: { username: "Robin" }, joined_at: Date.now() },
];

export default function TmpOusthatAudit() {
  const params = useSearchParams();
  const as = params.get("as") === "p2" ? "p2" : "p1";
  const solo = params.get("solo") === "1";
  const me = as === "p2" ? { id: "p2", username: "Robin" } : { id: "p1", username: "Guillaume" };
  return (
    <OusThatGame
      room={{ id: "test-room", host_id: "p1" }}
      me={me}
      players={solo ? [PLAYERS[0]] : PLAYERS}
      isHost={as === "p1"}
      lang="fr"
      onFinish={() => {}}
    />
  );
}
