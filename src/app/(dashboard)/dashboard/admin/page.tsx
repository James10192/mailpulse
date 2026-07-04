import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Building2,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
});

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

function formatXof(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function feedbackVariant(status: string) {
  if (status === "DONE") return "success" as const;
  if (status === "IN_PROGRESS") return "warning" as const;
  if (status === "DISMISSED") return "secondary" as const;
  return "default" as const;
}

function paymentVariant(status: string) {
  if (status === "SUCCESS") return "success" as const;
  if (status === "FAILED") return "destructive" as const;
  if (status === "ABANDONED") return "secondary" as const;
  return "warning" as const;
}

function planVariant(plan: string) {
  if (plan === "FREE") return "secondary" as const;
  if (plan === "ENTERPRISE") return "outline" as const;
  return "default" as const;
}

function priorityVariant(priority: string) {
  if (priority === "HIGH") return "destructive" as const;
  if (priority === "MEDIUM") return "warning" as const;
  return "secondary" as const;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const { user, isAdmin } = await getCurrentUserAndOrg();
  if (!user) redirect("/login");
  if (!isAdmin) redirect("/dashboard");

  const [
    users,
    organizations,
    feedbacks,
    payments,
    failedMessagesCount,
    failedWebhookCount,
    activeCampaignsCount,
    activeAutomationsCount,
    planGroups,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        members: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, plan: true, createdAt: true },
            },
          },
        },
      },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        _count: {
          select: {
            members: true,
            contacts: true,
            campaigns: true,
            automations: true,
            messages: true,
            feedback: true,
          },
        },
      },
    }),
    prisma.feedback.findMany({
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { organization: { select: { name: true, slug: true } } },
    }),
    prisma.billingPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { organization: { select: { name: true, slug: true } } },
    }),
    prisma.communicationMessage.count({
      where: { status: { in: ["FAILED", "TEMPLATE_REQUIRED"] } },
    }),
    prisma.webhookDelivery.count({
      where: { status: { in: ["FAILED", "RETRYING"] } },
    }),
    prisma.campaign.count({
      where: { status: { in: ["SENDING", "SCHEDULED"] } },
    }),
    prisma.automation.count({
      where: { status: "ACTIVE" },
    }),
    prisma.organization.groupBy({
      by: ["plan"],
      _count: { _all: true },
    }),
  ]);

  const successfulPayments = payments.filter((payment) => payment.status === "SUCCESS");
  const pendingPayments = payments.filter((payment) => payment.status === "PENDING");
  const failedPayments = payments.filter((payment) => payment.status === "FAILED");
  const revenue = successfulPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const openFeedbacks = feedbacks.filter((feedback) => feedback.status !== "DONE" && feedback.status !== "DISMISSED");
  const highPriorityFeedbacks = feedbacks.filter((feedback) => feedback.priority === "HIGH" && feedback.status !== "DONE");
  const payingOrgs = organizations.filter((organization) => organization.plan !== "FREE").length;
  const totalContacts = organizations.reduce((sum, organization) => sum + organization._count.contacts, 0);
  const totalMessages = organizations.reduce((sum, organization) => sum + organization._count.messages, 0);
  const planDistribution = planGroups
    .map((group) => `${group.plan}: ${formatNumber(group._count._all)}`)
    .join(" · ");

  return (
    <div className="page-stack app-shell-safe">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Administration" }]} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Administration SaaS</h1>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="size-3" />
            Admin
          </Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Console interne pour piloter les tenants, la facturation, les incidents et les retours utilisateurs MailPulse.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={formatNumber(users.length)} hint="Comptes récents chargés" icon={Users} />
        <StatCard label="Tenants" value={formatNumber(organizations.length)} hint={`${payingOrgs} payants · ${planDistribution || "aucun plan"}`} icon={Building2} />
        <StatCard label="MRR encaissé" value={formatXof(revenue)} hint={`${pendingPayments.length} paiement(s) en attente`} icon={CreditCard} />
        <StatCard label="Feedbacks ouverts" value={formatNumber(openFeedbacks.length)} hint={`${highPriorityFeedbacks.length} haute priorité`} icon={MessageSquare} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Santé opérationnelle</CardTitle>
            <CardDescription>Signaux à regarder avant qu’ils deviennent du support.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HealthItem label="Messages en erreur" value={failedMessagesCount} danger={failedMessagesCount > 0} />
            <HealthItem label="Webhooks en échec" value={failedWebhookCount} danger={failedWebhookCount > 0} />
            <HealthItem label="Campagnes actives" value={activeCampaignsCount} />
            <HealthItem label="Automations actives" value={activeAutomationsCount} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backlog prioritaire</CardTitle>
            <CardDescription>Retours haute priorité non clôturés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highPriorityFeedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun retour critique ouvert.</p>
            ) : (
              highPriorityFeedbacks.slice(0, 4).map((feedback) => (
                <div key={feedback.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={feedbackVariant(feedback.status)}>{feedback.status}</Badge>
                    <span className="text-xs text-muted-foreground">{shortDateFormatter.format(feedback.createdAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">{feedback.message}</p>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{feedback.context ?? "Sans page"}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="feedback">Feedbacks</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="organizations">Tenants</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle>Feedbacks utilisateurs</CardTitle>
              <CardDescription>Message complet, contexte de page, terminal utilisateur et tenant concerné.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Contexte</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Reçu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.length === 0 ? (
                    <EmptyRow colSpan={7} label="Aucun feedback reçu." />
                  ) : (
                    feedbacks.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell>
                          <Badge variant={priorityVariant(feedback.priority)}>{feedback.priority}</Badge>
                        </TableCell>
                        <TableCell>{feedback.type}</TableCell>
                        <TableCell className="max-w-[12rem] truncate">{feedback.organization.name}</TableCell>
                        <TableCell className="max-w-sm">
                          <p className="line-clamp-2">{feedback.message}</p>
                          {feedback.canContactBack ? (
                            <p className="mt-1 text-xs text-muted-foreground">Recontact autorisé</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-xs">{feedback.context ?? "Sans page"}</TableCell>
                        <TableCell>
                          <Badge variant={feedbackVariant(feedback.status)}>{feedback.status}</Badge>
                        </TableCell>
                        <TableCell>{dateFormatter.format(feedback.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Paiements Paystack</CardTitle>
              <CardDescription>Transactions créées depuis la page billing MailPulse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Succès" value={successfulPayments.length} hint={formatXof(revenue)} />
                <MiniMetric label="En attente" value={pendingPayments.length} hint="À vérifier côté Paystack" />
                <MiniMetric label="Échecs" value={failedPayments.length} hint="À relancer ou investiguer" danger={failedPayments.length > 0} />
              </div>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <EmptyRow colSpan={6} label="Aucun paiement Paystack." />
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.organization.name}</TableCell>
                        <TableCell>{payment.plan}</TableCell>
                        <TableCell>{formatXof(payment.amount)}</TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-xs">{payment.reference}</TableCell>
                        <TableCell>
                          <Badge variant={paymentVariant(payment.status)}>{payment.status}</Badge>
                        </TableCell>
                        <TableCell>{dateFormatter.format(payment.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Tenants</CardTitle>
              <CardDescription>Vue cross-tenant avec volumétrie, plan et activité.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Membres</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Campagnes</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Feedbacks</TableHead>
                    <TableHead>Créée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((organization) => (
                    <TableRow key={organization.id}>
                      <TableCell>
                        <div className="font-medium">{organization.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{organization.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={planVariant(organization.plan)}>{organization.plan}</Badge>
                      </TableCell>
                      <TableCell>{organization._count.members}</TableCell>
                      <TableCell>{formatNumber(organization._count.contacts)}</TableCell>
                      <TableCell>{formatNumber(organization._count.campaigns)}</TableCell>
                      <TableCell>{formatNumber(organization._count.messages)}</TableCell>
                      <TableCell>{formatNumber(organization._count.feedback)}</TableCell>
                      <TableCell>{shortDateFormatter.format(organization.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniMetric label="Contacts total" value={formatNumber(totalContacts)} hint="Toutes organisations" />
                <MiniMetric label="Messages total" value={formatNumber(totalMessages)} hint="Communication Platform" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>Comptes récents, rôle et tenant principal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Inscription</TableHead>
                    <TableHead>Email vérifié</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((account) => {
                    const member = account.members[0];
                    const organization = member?.organization;

                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="font-medium">{account.name}</div>
                          <div className="text-xs text-muted-foreground">{account.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member?.role === "admin" ? "default" : "secondary"}>
                            {member?.role ?? "sans rôle"}
                          </Badge>
                        </TableCell>
                        <TableCell>{organization?.name ?? "Aucune"}</TableCell>
                        <TableCell>{organization ? <Badge variant={planVariant(organization.plan)}>{organization.plan}</Badge> : null}</TableCell>
                        <TableCell>{shortDateFormatter.format(account.createdAt)}</TableCell>
                        <TableCell>{account.emailVerified ? "Oui" : "Non"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Incidents et signaux faibles</CardTitle>
              <CardDescription>Vue de triage pour éviter de dépendre uniquement des logs Vercel.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <IncidentCard
                title="Messages fournisseur"
                count={failedMessagesCount}
                description="Messages FAILED ou TEMPLATE_REQUIRED à investiguer."
              />
              <IncidentCard
                title="Webhooks"
                count={failedWebhookCount}
                description="Livraisons FAILED ou RETRYING côté endpoints client."
              />
              <IncidentCard
                title="Paiements"
                count={failedPayments.length}
                description="Paiements Paystack en échec ou non finalisés."
              />
              <IncidentCard
                title="Feedback haute priorité"
                count={highPriorityFeedbacks.length}
                description="Retours utilisateurs marqués HIGH et non clôturés."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HealthItem({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {danger ? <AlertTriangle className="size-4 text-red-500" /> : <Activity className="size-4 text-muted-foreground" />}
      </div>
      <p className="mt-2 font-mono text-xl font-semibold">{formatNumber(value)}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  hint,
  danger = false,
}: {
  label: string;
  value: string | number;
  hint: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={danger ? "mt-1 font-mono text-xl font-semibold text-red-600" : "mt-1 font-mono text-xl font-semibold"}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function IncidentCard({ title, count, description }: { title: string; count: number; description: string }) {
  const danger = count > 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={danger ? "destructive" : "secondary"}>{formatNumber(count)}</Badge>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}
