"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, LockKeyhole, MessageSquareText, Send, Settings2, Smartphone, Users } from "lucide-react";

import { createCampaign } from "../campaigns/actions";
import { updateOrangeSmsConfiguration } from "../campaigns/campaign-sending-actions";
import type { ActionState } from "@/types/action-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAX_SMS_CHARACTERS, smsMetrics } from "@/lib/sms";
import { closeReconciliationItem } from "./reconciliation-actions";

// Orange CI's public bundle reference as of July 2026. Billing always follows the signed contract.
const SMS_REFERENCE_COST_PER_SEGMENT_XOF = 7.26;

type SmsMessage = {
  id: string;
  recipientValue: string;
  text: string | null;
  status: "QUEUED" | "PROCESSING" | "RETRYING" | "SUBMISSION_UNKNOWN" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "CANCELLED" | "RECONCILED" | "DUPLICATE_CONFIRMED" | "TEMPLATE_REQUIRED";
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
};

type AdminConfiguration = {
  providerConfigured: boolean;
  enabled: boolean;
  credentialsConfigured: boolean;
  ownerAuthorized: boolean;
  senderAddressConfigured: boolean;
  deliveryReceiptSubscriptionConfirmed: boolean;
  deliveryReceiptCallbackConfigured: boolean;
  deliveryTrackingEnabled: boolean;
  senderAddress: string | null;
  senderName: string | null;
};

type ReconciliationDecision = "NO_FURTHER_ACTION" | "EXTERNAL_FOLLOW_UP" | "DUPLICATE_CONFIRMED";

