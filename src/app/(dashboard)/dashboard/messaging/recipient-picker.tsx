"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Phone, Tag, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

function getContactValue(contact: MessagingContactOption) {
  return `${getContactName(contact)} ${contact.email} ${contact.phone}`;
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
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: phone || "",
  });

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedId || contact.phone === phone) ?? null,
    [contacts, phone, selectedId],
  );

  function selectContact(contact: MessagingContactOption) {
    setSelectedId(contact.id);
    setComboboxOpen(false);
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
      setDialogOpen(false);
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
          {selectedContact && <Badge variant="success">Contact sélectionné</Badge>}
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
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="h-11 justify-between px-3 font-normal"
                  >
                    <span className="min-w-0 truncate text-left">
                      {selectedContact ? `${getContactName(selectedContact)} · ${selectedContact.phone}` : "Choisir un contact existant"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(36rem,calc(100vw-2rem))] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un contact..." />
                    <CommandList>
                      <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                      <CommandGroup heading="Contacts avec numéro">
                        {contacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={getContactValue(contact)}
                            onSelect={() => selectContact(contact)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{getContactName(contact)}</p>
                              <p className="truncate text-xs text-zinc-500">{contact.phone}</p>
                            </div>
                            <Check className={cn("h-4 w-4", selectedContact?.id === contact.id ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewContact((current) => ({ ...current, phone }))}
                  >
                    <UserPlus className="h-4 w-4" />
                    Nouveau contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un contact WhatsApp</DialogTitle>
                    <DialogDescription>
                      Ajoutez un destinataire sans quitter l’envoi WhatsApp. L’email reste optionnel.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp-first-name">Prénom</Label>
                        <Input
                          id="whatsapp-first-name"
                          value={newContact.firstName}
                          onChange={(event) => setNewContact((current) => ({ ...current, firstName: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp-last-name">Nom</Label>
                        <Input
                          id="whatsapp-last-name"
                          value={newContact.lastName}
                          onChange={(event) => setNewContact((current) => ({ ...current, lastName: event.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-phone">Téléphone WhatsApp</Label>
                      <Input
                        id="whatsapp-phone"
                        type="tel"
                        value={newContact.phone}
                        onChange={(event) => setNewContact((current) => ({ ...current, phone: event.target.value }))}
                        placeholder="+225 07 XX XX XX XX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp-email">Email optionnel</Label>
                      <Input
                        id="whatsapp-email"
                        type="email"
                        value={newContact.email}
                        onChange={(event) => setNewContact((current) => ({ ...current, email: event.target.value }))}
                        placeholder="client@entreprise.com"
                      />
                    </div>
                    {contactError && (
                      <p className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                        {contactError}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="button" onClick={saveContact} disabled={savingContact || !newContact.phone}>
                      {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Créer le contact
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="tel"
                value={phone}
                onChange={(event) => updateManualPhone(event.target.value)}
                placeholder="+225 07 XX XX XX XX"
                className="h-11 pl-9"
              />
            </div>
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
