/**
 * Seed data for the offline demo build.
 *
 * Mirrors `backend/seeds/data/` so the hosted demo shows the same fictional world
 * as a local stack. Everything here is invented: the NINAs all carry the reserved
 * 9999 prefix, the names and addresses are made up, and no value corresponds to a
 * real person, account or document.
 *
 * Amounts are integer XOF, like everywhere else in the project.
 */

export const DEMO_CITIZENS = [
  {
    id: 'c1',
    nina: '99990000000101',
    firstName: 'Aminata',
    lastName: 'Traoré',
    birthDate: '1992-04-17',
    birthPlace: 'Bamako',
    gender: 'F',
    phone: '+22370000101',
    email: 'aminata.demo@example.test',
    address: {
      line: 'Rue 224, Hamdallaye ACI 2000',
      city: 'Bamako',
      region: 'Bamako',
      country: 'Mali',
    },
    isDiaspora: false,
  },
  {
    id: 'c2',
    nina: '99990000000104',
    firstName: 'Ibrahim',
    lastName: 'Coulibaly',
    birthDate: '1979-01-23',
    birthPlace: 'Mopti',
    gender: 'M',
    phone: '+33600000104',
    email: 'ibrahim.demo@example.test',
    address: { line: '12 rue des Lilas', city: 'Paris', region: 'Île-de-France', country: 'France' },
    isDiaspora: true,
    consulate: 'Consulat du Mali à Paris',
  },
];

export const DEMO_SERVICES = [
  {
    _id: 's1',
    code: 'ID-PASSPORT-NEW',
    moduleKey: 'identity',
    label: 'Demande de passeport biométrique',
    description: 'Première demande de passeport biométrique malien.',
    partner: 'Ministère de la Sécurité',
    requiredDocuments: ["Extrait d'acte de naissance", "Photo d'identité", 'Justificatif de domicile'],
    fee: 50000,
    currency: 'XOF',
    processingDays: 15,
    isActive: true,
  },
  {
    _id: 's2',
    code: 'ID-CARD-BIO',
    moduleKey: 'identity',
    label: "Carte nationale d'identité biométrique",
    description: "Demande ou renouvellement de la carte nationale d'identité.",
    partner: 'Ministère de la Sécurité',
    requiredDocuments: ["Extrait d'acte de naissance", "Photo d'identité"],
    fee: 10000,
    currency: 'XOF',
    processingDays: 7,
    isActive: true,
  },
  {
    _id: 's3',
    code: 'LE-BIRTH-EXTRACT',
    moduleKey: 'lifeEvents',
    label: "Extrait d'acte de naissance",
    description: "Obtention d'une copie d'acte de naissance.",
    partner: 'Communes & Consulats',
    requiredDocuments: ['Numéro NINA'],
    fee: 1000,
    currency: 'XOF',
    processingDays: 3,
    isActive: true,
  },
  {
    _id: 's4',
    code: 'LE-BIRTH-DECLARE',
    moduleKey: 'lifeEvents',
    label: 'Déclaration de naissance',
    description: "Déclaration d'une naissance auprès de l'état civil.",
    partner: 'Communes & Consulats',
    requiredDocuments: ['Certificat médical de naissance', 'Pièce des parents'],
    fee: 0,
    currency: 'XOF',
    processingDays: 5,
    isActive: true,
  },
  {
    _id: 's5',
    code: 'LE-MARRIAGE-EXTRACT',
    moduleKey: 'lifeEvents',
    label: "Extrait d'acte de mariage",
    description: "Obtention d'une copie d'acte de mariage.",
    partner: 'Communes & Consulats',
    requiredDocuments: ['Numéro NINA des époux'],
    fee: 2000,
    currency: 'XOF',
    processingDays: 5,
    isActive: true,
  },
  {
    _id: 's6',
    code: 'MO-VEHICLE-REG',
    moduleKey: 'mobility',
    label: "Immatriculation d'un véhicule",
    description: "Première immatriculation d'un véhicule importé ou acquis.",
    partner: 'Direction des Transports',
    requiredDocuments: ['Facture ou acte de vente', 'Certificat de dédouanement'],
    fee: 15000,
    currency: 'XOF',
    processingDays: 10,
    isActive: true,
  },
  {
    _id: 's7',
    code: 'MO-CARTE-GRISE',
    moduleKey: 'mobility',
    label: 'Obtention de carte grise',
    description: "Édition ou duplicata de la carte grise d'un véhicule.",
    partner: 'Direction des Transports',
    requiredDocuments: ['Certificat de cession', "Preuve d'immatriculation"],
    fee: 25000,
    currency: 'XOF',
    processingDays: 7,
    isActive: true,
  },
  {
    _id: 's8',
    code: 'LD-TITLE-REQUEST',
    moduleKey: 'land',
    label: 'Demande de titre foncier',
    description: "Établissement d'un titre de propriété foncière.",
    partner: 'Urbanisme & Domaines',
    requiredDocuments: ['Acte de cession', 'Plan cadastral', 'Quittance'],
    fee: 100000,
    currency: 'XOF',
    processingDays: 30,
    isActive: true,
  },
  {
    _id: 's9',
    code: 'LD-CADASTRE-CHECK',
    moduleKey: 'land',
    label: 'Vérification cadastrale',
    description: "Vérification de l'existence et de la validité d'un titre foncier.",
    partner: 'Urbanisme & Domaines',
    requiredDocuments: ['Référence du titre'],
    fee: 20000,
    currency: 'XOF',
    processingDays: 5,
    isActive: true,
  },
];

