import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import OperatorManager from "../OperatorManager";

export default function RosterView() {
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    () => navigate({ to: "/create" }),
    [navigate],
  );

  return <OperatorManager onNavigate={handleNavigate} />;
}
