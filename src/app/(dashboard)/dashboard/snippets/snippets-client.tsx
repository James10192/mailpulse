"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Blocks, Code, FileText, Mail, MessageCircle, Plus, Sparkles } from "lucide-react";

import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wrapHtmlForPreview } from "@/lib/preview-html";
import type { ActionState } from "@/types/action-state";
import { createSnippetAndRedirect, deleteSnippet } from "./actions";
import { SnippetChannelChart, SnippetContentChart } from "./snippets-charts";
import {
  channelLabels,
  formatDate,
  formatNumber,
  getCharacterCount,
  getPlainText,
  getWordCount,
  hasContent,
  type Snippet,
  type SnippetSort,
} from "./snippets-types";
import { ChannelBadge, MetricCard, SnippetActions } from "./snippets-ui";

const sortOptions: Array<{ label: string; value: SnippetSort }> = [
  { label: "Plus récents", value: "date-desc" },
  { label: "Plus anciens", value: "date-asc" },
  { label: "Nom A-Z", value: "name-asc" },
  { label: "Contenu le plus long", value: "content-desc" },
];

function buildSummary(snippets: Snippet[]) {
  return snippets.reduce(
    (acc, snippet) => {
      acc.total += 1;
      acc[snippet.channel.toLowerCase() as "email" | "whatsapp" | "sms"] += 1;
      acc.withContent += hasContent(snippet) ? 1 : 0;
      acc.words += getWordCount(snippet);
      acc.characters += getCharacterCount(snippet);
      return acc;
    },
    { total: 0, email: 0, whatsapp: 0, sms: 0, withContent: 0, words: 0, characters: 0 },
  );
}

