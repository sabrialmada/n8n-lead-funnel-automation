// n8n Code node — "Compute Recommendation & Email"
// Workflow: Quiz Results Email
// Mode: Run Once for All Items
//
// Validates the incoming quiz submission, picks the best-fit lesson plan from
// the answers, renders a personalized HTML results email, and prepares the CRM
// contact attributes. Everything downstream reads from this node's output.

// ---------------------------------------------------------------------------
// Brand / link configuration — replace with your own values when deploying.
// ---------------------------------------------------------------------------
const BRAND = {
  name: 'Lingua Studio',
  tutorName: 'Lucía',
  tagline: 'Online Spanish lessons for adults',
  logoUrl: 'https://www.example.com/logo-email.png',
  plansUrl: 'https://www.example.com/pricing',
  bookingUrl: 'https://cal.com/your-handle/trial-lesson',
  whatsappUrl: 'https://wa.me/10000000000',
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const body = ($input.first().json.body) || $input.first().json || {};
const email = body.email;
const answers = body.answers || {};

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

if (!isValidEmail(email)) {
  throw new Error('A valid email is required');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalizeFirst(text) {
  const value = String(text || '').trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

// ---------------------------------------------------------------------------
// Recommendation rules
// ---------------------------------------------------------------------------
const PRICING_PLANS = [
  { rhythm: '1 lesson per week', name: 'Steady', weeks: 12, cadence: '1 lesson per week', sessions: 12, price: 'USD 480', label: 'Flexible pace' },
  { rhythm: '2 lessons per week', name: 'Accelerated', weeks: 8, cadence: '2 lessons per week', sessions: 16, price: 'USD 720', label: 'Most popular', popular: true },
  { rhythm: '3+ lessons per week', name: 'Intensive', weeks: 8, cadence: '3 lessons per week', sessions: 24, price: 'USD 1,050', label: 'Fast track' },
];
const DEFAULT_PLAN = PRICING_PLANS[1];

const FOCUS_BY_STRUGGLE = {
  'Speaking without freezing': 'live speaking practice in low-pressure conversation so you stop freezing up',
  'Understanding native speakers': 'listening practice with natural, native-speed Spanish',
  Grammar: 'grammar explained clearly and reinforced through real conversation, not worksheets',
  Vocabulary: 'vocabulary built around the topics and situations you actually care about',
  Pronunciation: 'focused pronunciation coaching so you feel confident speaking out loud',
  'Confidence when speaking': 'consistent, judgment-free speaking practice to build real confidence',
};
const DEFAULT_FOCUS = 'a mix of conversation, grammar, and listening practice tailored to you';

const GOAL_TEXT = {
  'Travel & everyday life': 'travel and everyday life',
  'Work & business': 'work and professional situations',
  'Moving to a Spanish-speaking country': 'moving to a Spanish-speaking country',
  'Relationships / family': 'connecting with family and loved ones',
  'Speak confidently in conversations': 'speaking confidently in everyday conversations',
};
const DEFAULT_GOAL_TEXT = 'your goals';

function getRecommendation(answers) {
  const plan = PRICING_PLANS.find((candidate) => candidate.rhythm === answers.rhythm) || DEFAULT_PLAN;
  const focus = FOCUS_BY_STRUGGLE[answers.struggle] || DEFAULT_FOCUS;
  const goalText = answers.goal === 'Other'
    ? (answers.goalOther || '').trim() || DEFAULT_GOAL_TEXT
    : GOAL_TEXT[answers.goal] || DEFAULT_GOAL_TEXT;
  const summary = `Based on your answers, ${plan.name} (${plan.cadence}) is the best fit for ${goalText} — with ${focus}.`;
  return { plan, planName: plan.name, planCadence: plan.cadence, goalText, focus, summary };
}

const recommendation = getRecommendation(answers);

const PLAN_FEATURES = (plan) => [
  `${plan.sessions} × 60-minute private lessons`,
  plan.cadence,
  'Personalized study plan',
  'Materials + practice',
  'Flexible scheduling / reschedule anytime',
  'Lesson recordings or notes after each class',
  `Direct chat access with ${BRAND.tutorName} between lessons`,
];

// ---------------------------------------------------------------------------
// Email template (table-based layout for Gmail/Outlook compatibility)
// ---------------------------------------------------------------------------
function buildEmailHtml({ recommendation, answers }) {
  const { plan } = recommendation;
  const level = escapeHtml(answers?.level || '—');
  const mainGoal = escapeHtml(capitalizeFirst(recommendation.goalText));
  const struggle = escapeHtml(answers?.struggle || '—');
  const rhythm = escapeHtml(answers?.rhythm || plan.cadence);
  const successText = escapeHtml((answers?.successText || '').trim());
  const summary = escapeHtml(recommendation.summary);

  const statCell = (label, value) => `
    <td class="stat-col" width="50%" valign="top" style="padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" style="background:#f5f7fb;border:1px solid #dde3ec;border-radius:12px;padding:14px 16px;">
            <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#6b7785;">${label}</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;color:#1f2a37;">${value}</p>
          </td>
        </tr>
      </table>
    </td>`;

  const featureRow = (text) => `
    <tr>
      <td style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3b4654;">
        <span style="color:#2f6f5c;font-weight:800;margin-right:8px;">&#10003;</span>${escapeHtml(text)}
      </td>
    </tr>`;

  const successBlock = successText
    ? `
      <tr>
        <td style="padding:0 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef3fb;border-left:3px solid #4a6fa5;border-radius:8px;">
            <tr>
              <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3b4654;font-style:italic;">
                "${successText}"
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your personalized Spanish plan</title>
    <style>
      @media only screen and (max-width: 480px) {
        .stat-col {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef1f5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${summary}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;">

            <tr>
              <td style="background:#f8fafc;padding:20px 32px;" align="center">
                <img src="${BRAND.logoUrl}" width="150" alt="${escapeHtml(BRAND.name)}" style="display:block;width:150px;max-width:60%;height:auto;border:0;" />
              </td>
            </tr>

            <tr>
              <td style="background:#eef3fb;padding:36px 32px 28px;">
                <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:#4a6fa5;">Your results are in</p>
                <h1 style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:800;color:#1f2a37;">Your personalized Spanish plan is ready</h1>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3b4654;">${summary}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#6b7785;">Your answers</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    ${statCell('Current level', level)}
                    ${statCell('Main goal', mainGoal)}
                  </tr>
                  <tr>
                    ${statCell('Biggest challenge', struggle)}
                    ${statCell('Frequency', rhythm)}
                  </tr>
                </table>
              </td>
            </tr>

            ${successBlock}

            <tr>
              <td style="padding:12px 32px 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid #4a6fa5;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="background:#4a6fa5;padding:10px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-align:center;">
                      Recommended for you
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px 24px 8px;text-align:center;">
                      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:0.03em;text-transform:uppercase;color:#1f2a37;">${escapeHtml(plan.name)} plan</p>
                      <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#6b7785;">${plan.weeks}-week program</p>
                      <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:800;color:#1f2a37;">${escapeHtml(plan.price)} <span style="font-size:14px;font-weight:600;color:#6b7785;">total</span></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 26px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        ${PLAN_FEATURES(plan).map(featureRow).join('')}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 26px;" align="center">
                      <a href="${BRAND.bookingUrl}" style="display:inline-block;background:#4a6fa5;color:#ffffff;padding:14px 30px;border-radius:999px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:15px;">
                        Book your trial lesson
                      </a>
                      <br />
                      <a href="${BRAND.plansUrl}" style="display:inline-block;margin-top:14px;color:#4a6fa5;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:15px;">
                        View more plans
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 8px;" align="center">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7785;">
                  Have any question? Message me on
                  <a href="${BRAND.whatsappUrl}" style="color:#4a6fa5;font-weight:700;text-decoration:none;">WhatsApp</a>
                  or just reply to this email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 32px;border-top:1px solid #dde3ec;margin-top:20px;">
                <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2a37;">
                  Talk soon,<br /><strong>${escapeHtml(BRAND.tutorName)}</strong>
                </p>
                <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9aa5b1;">
                  ${escapeHtml(BRAND.name)} · ${escapeHtml(BRAND.tagline)}
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const emailHtml = buildEmailHtml({ recommendation, answers });

// ---------------------------------------------------------------------------
// CRM attributes (Brevo contact fields)
// ---------------------------------------------------------------------------
const brevoAttributes = {
  GOAL: answers.goal === 'Other' ? answers.goalOther : answers.goal,
  LEVEL: answers.level,
  STRUGGLE: answers.struggle,
  TIMELINE: answers.timeline,
  RHYTHM: answers.rhythm,
  SUCCESS_TEXT: answers.successText,
  AVAILABILITY_DAYS: ((answers.availability && answers.availability.days) || []).join(', '),
  AVAILABILITY_TIMES: ((answers.availability && answers.availability.times) || []).join(', '),
  RECOMMENDED_PLAN: recommendation.planName,
};

return [{
  json: {
    email,
    answers,
    answersJson: JSON.stringify(answers),
    recommendation,
    emailHtml,
    brevoAttributes,
  },
}];
