import {
  DEMO_CITIZENS,
  DEMO_SERVICES,
  DEMO_STAFF,
  DEMO_REQUESTS,
  DEMO_DOCUMENTS,
  DEMO_PAYMENTS,
  DEMO_DISCLAIMER,
} from './data.js';
import specimenPdf from '../assets/specimen-demo.pdf?url';

/**
 * Offline demo backend.
 *
 * A custom axios adapter, so the whole app keeps calling `apiClient` exactly as it
 * does against the real API — no component knows the difference. Enabled only when
 * VITE_DEMO_MODE is set, which is what the GitHub Pages build does; a local `npm
 * run dev` still talks to Express.
 *
 * This is a FAÇADE, not a reimplementation. It returns plausible shapes so the UI
 * can be explored; it does not enforce the state machine, RBAC or payment rules.
 * Those live server-side and are the parts that actually matter — which is why the
 * hosted demo says so on every screen.
 */

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/** Mutable copies, so actions taken during a session persist until reload. */
let requests = structuredClone(DEMO_REQUESTS);
let documents = structuredClone(DEMO_DOCUMENTS);
const payments = structuredClone(DEMO_PAYMENTS);

const serviceById = (id) => DEMO_SERVICES.find((s) => s._id === id);
const citizenById = (id) => DEMO_CITIZENS.find((c) => c.id === id);

/** Expands the ids the real API populates, so components find what they expect. */
function expand(request) {
  return {
    ...request,
    serviceId: serviceById(request.serviceId) ?? request.serviceId,
    citizenId: citizenById(request.citizenId) ?? request.citizenId,
  };
}

function ok(data, status = 200) {
  return { status, data };
}

function fail(status, code, message) {
  const error = new Error(message);
  error.response = { status, data: { error: { code, message } } };
  return error;
}

/** Base64url, so the token looks like the real thing without pretending to be signed. */
function fakeToken(payload) {
  return `demo.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.unsigned`;
}

function decodeToken(auth = '') {
  try {
    return JSON.parse(atob(auth.replace('Bearer demo.', '').replace('.unsigned', '')));
  } catch {
    return null;
  }
}

const nowIso = () => new Date().toISOString();

/**
 * Table of handlers: [method, RegExp, fn]. First match wins.
 *
 * Every pattern is anchored with ^. Without it `/\/requests$/` also matches
 * `/staff/requests`, and the agent inbox silently gets served the citizen's own
 * list — the sort of bug that looks like working software right up until a demo.
 */
