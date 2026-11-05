# Webhook API

All endpoints require the shared-secret header configured in the matching
n8n Header Auth credential. Requests without it are rejected.

The header name below (`X-Webhook-Secret`) is an example: use whatever name
you configure in the credential.

## `POST /webhook/quiz-results`

Workflow: **Quiz Results Email**

Request: see [`examples/quiz-submission.json`](../examples/quiz-submission.json).

Response `200`:

```json
{
  "ok": true,
  "recommendation": {
    "planName": "Accelerated",
    "planCadence": "2 lessons per week",
    "goalText": "travel and everyday life",
    "focus": "live speaking practice in low-pressure conversation so you stop freezing up",
    "summary": "Based on your answers, Accelerated (2 lessons per week) is the best fit for travel and everyday life — with live speaking practice in low-pressure conversation so you stop freezing up.",
    "plan": { "name": "Accelerated", "weeks": 8, "sessions": 16, "price": "USD 720", "...": "..." }
  }
}
```

Side effects: row in `quiz_submissions`, Brevo contact upserted, results
email sent, Meta CAPI `Lead` event sent.

An invalid or missing email stops the execution before any side effect.

## `GET /webhook/leads-list`

Workflow: **Leads Dashboard Backend**

```bash
curl "$N8N_URL/webhook/leads-list" -H "X-Webhook-Secret: $SECRET"
```

Response `200`:

```json
{
  "submissions": [
    {
      "id": 42,
      "created_at": "2026-11-02T14:03:11.000Z",
      "email": "maria.demo@example.com",
      "recommended_plan": "Accelerated",
      "answers": { "level": "Intermediate", "goal": "Travel & everyday life", "...": "..." },
      "followed_up_at": null
    }
  ]
}
```

## `POST /webhook/leads-send-follow-up`

Workflow: **Leads Dashboard Backend**

```bash
curl -X POST "$N8N_URL/webhook/leads-send-follow-up" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $SECRET" \
  -d '{"id": 42}'
```

| Case | Status | Body |
|---|---|---|
| Lead found, email sent | `200` | `{ "ok": true, "followedUpAt": "2026-11-02T18:00:00.000Z" }` |
| No lead with that id | `404` | `{ "error": "Submission not found" }` |
| `id` missing / not an integer | execution stops with a validation error | — |
