"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ContactData } from "./contacts-filtering";

interface RowActions {
  deletingId: string | null;
  onDelete: (id: string) => void;
}

function DeleteContactButton({ contact, actions }: { contact: ContactData; actions: RowActions }) {
  return (
    <Button
      variant="ghost-destructive"
      size="icon-sm"
      onClick={() => actions.onDelete(contact.id)}
      disabled={actions.deletingId === contact.id}
      title="Supprimer"
      aria-label={`Supprimer ${contact.email}`}
    >
      <Trash2 />
    </Button>
  );
}

function SubscriptionBadge({ subscribed, className }: { subscribed: boolean; className?: string }) {
  return (
    <Badge variant={subscribed ? "success" : "destructive"} className={className}>
      {subscribed ? "Abonné" : "Désabonné"}
    </Badge>
  );
}

function TagBadges({ tags }: { tags: ContactData["tags"] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="rounded px-1.5 text-[10px] font-normal">
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

function ContactCard({ contact, actions }: { contact: ContactData; actions: RowActions }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/contacts/${contact.id}`}
            className="block text-sm font-mono text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors break-all"
          >
            {contact.email}
          </Link>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Sans nom"}
          </div>
        </div>
        <SubscriptionBadge subscribed={contact.subscribed} className="shrink-0 text-xs" />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Score engagement</span>
        <span className="font-mono">{contact.engagementScore}</span>
      </div>

      {contact.tags.length > 0 && <TagBadges tags={contact.tags} />}

      <div className="flex justify-end">
        <DeleteContactButton contact={contact} actions={actions} />
      </div>
    </div>
  );
}

/** Contacts as cards on mobile and as a table from `md` up. */
export function ContactsList({ contacts, actions }: { contacts: ContactData[]; actions: RowActions }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} actions={actions} />
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3">Email</TableHead>
              <TableHead className="px-4 py-3">Nom</TableHead>
              <TableHead className="px-4 py-3">Tags</TableHead>
              <TableHead className="px-4 py-3">Score</TableHead>
              <TableHead className="px-4 py-3">Statut</TableHead>
              <TableHead className="px-4 py-3 w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id} className="dark:hover:bg-zinc-800/30">
                <TableCell className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="hover:text-orange-500 transition-colors">
                    {contact.email}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                  {contact.firstName} {contact.lastName}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <TagBadges tags={contact.tags} />
                </TableCell>
                <TableCell className="px-4 py-3 text-sm font-mono text-zinc-500">
                  {contact.engagementScore}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <SubscriptionBadge subscribed={contact.subscribed} className="text-xs" />
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <DeleteContactButton contact={contact} actions={actions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