const routes = [
  // ---- Citizen auth -------------------------------------------------------
  ['POST', /^\/auth\/otp\/request$/, (req) => {
    const citizen = DEMO_CITIZENS.find((c) => c.nina === req.body?.nina);
    return ok({
      challengeIssued: true,
      identity: citizen
        ? {
            nina: citizen.nina,
            firstName: citizen.firstName,
            lastName: citizen.lastName,
            phoneMasked: `${citizen.phone.slice(0, 4)} •• •• ${citizen.phone.slice(-4, -2)} ${citizen.phone.slice(-2)}`,
          }
        : null,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      // Fixed in the demo so a visitor never has to hunt for a code.
      devCode: '000000',
    });
  }],

  ['POST', /^\/auth\/otp\/verify$/, (req) => {
    const citizen = DEMO_CITIZENS.find((c) => c.nina === req.body?.nina);
    if (!citizen) throw fail(400, 'OTP_NOT_FOUND', 'Aucune demande de code en cours');

    return ok({
      token: fakeToken({ sub: citizen.id, role: 'CITIZEN', nina: citizen.nina }),
      citizen: {
        id: citizen.id,
        nina: citizen.nina,
        firstName: citizen.firstName,
        lastName: citizen.lastName,
        isDiaspora: citizen.isDiaspora,
      },
    });
  }],

  ['GET', /^\/auth\/me$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const citizen = citizenById(session?.sub) ?? DEMO_CITIZENS[0];
    return ok({ citizen });
  }],

  // ---- Catalogue ----------------------------------------------------------
  ['GET', /^\/services\/modules$/, () =>
    ok({
      modules: ['identity', 'lifeEvents', 'mobility', 'land'].map((moduleKey) => {
        const inModule = DEMO_SERVICES.filter((s) => s.moduleKey === moduleKey);
        return { moduleKey, serviceCount: inModule.length, partner: inModule[0]?.partner ?? null };
      }),
    })],

  ['GET', /^\/services\/([^/?]+)$/, (req, [, code]) => {
    const service = DEMO_SERVICES.find((s) => s.code === code);
    if (!service) throw fail(404, 'SERVICE_NOT_FOUND', 'Service introuvable');
    return ok({ service });
  }],

  ['GET', /^\/services(\?.*)?$/, (req) => {
    const moduleKey = new URLSearchParams(req.url.split('?')[1] ?? '').get('moduleKey');
    return ok({
      services: moduleKey ? DEMO_SERVICES.filter((s) => s.moduleKey === moduleKey) : DEMO_SERVICES,
    });
  }],

  // ---- Citizen requests ---------------------------------------------------
  ['POST', /^\/requests$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const service = serviceById(req.body?.serviceId);
    if (!service) throw fail(404, 'SERVICE_NOT_FOUND', 'Service introuvable');

    const created = {
      _id: `r-new-${requests.length + 1}`,
      reference: `ECV-2026-${String(200 + requests.length).padStart(6, '0')}`,
      citizenId: session?.sub ?? 'c1',
      serviceId: service._id,
      moduleKey: service.moduleKey,
      status: 'DRAFT',
      amountDue: service.fee,
      currency: 'XOF',
      formData: req.body?.formData ?? {},
      delivery: { mode: 'DIGITAL' },
      attachments: [],
      createdAt: nowIso(),
      timeline: [{ to: 'DRAFT', at: nowIso(), actorRole: 'CITIZEN' }],
    };
    requests = [created, ...requests];
    return ok({ request: created }, 201);
  }],

  ['PATCH', /^\/requests\/([^/?]+)$/, (req, [, id]) => {
    const request = requests.find((r) => r._id === id);
    if (!request) throw fail(404, 'REQUEST_NOT_FOUND', 'Demande introuvable');

    if (req.body?.formData) request.formData = { ...request.formData, ...req.body.formData };
    if (req.body?.delivery) request.delivery = { ...request.delivery, ...req.body.delivery };
    return ok({ request });
  }],

  ['POST', /^\/requests\/([^/?]+)\/submit$/, (req, [, id]) => {
    const request = requests.find((r) => r._id === id);
    if (!request) throw fail(404, 'REQUEST_NOT_FOUND', 'Demande introuvable');
    if (request.status !== 'DRAFT') {
      throw fail(409, 'NOT_SUBMITTABLE', 'Seul un brouillon peut être soumis');
    }

    push(request, 'SUBMITTED', 'Soumise par le citoyen');
    push(request, 'PENDING_PAYMENT', `Montant à régler : ${request.amountDue} XOF`);
    // A free service settles straight through, exactly as the API does.
    if (!request.amountDue) push(request, 'PAID', 'Service gratuit — aucun paiement requis');

    request.submittedAt = nowIso();
    return ok({ request });
  }],

  ['GET', /^\/requests\/([^/?]+)\/document$/, (req, [, id]) => {
    const document = documents.find((d) => d.requestId === id);
    if (!document) throw fail(404, 'DOCUMENT_NOT_FOUND', 'Aucun document pour cette demande');
    // A real specimen PDF, generated by the backend and bundled with the build.
    return ok({ url: specimenPdf });
  }],

  ['GET', /^\/requests\/([^/?]+)\/payment$/, (req, [, id]) => {
    const payment = payments.find((p) => p.requestId === id);
    return ok({ payment: payment ? { ...payment, _id: `p-${id}`, currency: 'XOF' } : null });
  }],

  ['POST', /^\/requests\/([^/?]+)\/payment\/callback$/, (req, [, id]) => {
    const request = requests.find((r) => r._id === id);
    const succeeded = req.body?.outcome === 'SUCCESS';

    const payment = {
      _id: `p-${id}`,
      requestId: id,
      provider: req.body?.provider ?? 'ORANGE_MONEY',
      amount: request?.amountDue ?? 0,
      currency: 'XOF',
      providerRef: req.body?.providerRef,
      status: succeeded ? 'SUCCEEDED' : 'FAILED',
      paidAt: succeeded ? nowIso() : undefined,
      failureReason: succeeded ? undefined : 'DECLINED_BY_PAYER',
    };

    if (succeeded && request) {
      push(request, 'PAID', `Payé ${request.amountDue} XOF via ${payment.provider}`);
    }
    return ok({ payment, request });
  }],

  ['POST', /^\/requests\/([^/?]+)\/payment$/, (req, [, id]) => {
    const request = requests.find((r) => r._id === id);
    if (!request) throw fail(404, 'REQUEST_NOT_FOUND', 'Demande introuvable');
    if (request.status !== 'PENDING_PAYMENT') {
      throw fail(409, 'NOT_PAYABLE', 'Cette demande n\'est pas en attente de paiement');
    }

    return ok(
      {
        payment: {
          _id: `p-${id}`,
          requestId: id,
          provider: req.body?.provider,
          payerPhone: req.body?.payerPhone,
          amount: request.amountDue,
          currency: 'XOF',
          status: 'PENDING',
          providerRef: `${(req.body?.provider ?? 'OM').slice(0, 2)}-DEMO-${Date.now().toString(36).toUpperCase()}`,
        },
      },
      201,
    );
  }],

  ['GET', /^\/requests\/([^/?]+)$/, (req, [, id]) => {
    const request = requests.find((r) => r._id === id);
    if (!request) throw fail(404, 'REQUEST_NOT_FOUND', 'Demande introuvable');
    return ok({ request: expand(request) });
  }],

  ['GET', /^\/requests$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const mine = requests.filter((r) => r.citizenId === (session?.sub ?? 'c1'));
    return ok({ requests: mine.map(expand) });
  }],

  ['GET', /^\/payments\/providers$/, () =>
    ok({
      providers: [
        { code: 'ORANGE_MONEY', kind: 'MOBILE_MONEY', label: 'Orange Money', requiresPayerPhone: true },
        { code: 'WAVE', kind: 'MOBILE_MONEY', label: 'Wave', requiresPayerPhone: true },
        { code: 'CARD', kind: 'CARD', label: 'Carte bancaire', requiresPayerPhone: false },
      ],
    })],

  // ---- Public verification ------------------------------------------------
  ['GET', /^\/verify\/([^/?]+)$/, (req, [, token]) => {
    const document = documents.find((d) => d.qrToken === decodeURIComponent(token));
    if (!document) {
      return ok({ valid: false, reason: 'UNKNOWN_TOKEN', disclaimer: DEMO_DISCLAIMER });
    }

    const request = requests.find((r) => r._id === document.requestId);
    const citizen = citizenById(document.citizenId);
    return ok({
      valid: !document.isRevoked,
      reason: document.isRevoked ? 'REVOKED' : null,
      document: {
        type: document.type,
        reference: request?.reference,
        moduleKey: request?.moduleKey,
        issuedAt: document.issuedAt,
        holder: citizen ? `${citizen.firstName} ${citizen.lastName[0]}.` : null,
      },
      disclaimer: DEMO_DISCLAIMER,
    });
  }],

  // ---- Back-office --------------------------------------------------------
  ['POST', /^\/staff\/auth\/login$/, (req) => {
    const user = DEMO_STAFF.find(
      (u) => u.email === req.body?.email?.toLowerCase() && u.password === req.body?.password,
    );
    if (!user) throw fail(401, 'INVALID_CREDENTIALS', 'Adresse ou mot de passe incorrect');

    // Destructured only to drop it from the response.
    const { password: _password, ...profile } = user;
    return ok({
      token: fakeToken({ sub: user.id, role: user.role, moduleScope: user.moduleScope }),
      user: profile,
    });
  }],

  ['GET', /^\/staff\/auth\/me$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const user = DEMO_STAFF.find((u) => u.id === session?.sub);
    if (!user) throw fail(401, 'STAFF_NOT_FOUND', 'Compte introuvable');
    // Destructured only to drop it from the response.
    const { password: _password, ...profile } = user;
    return ok({ user: profile });
  }],

  ['GET', /^\/staff\/requests\/([^/?]+)$/, (req, [, id]) => {
    const request = requests.find((r) => r._id === id);
    if (!request || !inScope(request, req)) {
      throw fail(404, 'REQUEST_NOT_FOUND', 'Demande introuvable');
    }
    return ok({ request: expand(request) });
  }],

  ['GET', /^\/staff\/requests(\?.*)?$/, (req) => {
    const params = new URLSearchParams(req.url.split('?')[1] ?? '');
    let visible = requests.filter((r) => r.status !== 'DRAFT' && inScope(r, req));

    if (params.get('status')) visible = visible.filter((r) => r.status === params.get('status'));
    if (params.get('q')) {
      const q = params.get('q').toLowerCase();
      visible = visible.filter((r) => r.reference.toLowerCase().includes(q));
    }
    if (params.get('assigned') === 'unassigned') visible = visible.filter((r) => !r.assignedAgentId);
    if (params.get('assigned') === 'me') {
      const session = decodeToken(req.headers?.Authorization);
      visible = visible.filter((r) => r.assignedAgentId?._id === session?.sub);
    }

    return ok({
      requests: visible.map(expand),
      total: visible.length,
      page: 1,
      limit: 20,
      pages: 1,
    });
  }],

  ['GET', /^\/staff\/admin\/stats$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const global = session?.role === 'SUPER_ADMIN';
    const visible = requests.filter((r) => r.status !== 'DRAFT' && inScope(r, req));

    const byStatus = {};
    const byModule = {};
    for (const r of visible) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byModule[r.moduleKey] = (byModule[r.moduleKey] ?? 0) + 1;
    }

    const ids = new Set(visible.map((r) => r._id));
    const settled = payments.filter((p) => ids.has(p.requestId) && p.status === 'SUCCEEDED');

    return ok({
      stats: {
        scope: global ? 'GLOBAL' : (session?.moduleScope ?? []),
        totals: {
          requests: visible.length,
          open: ['PAID', 'UNDER_REVIEW', 'NEEDS_INFO'].reduce((n, s) => n + (byStatus[s] ?? 0), 0),
          issued: (byStatus.ISSUED ?? 0) + (byStatus.DELIVERED ?? 0),
          rejected: byStatus.REJECTED ?? 0,
          staff: global ? DEMO_STAFF.length : 1,
        },
        revenue: {
          total: settled.reduce((sum, p) => sum + p.amount, 0),
          payments: settled.length,
          currency: 'XOF',
        },
        byStatus,
        byModule,
        perDay: buildPerDay(visible),
      },
    });
  }],

  ['GET', /^\/staff\/admin\/users(\?.*)?$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const global = session?.role === 'SUPER_ADMIN';
    const users = DEMO_STAFF.filter(
      (u) => global || (u.role === 'AGENT' && u.moduleScope.some((k) => session?.moduleScope?.includes(k))),
    ).map(({ password: _password, ...u }) => u);
    return ok({ users });
  }],

  ['GET', /^\/staff\/admin\/services$/, (req) => {
    const session = decodeToken(req.headers?.Authorization);
    const global = session?.role === 'SUPER_ADMIN';
    return ok({
      services: global
        ? DEMO_SERVICES
        : DEMO_SERVICES.filter((s) => session?.moduleScope?.includes(s.moduleKey)),
    });
  }],
];