type ReconciliationItem = {
  id: string;
  resourceType: "external_transport_operation" | "communication_message_sms" | "communication_message";
  status: "FORWARD_UNKNOWN" | "SUBMISSION_UNKNOWN";
  applicationId: string | null;
  applicationName: string | null;
  direction: "INBOUND" | "OUTBOUND" | null;
  operationKey: string | null;
  createdAt: string;
  reviewedAt: string | null;
  decision: ReconciliationDecision | null;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function SmsDashboard({
  providerConfigured,
  deliveryTrackingEnabled,
  phoneContacts,
  queue,
  adminConfiguration,
  reconciliation,
  messages,
}: {
  providerConfigured: boolean;
  deliveryTrackingEnabled: boolean;
  phoneContacts: number;
  queue: { queued: number; processing: number; delivered: number; failed: number };
  adminConfiguration: AdminConfiguration | null;
  reconciliation: ReconciliationItem[] | null;
  messages: SmsMessage[];
}) {
  const [content, setContent] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createCampaign, null);
  const metrics = smsMetrics(content);
  const segments = metrics.segmentCount;
  const estimate = segments * SMS_REFERENCE_COST_PER_SEGMENT_XOF * phoneContacts;
  const queueLabel = queue.queued + queue.processing;

  const health = useMemo(() => {
    if (queue.failed > 0) return { label: "À surveiller", variant: "warning" as const };
    if (!providerConfigured) return { label: "Non configuré", variant: "outline" as const };
    if (!deliveryTrackingEnabled) return { label: "Suivi à configurer", variant: "warning" as const };
    return { label: "Opérationnel", variant: "success" as const };
  }, [deliveryTrackingEnabled, providerConfigured, queue.failed]);

  return (
    <div className="page-stack app-shell-safe">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">SMS</h1><Badge variant={health.variant}>{health.label}</Badge></div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Préparez vos campagnes, suivez la file Orange CI et vérifiez les remises aux destinataires.</p>
        </div>
        <Button asChild variant="outline" className="h-11 gap-2"><Link href="/dashboard/campaigns"><Send className="size-4" />Voir les campagnes</Link></Button>
      </div>

      {!providerConfigured ? (
        <Alert variant="warning">
          <LockKeyhole className="size-4" />
          <AlertTitle>Envoi SMS non configuré</AlertTitle>
          <AlertDescription>Les brouillons restent disponibles. Un administrateur doit terminer la configuration Orange CI avant tout lancement.</AlertDescription>
        </Alert>
      ) : null}

      {providerConfigured && !deliveryTrackingEnabled ? (
        <Alert variant="warning">
          <LockKeyhole className="size-4" />
          <AlertTitle>Suivi de remise non activé</AlertTitle>
          <AlertDescription>Les SMS peuvent être soumis à Orange CI, mais aucune remise n’est annoncée tant que l’abonnement aux accusés et l’URL de rappel ne sont pas confirmés.</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="État des SMS">
        <Metric icon={Clock3} label="Dans la file" value={queueLabel} hint={`${queue.queued} en attente`} />
        <Metric icon={Smartphone} label="En traitement" value={queue.processing} hint="Soumission Orange en cours" />
        <Metric icon={CheckCircle2} label={deliveryTrackingEnabled ? "Remis" : "Remise non confirmée"} value={deliveryTrackingEnabled ? queue.delivered : "-"} hint={deliveryTrackingEnabled ? "Accusés Orange reçus" : "Accusés Orange non activés"} tone={deliveryTrackingEnabled ? "success" : "default"} />
        <Metric icon={AlertTriangle} label="À vérifier" value={queue.failed} hint="Échecs ou statut incertain" tone={queue.failed ? "danger" : "default"} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Composer une campagne SMS</CardTitle>
            <CardDescription>Texte brut uniquement. Les variables de contact telles que {"{{firstName}}"} restent disponibles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="channel" value="SMS" />
              <div className="space-y-2"><Label htmlFor="sms-campaign-name">Nom de la campagne</Label><Input id="sms-campaign-name" name="name" required disabled={pending} placeholder="Ex. Relance juillet" /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3"><Label htmlFor="sms-content">Message</Label><span className="text-xs text-muted-foreground">{metrics.units}/{MAX_SMS_CHARACTERS} unités, {metrics.encoding}</span></div>
                <Textarea id="sms-content" name="content" value={content} onChange={(event) => setContent(event.target.value.slice(0, MAX_SMS_CHARACTERS))} disabled={pending} required maxLength={MAX_SMS_CHARACTERS} placeholder="Votre message SMS..." className="min-h-44 resize-y" />
              </div>
              {state?.error ? <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{state.error}</AlertDescription></Alert> : null}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground"><p>{segments} segment{segments > 1 ? "s" : ""} par destinataire</p><p className="mt-1">Estimation : {formatXof(estimate)} pour {phoneContacts} contact{phoneContacts > 1 ? "s" : ""}</p></div>
                <Button type="submit" disabled={pending || !content.trim()} className="h-11 gap-2"><MessageSquareText className="size-4" />{pending ? "Création..." : "Créer la campagne"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Portée estimée</CardTitle><CardDescription>Audience active disposant d’un numéro mobile.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Contacts SMS</span><Users className="size-4 text-muted-foreground" /></div><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{phoneContacts.toLocaleString("fr-FR")}</p></div>
            <p className="text-sm leading-6 text-muted-foreground">Estimation de référence : 7,26 FCFA par segment, issue des offres publiques Orange CI en juillet 2026. Le tarif facturé reste celui du contrat Orange.</p>
          </CardContent>
        </Card>
      </div>

      {adminConfiguration ? <OrangeConfiguration configuration={adminConfiguration} /> : null}

      {reconciliation ? <MessageReconciliation items={reconciliation} /> : null}

      <Card>
        <CardHeader><CardTitle>Historique des messages</CardTitle><CardDescription>Les 30 derniers SMS, y compris les messages encore en file.</CardDescription></CardHeader>
        <CardContent>
          {messages.length === 0 ? <EmptyHistory /> : <MessageHistory messages={messages} deliveryTrackingEnabled={deliveryTrackingEnabled} />}
        </CardContent>
      </Card>
    </div>
  );
}

const reconciliationDecisionLabels: Record<ReconciliationDecision, string> = {
  NO_FURTHER_ACTION: "Vérifié, aucune action complémentaire",
  EXTERNAL_FOLLOW_UP: "Suivi externe requis",
  DUPLICATE_CONFIRMED: "Doublon confirmé",
};

function MessageReconciliation({ items }: { items: ReconciliationItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" /><CardTitle>Réconciliation des envois</CardTitle><Badge variant="outline">Administration</Badge></div>
        <CardDescription>Événements dont l’issue est incertaine. La clôture consigne une décision humaine et ne renvoie jamais de message.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? <EmptyReconciliation /> : <ReconciliationTable items={items} />}
      </CardContent>
    </Card>
  );
}

function ReconciliationTable({ items }: { items: ReconciliationItem[] }) {
  return <div className="overflow-x-auto"><Table className="min-w-[680px]"><TableHeader><TableRow><TableHead>Flux</TableHead><TableHead>État</TableHead><TableHead>Reçu</TableHead><TableHead>Décision humaine</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={`${item.resourceType}:${item.id}`}><TableCell className="text-sm">{reconciliationFlowLabel(item)}</TableCell><TableCell><Badge variant="warning">{item.status === "FORWARD_UNKNOWN" ? "Transfert à vérifier" : "Soumission à vérifier"}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{dateFormatter.format(new Date(item.createdAt))}</TableCell><TableCell className="text-sm">{item.decision ? <div><p>{reconciliationDecisionLabels[item.decision]}</p><p className="mt-1 text-xs text-muted-foreground">Clôturé le {item.reviewedAt ? dateFormatter.format(new Date(item.reviewedAt)) : ""}</p></div> : <span className="text-muted-foreground">À examiner</span>}</TableCell><TableCell className="text-right"><ReconciliationDecisionDialog item={item} /></TableCell></TableRow>)}</TableBody></Table></div>;
}

