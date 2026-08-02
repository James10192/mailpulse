type TemplateDefinition = {
  providerTemplateId: string | null;
  variables: unknown;
  metadata: unknown;
};

export function compileMetaTemplateDispatch(template: TemplateDefinition, messageVariables: unknown) {
  const providerTemplateId = template.providerTemplateId?.trim();
  if (!providerTemplateId) throw new Error("Le modèle Meta approuvé doit avoir un identifiant fournisseur.");

  const variableOrder = templateVariableOrder(template);
  const values = asRecord(messageVariables);
  return {
    providerTemplateId,
    parameters: variableOrder.map((name) => {
      const value = values[name];
      if (value === undefined || value === null) {
        throw new Error(`La variable de modèle « ${name} » est requise.`);
      }
      if (typeof value === "object") throw new Error(`La variable de modèle « ${name} » doit être scalaire.`);
      return String(value);
    }),
  };
}

function templateVariableOrder(template: TemplateDefinition) {
  const metadataOrder = asStringArray(asRecord(template.metadata).variable_order);
  if (metadataOrder) return uniqueNames(metadataOrder);

  const declaredVariables = template.variables;
  const arrayOrder = asStringArray(declaredVariables);
  if (arrayOrder) return uniqueNames(arrayOrder);

  const objectOrder = Object.keys(asRecord(declaredVariables));
  return uniqueNames(objectOrder);
}

function uniqueNames(names: string[]) {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  if (cleaned.length !== new Set(cleaned).size) throw new Error("L'ordre des variables du modèle contient un doublon.");
  return cleaned;
}

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