export const DEMO_STAFF = [
  {
    id: 'u1',
    email: 'agent.etatcivil@ecivil.demo',
    password: 'Demo!Agent2',
    fullName: 'Agent Événements de Vie',
    role: 'AGENT',
    moduleScope: ['lifeEvents'],
    isActive: true,
  },
  {
    id: 'u2',
    email: 'admin.etatcivil@ecivil.demo',
    password: 'Demo!Admin2',
    fullName: 'Admin Événements de Vie',
    role: 'ADMIN',
    moduleScope: ['lifeEvents'],
    isActive: true,
  },
  {
    id: 'u3',
    email: 'agent.identite@ecivil.demo',
    password: 'Demo!Agent1',
    fullName: 'Agent Identité & Voyage',
    role: 'AGENT',
    moduleScope: ['identity'],
    isActive: true,
  },
  {
    id: 'u4',
    email: 'admin.identite@ecivil.demo',
    password: 'Demo!Admin1',
    fullName: 'Admin Identité & Voyage',
    role: 'ADMIN',
    moduleScope: ['identity'],
    isActive: true,
  },
  {
    id: 'u5',
    email: 'superadmin@ecivil.demo',
    password: 'Demo!Super1',
    fullName: 'Super-Administrateur eCivil',
    role: 'SUPER_ADMIN',
    moduleScope: [],
    isActive: true,
  },
];

/** Days back from today, so the demo never looks stale. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function entry(to, at, note, from) {
  return { from, to, at, note, actorRole: 'SYSTEM' };
}

/**
 * A spread of requests across modules and statuses, so every screen has something
 * worth looking at: an inbox with work in it, a timeline mid-flight, an issued
 * document to download and verify.
 */