function reconciliationFlowLabel(item: ReconciliationItem) {
  if (item.resourceType === "communication_message_sms") return "SMS Orange";
  if (item.resourceType === "communication_message") return "Message API";
  const direction = item.direction === "INBOUND" ? "entrant" : "sortant";
  return `${item.applicationName ?? "Application cliente"} · ${direction}${item.operationKey ? ` · ${item.operationKey}` : ""}`;
}

function ReconciliationDecisionDialog({ item }: { item: ReconciliationItem }) {
  const [decision, setDecision] = useState<ReconciliationDecision>(item.decision ?? "NO_FURTHER_ACTION");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(closeReconciliationItem, null);
  const actionLabel = item.decision ? "Mettre à jour" : "Clôturer";

  return <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="outline" className="h-11" disabled={pending}>{actionLabel}</Button></AlertDialogTrigger><AlertDialogContent><form action={formAction} className="space-y-4"><input type="hidden" name="resourceId" value={item.id} /><input type="hidden" name="resourceType" value={item.resourceType} />{item.applicationId ? <input type="hidden" name="applicationId" value={item.applicationId} /> : null}<input type="hidden" name="decision" value={decision} /><AlertDialogHeader><AlertDialogTitle>Clôturer l’examen manuel ?</AlertDialogTitle><AlertDialogDescription>Cette décision est ajoutée au journal d’audit. Aucun message ne sera renvoyé et l’état technique restera inchangé.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor={`decision-${item.id}`}>Décision</Label><Select value={decision} onValueChange={(value) => setDecision(value as ReconciliationDecision)} disabled={pending}><SelectTrigger id={`decision-${item.id}`} className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NO_FURTHER_ACTION">Vérifié, aucune action complémentaire</SelectItem><SelectItem value="EXTERNAL_FOLLOW_UP">Suivi externe requis</SelectItem><SelectItem value="DUPLICATE_CONFIRMED">Doublon confirmé</SelectItem></SelectContent></Select></div>{state?.error ? <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{state.error}</AlertDescription></Alert> : null}{state?.success ? <Alert><CheckCircle2 className="size-4" /><AlertDescription>Décision enregistrée.</AlertDescription></Alert> : null}<AlertDialogFooter><AlertDialogCancel type="button" disabled={pending}>Annuler</AlertDialogCancel><Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Confirmer la clôture"}</Button></AlertDialogFooter></form></AlertDialogContent></AlertDialog>;
}

function EmptyReconciliation() {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center"><div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><ClipboardCheck className="size-4" /></div><div><p className="font-medium">Aucun état incertain</p><p className="mt-1 text-sm text-muted-foreground">Aucun envoi ou transfert d’application cliente ne nécessite de décision humaine.</p></div></div>;
}