function filterSnippets(snippets: Snippet[], channel: string, search: string, sortBy: SnippetSort) {
  const query = search.trim().toLowerCase();

  return snippets
    .filter((snippet) => {
      const matchesChannel = channel === "ALL" || snippet.channel === channel;
      const haystack = [snippet.name, snippet.description ?? "", getPlainText(snippet.htmlContent)].join(" ").toLowerCase();
      return matchesChannel && (!query || haystack.includes(query));
    })
    .sort((a, b) => {
      if (sortBy === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "content-desc") return getCharacterCount(b) - getCharacterCount(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function SnippetsClient({
  snippets,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  snippets: Snippet[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [previewSnippet, setPreviewSnippet] = useState<Snippet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Snippet | null>(null);
  const [channel, setChannel] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SnippetSort>("date-desc");
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [createState, formAction, isCreating] = useActionState<ActionState, FormData>(createSnippetAndRedirect, null);

  const summary = useMemo(() => buildSummary(snippets), [snippets]);
  const filtered = useMemo(() => filterSnippets(snippets, channel, search, sortBy), [snippets, channel, search, sortBy]);

  const channelData = [
    { channel: "Email", value: summary.email, fill: "#f97316" },
    { channel: "WhatsApp", value: summary.whatsapp, fill: "#22c55e" },
    { channel: "SMS", value: summary.sms, fill: "#71717a" },
  ].filter((item) => item.value > 0);

  const contentData = snippets
    .filter(hasContent)
    .slice(0, 8)
    .map((snippet) => ({
      name: snippet.name.length > 14 ? `${snippet.name.slice(0, 14)}...` : snippet.name,
      words: getWordCount(snippet),
      chars: getCharacterCount(snippet),
    }));

  function confirmDelete() {
    if (!deleteTarget) return;
    setActionError("");
    startTransition(async () => {
      const result = await deleteSnippet(deleteTarget.id);
      if (result?.error) setActionError(result.error);
      else router.refresh();
      setDeleteTarget(null);
    });
  }

  return (
    <div className="page-stack app-shell-safe">
      {overLimit && limit !== -1 ? (
        <LimitWarningBanner resourceLabel="snippets" current={currentCount} limit={limit} planLabel={planLabel} />
      ) : null}

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Snippets</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Bibliothèque de blocs réutilisables pour vos campagnes email et WhatsApp.
          </p>
        </div>
        <Button asChild={!canCreate} onClick={canCreate ? () => setCreateOpen(true) : undefined}>
          {canCreate ? (
            <>
              <Plus className="h-4 w-4" />
              Nouveau snippet
            </>
          ) : (
            <Link href="/dashboard/settings/billing">
              <Sparkles className="h-4 w-4" />
              Passer au Pro
            </Link>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Snippets" value={formatNumber(summary.total)} description={`${formatNumber(summary.email)} email · ${formatNumber(summary.whatsapp)} WhatsApp`} icon={Blocks} />
        <MetricCard label="Prêts à utiliser" value={formatNumber(summary.withContent)} description={`${formatNumber(Math.max(summary.total - summary.withContent, 0))} brouillons sans contenu.`} icon={FileText} />
        <MetricCard label="Volume contenu" value={formatNumber(summary.words)} description={`${formatNumber(summary.characters)} caractères dans la bibliothèque.`} icon={Code} />
        <MetricCard label="Limite du plan" value={limit === -1 ? "∞" : formatNumber(limit)} description={`${formatNumber(currentCount)} utilisés sur le plan ${planLabel}.`} icon={Sparkles} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Longueur des snippets</CardTitle>
            <CardDescription>Lecture rapide des blocs les plus fournis.</CardDescription>
          </CardHeader>
          <CardContent>
            {contentData.length ? <SnippetContentChart data={contentData} /> : <EmptyChart label="Le volume apparaîtra après l’ajout de contenu." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition par canal</CardTitle>
            <CardDescription>Email, WhatsApp et SMS dans la bibliothèque.</CardDescription>
          </CardHeader>
          <CardContent>
            {channelData.length ? <SnippetChannelChart data={channelData} /> : <EmptyChart label="Aucun snippet créé." height="h-[220px]" />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <SnippetFilters
          search={search}
          sortBy={sortBy}
          channel={channel}
          onSearch={setSearch}
          onSort={(value) => setSortBy(value as SnippetSort)}
          onChannel={setChannel}
        />
        <SnippetTable
          snippets={filtered}
          pending={isPending}
          onPreview={setPreviewSnippet}
          onDelete={setDeleteTarget}
          onCreate={() => setCreateOpen(true)}
        />
      </Card>

      <CreateSnippetDialog open={createOpen} pending={isCreating} state={createState} onOpenChange={setCreateOpen} formAction={formAction} />
      <PreviewSnippetDialog snippet={previewSnippet} onOpenChange={(open) => !open && setPreviewSnippet(null)} />
      <DeleteSnippetDialog snippet={deleteTarget} pending={isPending} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}

function EmptyChart({ label, height = "h-[260px]" }: { label: string; height?: string }) {
  return <div className={`flex ${height} items-center justify-center text-center text-sm text-zinc-500`}>{label}</div>;
}

function SnippetFilters(props: {
  search: string;
  sortBy: SnippetSort;
  channel: string;
  onSearch: (value: string) => void;
  onSort: (value: string) => void;
  onChannel: (value: string) => void;
}) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Bibliothèque</CardTitle>
          <CardDescription>Filtrez par canal, nom, description ou contenu.</CardDescription>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_12rem]">
          <Input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Rechercher..." />
          <Select value={props.sortBy} onValueChange={props.onSort}>
            <SelectTrigger>
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Tabs value={props.channel} onValueChange={props.onChannel}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="ALL">Tous les canaux</TabsTrigger>
          <TabsTrigger value="EMAIL" className="gap-2"><Mail className="h-4 w-4" />Email</TabsTrigger>
          <TabsTrigger value="WHATSAPP" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
        </TabsList>
      </Tabs>
    </CardHeader>
  );
}

function SnippetTable({
  snippets,
  pending,
  onPreview,
  onDelete,
  onCreate,
}: {
  snippets: Snippet[];
  pending: boolean;
  onPreview: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
  onCreate: () => void;
}) {
  return (
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Snippet</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead className="text-right">Mots</TableHead>
            <TableHead className="text-right">Caractères</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {snippets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-zinc-500">
                  <Code className="h-8 w-8 text-zinc-400" />
                  <p className="text-sm">Aucun snippet ne correspond aux filtres.</p>
                  <Button type="button" variant="outline" onClick={onCreate}>
                    <Plus className="h-4 w-4" />
                    Créer un snippet
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : snippets.map((snippet) => (
            <TableRow key={snippet.id}>
              <TableCell>
                <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{snippet.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                  {snippet.description || getPlainText(snippet.htmlContent) || "Aucun contenu enregistré."}
                </p>
              </TableCell>
              <TableCell><ChannelBadge channel={snippet.channel} /></TableCell>
              <TableCell className="text-right font-mono">{formatNumber(getWordCount(snippet))}</TableCell>
              <TableCell className="text-right font-mono">{formatNumber(getCharacterCount(snippet))}</TableCell>
              <TableCell className="text-sm text-zinc-500">{formatDate(snippet.createdAt)}</TableCell>
              <TableCell><SnippetActions snippet={snippet} pending={pending} onPreview={onPreview} onDelete={onDelete} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  );
}

function CreateSnippetDialog({
  open,
  pending,
  state,
  formAction,
  onOpenChange,
}: {
  open: boolean;
  pending: boolean;
  state: ActionState;
  formAction: (payload: FormData) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau snippet</DialogTitle>
          <DialogDescription>Créez un bloc réutilisable, puis éditez son contenu sur la page suivante.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="snippet-name">Nom du snippet</Label>
            <Input id="snippet-name" name="name" required autoFocus placeholder="Signature, relance, introduction..." />
          </div>
          <div className="space-y-3">
            <Label>Canal</Label>
            <RadioGroup name="channel" defaultValue="EMAIL" className="grid grid-cols-1 sm:grid-cols-2">
              <Label htmlFor="snippet-create-email" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <RadioGroupItem id="snippet-create-email" value="EMAIL" />
                <Mail className="h-4 w-4 text-orange-500" />
                Email
              </Label>
              <Label htmlFor="snippet-create-whatsapp" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <RadioGroupItem id="snippet-create-whatsapp" value="WHATSAPP" />
                <MessageCircle className="h-4 w-4 text-orange-500" />
                WhatsApp
              </Label>
            </RadioGroup>
          </div>
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>{pending ? "Création..." : "Créer et éditer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreviewSnippetDialog({ snippet, onOpenChange }: { snippet: Snippet | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!snippet} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{snippet?.name ?? "Prévisualisation"}</DialogTitle>
          <DialogDescription>
            {snippet ? `${channelLabels[snippet.channel]} · ${formatNumber(getCharacterCount(snippet))} caractères` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-[320px] overflow-hidden rounded-lg border bg-zinc-950">
          {snippet ? (
            <iframe
              srcDoc={wrapHtmlForPreview(snippet.htmlContent)}
              sandbox="allow-same-origin"
              title={`Prévisualisation de ${snippet.name}`}
              className="h-[55vh] min-h-[320px] w-full border-0"
            />
          ) : null}
        </div>
        <DialogFooter>
          {snippet ? (
            <Button asChild>
              <Link href={`/dashboard/snippets/${snippet.id}/edit`}>Éditer</Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSnippetDialog({
  snippet,
  pending,
  onOpenChange,
  onConfirm,
}: {
  snippet: Snippet | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!snippet} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce snippet ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action supprimera définitivement {snippet ? `"${snippet.name}"` : "le snippet sélectionné"} de votre bibliothèque.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" disabled={pending} onClick={onConfirm}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
