"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Phone, Search, Tag, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createMessagingContact } from "./actions";

export type MessagingContactOption = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
};

type RecipientMode = "single" | "bulk";

function getContactName(contact: MessagingContactOption) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
}

function contactMatches(contact: MessagingContactOption, query: string) {
  const value = `${contact.firstName ?? ""} ${contact.lastName ?? ""} ${contact.email} ${contact.phone}`.toLowerCase();
  return value.includes(query.toLowerCase().trim());
}

export function RecipientPicker({
  contactsWithPhone,
  contacts: initialContacts,
  availableTags,
  mode,
  phone,
  audience,
  onModeChange,
  onPhoneChange,
  onAudienceChange,
}: {
  contactsWithPhone: number;
  contacts: MessagingContactOption[];
  availableTags: string[];
  mode: RecipientMode;
  phone: string;
  audience: "all" | string;
  onModeChange: (mode: RecipientMode) => void;
  onPhoneChange: (phone: string) => void;
  onAudienceChange: (audience: "all" | string) => void;
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: phone || "",
  });

  const filteredContacts = useMemo(
    () => contacts.filter((contact) => contactMatches(contact, query)).slice(0, 8),
    [contacts, query],
  );

  function selectContact(contact: MessagingContactOption) {
    setSelectedId(contact.id);
    onModeChange("single");
    onPhoneChange(contact.phone);
    setContactError(null);
  }

  function updateManualPhone(value: string) {
    setSelectedId(null);
    onPhoneChange(value);
    setNewContact((current) => ({ ...current, phone: value }));
  }

  async function saveContact() {
    setSavingContact(true);
    setContactError(null);
    const result = await createMessagingContact(newContact);
    setSavingContact(false);

    if (result.contact) {
      const contact = result.contact;
      const option: MessagingContactOption = {
        id: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
      };

      setContacts((current) => [option, ...current.filter((item) => item.id !== option.id)]);
      selectContact(option);
      setShowNewContact(false);
      setNewContact({ firstName: "", lastName: "", email: "", phone: option.phone });
      return;
    }

    if (result.error) setContactError(result.error);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-zinc-500">
            <Users className="h-4 w-4" />
            Destinataire
          </CardTitle>
          {selectedId && <Badge variant="success">Contact sélectionné</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("single")}
          >
            Un seul contact
          </Button>
          <Button
            type="button"
            variant={mode === "bulk" ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange("bulk")}
          >
            Envoi en masse ({contactsWithPhone})
          </Button>
        </div>

        {mode === "single" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(event) => updateManualPhone(event.target.value)}
                  placeholder="+225 07 XX XX XX XX"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewContact((value) => !value);
                  setNewContact((current) => ({ ...current, phone }));
                }}
              >
                <UserPlus className="h-4 w-4" />
                Enregistrer
              </Button>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un contact existant"
                  className="pl-9"
                />
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => {
                    const selected = selectedId === contact.id || phone === contact.phone;
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => selectContact(contact)}
                        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {getContactName(contact)}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {contact.phone}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">
                    Aucun contact avec ce numéro ou ce nom.
                  </div>
                )}
              </div>
            </div>

            {showNewContact && (
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={newContact.firstName}
                    onChange={(event) => setNewContact((current) => ({ ...current, firstName: event.target.value }))}
                    placeholder="Prénom"
                  />
                  <Input
                    value={newContact.lastName}
                    onChange={(event) => setNewContact((current) => ({ ...current, lastName: event.target.value }))}
                    placeholder="Nom"
                  />
                </div>
                <Input
                  type="tel"
                  value={newContact.phone}
                  onChange={(event) => setNewContact((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Téléphone WhatsApp"
                />
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(event) => setNewContact((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email optionnel"
                />
                {contactError && (
                  <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    {contactError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewContact(false)}>
                    Annuler
                  </Button>
                  <Button type="button" size="sm" onClick={saveContact} disabled={savingContact || !newContact.phone}>
                    {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Créer le contact
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Les messages seront envoyés uniquement aux contacts abonnés avec un numéro valide.
            </p>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={audience === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => onAudienceChange("all")}
              >
                Tous ({contactsWithPhone})
              </Button>
              {availableTags.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant={audience === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => onAudienceChange(tag)}
                >
                  <Tag className="h-4 w-4" />
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