export const DEMO_REQUESTS = [
  {
    _id: 'r1',
    reference: 'ECV-2026-000101',
    citizenId: 'c1',
    serviceId: 's3',
    moduleKey: 'lifeEvents',
    status: 'ISSUED',
    amountDue: 1000,
    currency: 'XOF',
    formData: { motif: "Constitution d'un dossier scolaire" },
    delivery: { mode: 'DIGITAL' },
    attachments: [],
    documentId: 'd1',
    submittedAt: daysAgo(9),
    createdAt: daysAgo(9),
    assignedAgentId: { _id: 'u1', fullName: 'Agent Événements de Vie' },
    timeline: [
      entry('DRAFT', daysAgo(9)),
      entry('SUBMITTED', daysAgo(9), 'Soumise par le citoyen', 'DRAFT'),
      entry('PENDING_PAYMENT', daysAgo(9), 'Montant à régler : 1000 XOF', 'SUBMITTED'),
      entry('PAID', daysAgo(9), 'Payé 1000 XOF via ORANGE_MONEY', 'PENDING_PAYMENT'),
      entry('UNDER_REVIEW', daysAgo(7), 'Instruction ouverte', 'PAID'),
      entry('APPROVED', daysAgo(5), 'Dossier conforme', 'UNDER_REVIEW'),
      entry('ISSUED', daysAgo(5), 'Document émis', 'APPROVED'),
    ],
  },
  {
    _id: 'r2',
    reference: 'ECV-2026-000102',
    citizenId: 'c1',
    serviceId: 's2',
    moduleKey: 'identity',
    status: 'UNDER_REVIEW',
    amountDue: 10000,
    currency: 'XOF',
    formData: { motif: 'Renouvellement après expiration' },
    delivery: { mode: 'HOME', address: 'Rue 224, Hamdallaye ACI 2000, Bamako' },
    attachments: [
      { _id: 'a1', originalName: 'acte-naissance.pdf', mimeType: 'application/pdf', sizeBytes: 184320 },
      { _id: 'a2', originalName: 'photo-identite.jpg', mimeType: 'image/jpeg', sizeBytes: 96500 },
    ],
    submittedAt: daysAgo(4),
    createdAt: daysAgo(4),
    assignedAgentId: { _id: 'u3', fullName: 'Agent Identité & Voyage' },
    timeline: [
      entry('DRAFT', daysAgo(4)),
      entry('SUBMITTED', daysAgo(4), 'Soumise par le citoyen', 'DRAFT'),
      entry('PENDING_PAYMENT', daysAgo(4), 'Montant à régler : 10000 XOF', 'SUBMITTED'),
      entry('PAID', daysAgo(3), 'Payé 10000 XOF via WAVE', 'PENDING_PAYMENT'),
      entry('UNDER_REVIEW', daysAgo(2), 'Instruction ouverte', 'PAID'),
    ],
  },
  {
    _id: 'r3',
    reference: 'ECV-2026-000103',
    citizenId: 'c1',
    serviceId: 's5',
    moduleKey: 'lifeEvents',
    status: 'PENDING_PAYMENT',
    amountDue: 2000,
    currency: 'XOF',
    formData: { motif: 'Dossier de regroupement familial' },
    delivery: { mode: 'DIGITAL' },
    attachments: [],
    submittedAt: daysAgo(1),
    createdAt: daysAgo(1),
    timeline: [
      entry('DRAFT', daysAgo(1)),
      entry('SUBMITTED', daysAgo(1), 'Soumise par le citoyen', 'DRAFT'),
      entry('PENDING_PAYMENT', daysAgo(1), 'Montant à régler : 2000 XOF', 'SUBMITTED'),
    ],
  },
  {
    _id: 'r4',
    reference: 'ECV-2026-000104',
    citizenId: 'c2',
    serviceId: 's3',
    moduleKey: 'lifeEvents',
    status: 'NEEDS_INFO',
    amountDue: 1000,
    currency: 'XOF',
    formData: { motif: 'Démarche consulaire' },
    delivery: { mode: 'DIGITAL' },
    attachments: [
      { _id: 'a3', originalName: 'justificatif.pdf', mimeType: 'application/pdf', sizeBytes: 120400 },
    ],
    submittedAt: daysAgo(6),
    createdAt: daysAgo(6),
    assignedAgentId: { _id: 'u1', fullName: 'Agent Événements de Vie' },
    timeline: [
      entry('DRAFT', daysAgo(6)),
      entry('SUBMITTED', daysAgo(6), 'Soumise par le citoyen', 'DRAFT'),
      entry('PENDING_PAYMENT', daysAgo(6), 'Montant à régler : 1000 XOF', 'SUBMITTED'),
      entry('PAID', daysAgo(6), 'Payé 1000 XOF via ORANGE_MONEY', 'PENDING_PAYMENT'),
      entry('UNDER_REVIEW', daysAgo(5), 'Instruction ouverte', 'PAID'),
      entry(
        'NEEDS_INFO',
        daysAgo(3),
        'Le justificatif fourni est illisible. Merci de joindre une copie plus nette.',
        'UNDER_REVIEW',
      ),
    ],
  },
  {
    _id: 'r5',
    reference: 'ECV-2026-000105',
    citizenId: 'c2',
    serviceId: 's8',
    moduleKey: 'land',
    status: 'PAID',
    amountDue: 100000,
    currency: 'XOF',
    formData: { motif: 'Régularisation de parcelle' },
    delivery: { mode: 'PICKUP_POINT', pickupPoint: 'Guichet Urbanisme, Bamako' },
    attachments: [
      { _id: 'a4', originalName: 'plan-cadastral.pdf', mimeType: 'application/pdf', sizeBytes: 512000 },
    ],
    submittedAt: daysAgo(2),
    createdAt: daysAgo(2),
    timeline: [
      entry('DRAFT', daysAgo(2)),
      entry('SUBMITTED', daysAgo(2), 'Soumise par le citoyen', 'DRAFT'),
      entry('PENDING_PAYMENT', daysAgo(2), 'Montant à régler : 100000 XOF', 'SUBMITTED'),
      entry('PAID', daysAgo(2), 'Payé 100000 XOF via CARD', 'PENDING_PAYMENT'),
    ],
  },
  {
    _id: 'r6',
    reference: 'ECV-2026-000106',
    citizenId: 'c2',
    serviceId: 's6',
    moduleKey: 'mobility',
    status: 'REJECTED',
    amountDue: 15000,
    currency: 'XOF',
    formData: { motif: 'Véhicule importé' },
    delivery: { mode: 'DIGITAL' },
    attachments: [],
    rejectionReason: "Le certificat de dédouanement fourni ne correspond pas au véhicule déclaré.",
    submittedAt: daysAgo(12),
    createdAt: daysAgo(12),
    timeline: [
      entry('DRAFT', daysAgo(12)),
      entry('SUBMITTED', daysAgo(12), 'Soumise par le citoyen', 'DRAFT'),
      entry('PENDING_PAYMENT', daysAgo(12), 'Montant à régler : 15000 XOF', 'SUBMITTED'),
      entry('PAID', daysAgo(11), 'Payé 15000 XOF via ORANGE_MONEY', 'PENDING_PAYMENT'),
      entry('UNDER_REVIEW', daysAgo(10), 'Instruction ouverte', 'PAID'),
      entry(
        'REJECTED',
        daysAgo(8),
        "Le certificat de dédouanement fourni ne correspond pas au véhicule déclaré.",
        'UNDER_REVIEW',
      ),
    ],
  },
];

/** The single issued document, matching r1. Its token is what /verifier accepts. */
export const DEMO_DOCUMENTS = [
  {
    _id: 'd1',
    requestId: 'r1',
    citizenId: 'c1',
    type: 'LE-BIRTH-EXTRACT',
    qrToken: 'DEMO-eCivil-2026-SPECIMEN-TOKEN-0001',
    issuedAt: daysAgo(5),
    isRevoked: false,
  },
];

export const DEMO_PAYMENTS = [
  { requestId: 'r1', provider: 'ORANGE_MONEY', amount: 1000, status: 'SUCCEEDED' },
  { requestId: 'r2', provider: 'WAVE', amount: 10000, status: 'SUCCEEDED' },
  { requestId: 'r4', provider: 'ORANGE_MONEY', amount: 1000, status: 'SUCCEEDED' },
  { requestId: 'r5', provider: 'CARD', amount: 100000, status: 'SUCCEEDED' },
  { requestId: 'r6', provider: 'ORANGE_MONEY', amount: 15000, status: 'SUCCEEDED' },
];

export const DEMO_DISCLAIMER =
  'PROTOTYPE — Ce document est un spécimen de démonstration sans valeur légale. ' +
  'Les données sont fictives.';