function push(request, to, note) {
  const from = request.status;
  request.status = to;
  request.timeline = [...request.timeline, { from, to, at: nowIso(), note, actorRole: 'SYSTEM' }];
}

function inScope(request, req) {
  const session = decodeToken(req.headers?.Authorization);
  if (!session) return false;
  if (session.role === 'SUPER_ADMIN') return true;
  return (session.moduleScope ?? []).includes(request.moduleKey);
}

function buildPerDay(visible) {
  const out = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    out.push({
      date: key,
      count: visible.filter((r) => (r.createdAt ?? '').slice(0, 10) === key).length,
    });
  }
  return out;
}

/**
 * Writes the demo does not model (issuing, decisions, staff and tariff edits) are
 * accepted rather than refused: the point is to let a visitor click through, and a
 * hosted demo that throws on every button reads as broken rather than as honest.
 */
function fallback(req) {
  if (req.method === 'GET') throw fail(404, 'NOT_FOUND', 'Ressource indisponible dans la démo');
  return ok({ ok: true, demo: true });
}

export function demoAdapter(config) {
  // axios hands the adapter the relative url, but strip the base defensively so
  // the anchored patterns match whichever form arrives.
  const url = (config.url ?? '').replace(/^\/api\/v1/, '');
  const method = (config.method ?? 'get').toUpperCase();
  const body = typeof config.data === 'string' ? safeParse(config.data) : config.data;

  const req = { url, method, body, headers: config.headers ?? {} };

  return new Promise((resolve, reject) => {
    // A short delay so loading states are actually visible in the demo.
    setTimeout(() => {
      try {
        for (const [routeMethod, pattern, handler] of routes) {
          if (routeMethod !== method) continue;
          const match = url.match(pattern);
          if (!match) continue;

          const { status, data } = handler(req, match);
          return resolve({ data, status, statusText: 'OK', headers: {}, config });
        }

        const { status, data } = fallback(req);
        resolve({ data, status, statusText: 'OK', headers: {}, config });
      } catch (err) {
        if (err.response) {
          return reject(
            Object.assign(err, { config, response: { ...err.response, config } }),
          );
        }
        reject(err);
      }
    }, 220);
  });
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
