import { useNavigate, useParams } from "@tanstack/react-router";
import { getCharacter } from "../../helpers/roster-storage.js";
import CharacterDossier from "../CharacterDossier/CharacterDossier.jsx";

export default function DossierView() {
  const { operatorId } = useParams({ strict: false });
  const navigate = useNavigate();
  const record = getCharacter(operatorId);

  if (!record) {
    return (
      <div className="dos-missing">
        <p>Operator file not found.</p>
        <button className="btn-action" onClick={() => navigate({ to: "/roster" })}>
          <span className="btn-prompt">&gt;_</span> Back to Roster
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <button className="btn-action" onClick={() => navigate({ to: "/roster" })}>
          <span className="btn-prompt">&gt;_</span> Back to Roster
        </button>
      </div>
      <CharacterDossier char={record.character} fromRoster />
    </>
  );
}
