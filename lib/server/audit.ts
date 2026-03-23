import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AuditPayload = {
  actorId?: string | null
  action: string
  entityType: string
  entityId: string
  before?: unknown
  after?: unknown
}

export async function logAudit(payload: AuditPayload) {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: payload.actorId ?? null,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      before: payload.before ?? null,
      after: payload.after ?? null,
    })
  } catch (e) {
    console.error('Audit log failed', e)
  }
}