function Metric({ icon: Icon, label, value, hint, tone = "default" }: { icon: typeof Clock3; label: string; value: number | string; hint: string; tone?: "default" | "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-600 dark:text-emerald-400" : tone === "danger" ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><Icon className={`size-4 ${color}`} /></div><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{value.toLocaleString("fr-FR")}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></CardContent></Card>;
}

function OrangeConfiguration({ configuration }: { configuration: AdminConfiguration }) {
  const [enabled, setEnabled] = useState(configuration.enabled);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateOrangeSmsConfiguration, null);
  const items = [
    { label: "Canal Orange CI", ok: configuration.providerConfigured, detail: configuration.providerConfigured ? "Activé pour l’organisation" : "Désactivé" },
    { label: "Identifiants serveur", ok: configuration.credentialsConfigured, detail: configuration.credentialsConfigured ? "Présents côté serveur" : "Variables manquantes" },
    { label: "Autorisation du compte", ok: configuration.ownerAuthorized, detail: configuration.ownerAuthorized ? "Organisation autorisée" : "Organisation non autorisée" },
    { label: "Adresse expéditeur", ok: configuration.senderAddressConfigured, detail: configuration.senderAddressConfigured ? "Adresse de déploiement autorisée" : "Adresse absente, invalide ou non concordante" },
    { label: "Abonnement aux accusés", ok: configuration.deliveryReceiptSubscriptionConfirmed, detail: configuration.deliveryReceiptSubscriptionConfirmed ? "Confirmation de configuration enregistrée" : "Confirmation de configuration requise" },
    { label: "URL de rappel", ok: configuration.deliveryReceiptCallbackConfigured, detail: configuration.deliveryReceiptCallbackConfigured ? "URL HTTPS et jeton vérifiés" : "URL HTTPS ou jeton invalide" },
  ];
  return <Card><CardHeader><div className="flex items-center gap-2"><Settings2 className="size-4 text-muted-foreground" /><CardTitle>Configuration Orange CI</CardTitle><Badge variant={configuration.deliveryTrackingEnabled ? "success" : "warning"}>{configuration.deliveryTrackingEnabled ? "Suivi actif" : "Suivi bloqué"}</Badge></div><CardDescription>Les identifiants et le jeton Orange restent côté serveur et ne sont jamais affichés ici.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 md:grid-cols-3">{items.map((item) => <div key={item.label} className="rounded-lg border bg-muted/30 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{item.label}</span><Badge variant={item.ok ? "success" : "warning"}>{item.ok ? "OK" : "À faire"}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{item.detail}</p></div>)}</div><form action={formAction} className="grid gap-4 border-t pt-5 md:grid-cols-[minmax(0,1fr)_auto]"><input type="hidden" name="enabled" value={enabled ? "on" : "off"} /><div className="space-y-2"><Label htmlFor="orange-sender-name">Nom expéditeur</Label><Input id="orange-sender-name" name="senderName" required maxLength={11} defaultValue={configuration.senderName ?? "MailPulse"} placeholder="MailPulse" disabled={pending} /><p className="text-xs text-muted-foreground">Adresse Orange CI issue de la configuration de déploiement, jamais une valeur de démonstration.</p></div><div className="flex flex-wrap items-end gap-3"><div className="flex h-11 items-center gap-2"><Switch id="orange-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={pending} /><Label htmlFor="orange-enabled">Activer</Label></div><Button type="submit" variant="outline" className="h-11" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button></div>{state?.error ? <p className="text-sm text-destructive md:col-span-2">{state.error}</p> : null}{state?.success ? <p className="text-sm text-emerald-700 dark:text-emerald-400 md:col-span-2">Configuration Orange CI enregistrée.</p> : null}</form></CardContent></Card>;
}

function MessageHistory({ messages, deliveryTrackingEnabled }: { messages: SmsMessage[]; deliveryTrackingEnabled: boolean }) {
  return <div className="overflow-x-auto"><Table className="min-w-[720px]"><TableHeader><TableRow><TableHead>Destinataire</TableHead><TableHead>Message</TableHead><TableHead>Statut</TableHead><TableHead>Créé</TableHead></TableRow></TableHeader><TableBody>{messages.map((message) => <TableRow key={message.id}><TableCell className="font-mono text-xs">{message.recipientValue}</TableCell><TableCell className="max-w-sm"><p className="line-clamp-2 text-sm">{message.text || "Message sans texte"}</p>{message.errorMessage ? <p className="mt-1 line-clamp-1 text-xs text-red-600 dark:text-red-400">{message.errorMessage}</p> : null}</TableCell><TableCell><StatusBadge status={message.status} deliveryTrackingEnabled={deliveryTrackingEnabled} /></TableCell><TableCell className="text-sm text-muted-foreground">{dateFormatter.format(new Date(message.createdAt))}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function EmptyHistory() {
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Smartphone className="size-4" /></div><div><p className="font-medium">Aucun SMS envoyé</p><p className="mt-1 text-sm text-muted-foreground">Créez une campagne pour alimenter cet historique.</p></div></div>;
}

function StatusBadge({ status, deliveryTrackingEnabled }: { status: SmsMessage["status"]; deliveryTrackingEnabled: boolean }) {
  const variants: Record<SmsMessage["status"], "outline" | "warning" | "success" | "destructive" | "secondary"> = { QUEUED: "outline", PROCESSING: "warning", RETRYING: "warning", SUBMISSION_UNKNOWN: "warning", SENT: "secondary", DELIVERED: "success", READ: "success", FAILED: "destructive", CANCELLED: "secondary", TEMPLATE_REQUIRED: "destructive", RECONCILED: "secondary", DUPLICATE_CONFIRMED: "secondary" };
  const labels: Record<SmsMessage["status"], string> = { QUEUED: "En attente", PROCESSING: "En traitement", RETRYING: "Nouvel essai", SUBMISSION_UNKNOWN: "À vérifier", SENT: "Envoyé", DELIVERED: deliveryTrackingEnabled ? "Remis" : "Remise non confirmée", READ: deliveryTrackingEnabled ? "Lu" : "Lecture non confirmée", FAILED: "Échec", CANCELLED: "Annulé", TEMPLATE_REQUIRED: "Modèle requis", RECONCILED: "Réconcilié", DUPLICATE_CONFIRMED: "Doublon confirmé" };
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}

function formatXof(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}
