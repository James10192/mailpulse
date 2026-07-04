export type ApiMessageDetail = {
  id: string;
  channel: string;
  direction: string;
  recipient: { type: string; value: string };
  content: {
    type: string;
    text: string | null;
    template_key: string | null;
    locale: string | null;
    variables: unknown;
  };
  status: string;
  metadata: unknown;
  external_user_id: string | null;
  external_event_id: string | null;
  external_tenant_id: string | null;
  idempotency_key: string | null;
  conversation_id: string | null;
  contact_id: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  contact: {
    email: string;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  template: {
    key: string;
    name: string;
    provider_template_id: string | null;
  } | null;
  webhook_deliveries: {
    id: string;
    endpoint_name: string;
    event_type: string;
    status: string;
    attempts: number;
    last_error: string | null;
    delivered_at: string | null;
  }[];
};
