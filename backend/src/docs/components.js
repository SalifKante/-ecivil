import {
  MODULE_KEYS,
  REQUEST_STATUS,
  DELIVERY_MODES,
  ROLES,
  CURRENCY,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUS,
} from '../constants/index.js';

/** Reusable OpenAPI schema + response components, kept in sync with the models. */
export const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Citizen session token from POST /auth/otp/verify.',
    },
  },
  schemas: {
    Error: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Request validation failed' },
            details: {
              type: 'array',
              nullable: true,
              items: { type: 'object' },
              description: 'Optional field-level detail (validation, remaining attempts, etc.)',
            },
          },
          required: ['code', 'message'],
        },
      },
    },
    PublicIdentity: {
      type: 'object',
      description: 'Minimal identity confirmation returned before authentication.',
      properties: {
        nina: { type: 'string', example: '99990000000101' },
        firstName: { type: 'string', example: 'Aminata' },
        lastName: { type: 'string', example: 'Traoré' },
        phoneMasked: { type: 'string', example: '+223 •• •• 01 01' },
      },
    },
    Citizen: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        nina: { type: 'string', example: '99990000000101' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        birthDate: { type: 'string', format: 'date-time' },
        birthPlace: { type: 'string' },
        gender: { type: 'string', enum: ['M', 'F'] },
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
        address: {
          type: 'object',
          properties: {
            line: { type: 'string' },
            city: { type: 'string' },
            region: { type: 'string' },
            country: { type: 'string' },
          },
        },
        isDiaspora: { type: 'boolean' },
        consulate: { type: 'string', nullable: true },
      },
    },
    StaffUser: {
      type: 'object',
      description: 'A back-office account. Never carries the password hash.',
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email', example: 'agent.etatcivil@ecivil.demo' },
        fullName: { type: 'string', example: 'Agent Événements de Vie' },
        role: { type: 'string', enum: [ROLES.AGENT, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
        moduleScope: {
          type: 'array',
          items: { type: 'string', enum: Object.values(MODULE_KEYS) },
          description: 'Modules this account may act on. Empty + SUPER_ADMIN means global.',
        },
        lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    Service: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        code: { type: 'string', example: 'LE-BIRTH-EXTRACT' },
        moduleKey: { type: 'string', enum: Object.values(MODULE_KEYS) },
        label: { type: 'string', example: "Extrait d'acte de naissance" },
        description: { type: 'string' },
        partner: { type: 'string', example: 'Communes & Consulats' },
        requiredDocuments: { type: 'array', items: { type: 'string' } },
        fee: {
          type: 'integer',
          description: `Official tariff, integer ${CURRENCY} (no decimals).`,
          example: 1000,
        },
        currency: { type: 'string', example: CURRENCY },
        processingDays: { type: 'integer', example: 3 },
        isActive: { type: 'boolean' },
      },
    },
    ModuleSummary: {
      type: 'object',
      properties: {
        moduleKey: { type: 'string', enum: Object.values(MODULE_KEYS) },
        serviceCount: { type: 'integer', example: 3 },
        partner: { type: 'string', nullable: true },
      },
    },
    TimelineEntry: {
      type: 'object',
      properties: {
        from: { type: 'string', enum: Object.values(REQUEST_STATUS), nullable: true },
        to: { type: 'string', enum: Object.values(REQUEST_STATUS) },
        actorRole: { type: 'string', example: ROLES.CITIZEN },
        note: { type: 'string', nullable: true },
        at: { type: 'string', format: 'date-time' },
      },
    },
    Attachment: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        storageKey: {
          type: 'string',
          description: 'Server-generated object key. Never a public URL.',
          example: 'requests/6a58.../b69c-...png',
        },
        mimeType: { type: 'string', example: 'image/png' },
        sizeBytes: { type: 'integer', example: 20480 },
        originalName: { type: 'string', example: 'photo.png' },
        label: { type: 'string', nullable: true },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
    Request: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        reference: { type: 'string', example: 'ECV-2026-000042' },
        citizenId: { type: 'string' },
        serviceId: { type: 'string' },
        moduleKey: { type: 'string', enum: Object.values(MODULE_KEYS) },
        status: { type: 'string', enum: Object.values(REQUEST_STATUS) },
        formData: { type: 'object', additionalProperties: true },
        attachments: { type: 'array', items: { $ref: '#/components/schemas/Attachment' } },
        amountDue: { type: 'integer', example: 1000 },
        currency: { type: 'string', example: CURRENCY },
        delivery: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: Object.values(DELIVERY_MODES) },
            address: { type: 'string', nullable: true },
            pickupPoint: { type: 'string', nullable: true },
          },
        },
        timeline: { type: 'array', items: { $ref: '#/components/schemas/TimelineEntry' } },
        paymentId: { type: 'string', nullable: true, description: 'Set once a payment succeeds.' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    PaymentProvider: {
      type: 'object',
      properties: {
        code: { type: 'string', enum: Object.values(PAYMENT_PROVIDERS) },
        kind: { type: 'string', enum: ['MOBILE_MONEY', 'CARD'] },
        label: { type: 'string', example: 'Orange Money' },
        requiresPayerPhone: { type: 'boolean' },
      },
    },
    Payment: {
      type: 'object',
      description: 'A payment attempt. MOCK — no money moves and nothing is charged.',
      properties: {
        _id: { type: 'string' },
        requestId: { type: 'string' },
        citizenId: { type: 'string' },
        provider: { type: 'string', enum: Object.values(PAYMENT_PROVIDERS) },
        amount: {
          type: 'integer',
          description: `Integer ${CURRENCY}. Read from the request — never client-supplied.`,
          example: 1000,
        },
        currency: { type: 'string', example: CURRENCY },
        status: { type: 'string', enum: Object.values(PAYMENT_STATUS) },
        providerRef: { type: 'string', example: 'OM-MOCK-M8QK3TZ2-0001' },
        payerPhone: { type: 'string', nullable: true, description: 'Mobile money only.' },
        failureReason: { type: 'string', nullable: true, example: 'DECLINED_BY_PAYER' },
        paidAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    Document: {
      type: 'object',
      description:
        'An issued demo document. Always a watermarked SPÉCIMEN with no legal value.',
      properties: {
        _id: { type: 'string' },
        requestId: { type: 'string' },
        citizenId: { type: 'string' },
        type: { type: 'string', example: 'LE-BIRTH-EXTRACT' },
        storageKey: {
          type: 'string',
          description: 'Private object key. Reads go through a presigned URL.',
          example: 'documents/6a58.../b69c-....pdf',
        },
        qrToken: {
          type: 'string',
          description: '32 random bytes, base64url. Encoded in the QR code.',
        },
        issuedAt: { type: 'string', format: 'date-time' },
        isRevoked: { type: 'boolean' },
      },
    },
    Stats: {
      type: 'object',
      description: 'Dashboard figures, already scoped to what the caller may see.',
      properties: {
        scope: {
          oneOf: [
            { type: 'string', enum: ['GLOBAL'] },
            { type: 'array', items: { type: 'string', enum: Object.values(MODULE_KEYS) } },
          ],
        },
        totals: {
          type: 'object',
          properties: {
            requests: { type: 'integer' },
            open: { type: 'integer', description: 'PAID + UNDER_REVIEW + NEEDS_INFO' },
            issued: { type: 'integer' },
            rejected: { type: 'integer' },
            staff: { type: 'integer' },
          },
        },
        revenue: {
          type: 'object',
          properties: {
            total: { type: 'integer', description: `Integer ${CURRENCY}, settled payments only.` },
            payments: { type: 'integer' },
            currency: { type: 'string', example: CURRENCY },
          },
        },
        byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
        byModule: { type: 'object', additionalProperties: { type: 'integer' } },
        perDay: {
          type: 'array',
          description: 'Quiet days are explicit zeros, so a chart does not skip them.',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              count: { type: 'integer' },
            },
          },
        },
      },
    },
    VerificationResult: {
      type: 'object',
      description:
        'Public verification payload. Deliberately minimal — a scanned QR code must ' +
        'not become an identity-lookup oracle.',
      properties: {
        valid: { type: 'boolean' },
        reason: {
          type: 'string',
          nullable: true,
          enum: ['UNKNOWN_TOKEN', 'REVOKED', null],
        },
        document: {
          type: 'object',
          nullable: true,
          properties: {
            type: { type: 'string' },
            reference: { type: 'string', example: 'ECV-2026-000042' },
            moduleKey: { type: 'string', enum: Object.values(MODULE_KEYS) },
            issuedAt: { type: 'string', format: 'date-time' },
            holder: {
              type: 'string',
              nullable: true,
              description: 'First name + last initial only.',
              example: 'Aminata T.',
            },
          },
        },
        disclaimer: { type: 'string', description: 'Always present, valid or not.' },
      },
    },
  },
  responses: {
    ValidationError: {
      description: 'Request failed validation',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    Unauthorized: {
      description: 'Missing or invalid session token',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    Forbidden: {
      description: 'Authenticated, but the role or module scope does not allow this',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    NotFound: {
      description: 'Resource not found (or not owned by the caller)',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
    Conflict: {
      description: 'Illegal state transition or non-editable resource',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    },
  },
};
