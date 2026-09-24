export interface SnippetOption {
  id: string;
  name: string;
  htmlContent: string;
}

export interface EditorVariable {
  name: string;
  label: string;
}

export const VARIABLES: EditorVariable[] = [
  { name: "email", label: "Email du contact" },
  { name: "name", label: "Nom du contact" },
  { name: "firstName", label: "Prénom" },
  { name: "lastName", label: "Nom de famille" },
  { name: "tags", label: "Tags du contact" },
  { name: "currentTime", label: "Date actuelle" },
  { name: "unsubscribeUrl", label: "Lien de désinscription" },
  { name: "viewOnlineUrl", label: "Voir en ligne" },
];

export const COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316", "#F59E0B",
  "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#FFFFFF",
];

export const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "36", "48"].map((size) => ({
  label: size,
  value: `${size}px`,
}));
