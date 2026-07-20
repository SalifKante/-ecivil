import { MODULE_KEYS, PAYMENT_OUTCOMES } from '../constants/index.js';

const errorRef = { $ref: '#/components/schemas/Error' };
const jsonError = { 'application/json': { schema: errorRef } };

/** OpenAPI path definitions for every mounted endpoint. */
export const paths = {
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Liveness and dependency check',
      description: 'Public. Reports MongoDB and MinIO status. 503 if either is down.',
      security: [],
      responses: {
        200: {
          description: 'Service healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  service: { type: 'string', example: 'ecivil-api' },
                  environment: { type: 'string', example: 'development' },
                  uptimeSeconds: { type: 'integer' },
                  dependencies: {
                    type: 'object',
                    properties: {
                      mongodb: { type: 'string', enum: ['up', 'down'] },
                      storage: { type: 'string', enum: ['up', 'down'] },
                    },
                  },
                },
              },
            },
          },
        },
        503: { description: 'A dependency is down', content: jsonError },
      },
    },
  },

  '/api/v1/auth/otp/request': {
    post: {
      tags: ['Auth'],
      summary: 'Request an OTP for a NINA',
      description:
        'Sends a one-time code (mock SMS). To avoid NINA enumeration, the response shape ' +
        'is identical whether or not the NINA exists. In non-production the code is returned ' +
        'as `devCode` for convenience. Rate limited per IP+NINA.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nina'],
              properties: { nina: { type: 'string', example: '99990000000101' } },
            },
          },
        },
      },
      responses: {
        202: {
          description: 'Challenge issued (or silently ignored for an unknown NINA)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  challengeIssued: { type: 'boolean', example: true },
                  identity: {
                    nullable: true,
                    $ref: '#/components/schemas/PublicIdentity',
                  },
                  expiresAt: { type: 'string', format: 'date-time' },
                  devCode: {
                    type: 'string',
                    nullable: true,
                    description: 'Only present outside production.',
                    example: '225494',
                  },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        429: { description: 'Too many code requests', content: jsonError },
      },
    },
  },

  '/api/v1/auth/otp/verify': {
    post: {
      tags: ['Auth'],
      summary: 'Verify an OTP and open a session',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nina', 'code'],
              properties: {
                nina: { type: 'string', example: '99990000000101' },
                code: { type: 'string', example: '225494' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Session issued',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', description: 'JWT bearer token' },
                  citizen: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      nina: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      isDiaspora: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Wrong, expired, or already-used code',
          content: jsonError,
        },
        429: { description: 'Too many attempts', content: jsonError },
      },
    },
  },

  '/api/v1/auth/me': {
    get: {
      tags: ['Auth'],
      summary: "The authenticated citizen's registry record",
      description: 'Powers form pre-filling in the request wizard.',
      responses: {
        200: {
          description: 'Citizen record',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { citizen: { $ref: '#/components/schemas/Citizen' } },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/staff/auth/login': {
    post: {
      tags: ['Back-office'],
      summary: 'Back-office login (email + password)',
      description:
        'Staff front door. Citizens authenticate separately with NINA + OTP. The token ' +
        'carries the role and moduleScope used for authorization. Unknown email, wrong ' +
        'password and deactivated account all return the same 401 so staff emails cannot ' +
        'be enumerated. Rate limited per IP+email.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', example: 'agent.etatcivil@ecivil.demo' },
                password: { type: 'string', format: 'password', example: 'Demo!Agent2' },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Session issued',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', description: 'JWT bearer token' },
                  user: { $ref: '#/components/schemas/StaffUser' },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { description: 'Incorrect email or password', content: jsonError },
        429: { description: 'Too many attempts', content: jsonError },
      },
    },
  },

  '/api/v1/staff/auth/me': {
    get: {
      tags: ['Back-office'],
      summary: 'The authenticated staff profile',
      description: 'Re-reads the account, so a deactivation takes effect immediately.',
      responses: {
        200: {
          description: 'Staff profile',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { user: { $ref: '#/components/schemas/StaffUser' } },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },

  '/api/v1/services/modules': {
    get: {
      tags: ['Services'],
      summary: 'The four modules with service counts',
      security: [],
      responses: {
        200: {
          description: 'Modules',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  modules: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ModuleSummary' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/v1/services': {
    get: {
      tags: ['Services'],
      summary: 'List active services',
      security: [],
      parameters: [
        {
          name: 'moduleKey',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: Object.values(MODULE_KEYS) },
          description: 'Filter to one module.',
        },
      ],
      responses: {
        200: {
          description: 'Services',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  services: { type: 'array', items: { $ref: '#/components/schemas/Service' } },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/services/{code}': {
    get: {
      tags: ['Services'],
      summary: 'Get one service by code',
      security: [],
      parameters: [
        { name: 'code', in: 'path', required: true, schema: { type: 'string' }, example: 'LE-BIRTH-EXTRACT' },
      ],
      responses: {
        200: {
          description: 'Service',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { service: { $ref: '#/components/schemas/Service' } },
              },
            },
          },
        },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/requests': {
    get: {
      tags: ['Requests'],
      summary: "List the caller's own requests",
      responses: {
        200: {
          description: 'Requests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  requests: { type: 'array', items: { $ref: '#/components/schemas/Request' } },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Requests'],
      summary: 'Create a draft request',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['serviceId'],
              properties: {
                serviceId: { type: 'string', description: 'Mongo id of the chosen service' },
                formData: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Draft created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { request: { $ref: '#/components/schemas/Request' } },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },

  '/api/v1/requests/{id}': {
    get: {
      tags: ['Requests'],
      summary: 'Get one of the caller\'s requests',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { request: { $ref: '#/components/schemas/Request' } },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Requests'],
      summary: 'Update a draft (form data or delivery)',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                formData: { type: 'object', additionalProperties: true },
                delivery: {
                  type: 'object',
                  properties: {
                    mode: { type: 'string', enum: ['DIGITAL', 'HOME', 'PICKUP_POINT'] },
                    address: { type: 'string' },
                    pickupPoint: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Updated request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { request: { $ref: '#/components/schemas/Request' } },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },

  '/api/v1/requests/{id}/submit': {
    post: {
      tags: ['Requests'],
      summary: 'Submit a draft',
      description: 'DRAFT → SUBMITTED → PENDING_PAYMENT, validated by the state machine.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Submitted request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { request: { $ref: '#/components/schemas/Request' } },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },

  '/api/v1/requests/{id}/attachments': {
    post: {
      tags: ['Requests'],
      summary: 'Upload a document to a draft',
      description: 'JPG/PNG/PDF, max 5 MB. Stored privately in MinIO under a server key.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary' },
                label: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Attachment stored',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { attachment: { $ref: '#/components/schemas/Attachment' } },
              },
            },
          },
        },
        400: { description: 'Missing file, bad type, or too large', content: jsonError },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },

  '/api/v1/requests/{id}/attachments/{attachmentId}/url': {
    get: {
      tags: ['Requests'],
      summary: 'Get a short-lived download URL for an attachment',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'attachmentId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        200: {
          description: 'Presigned URL',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { url: { type: 'string', format: 'uri' } },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    delete: {
      tags: ['Requests'],
      summary: 'Remove an attachment from a draft',
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'attachmentId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        204: { description: 'Removed' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/Conflict' },
      },
    },
  },

  '/api/v1/payments/providers': {
    get: {
      tags: ['Payments'],
      summary: 'Available payment providers',
      description:
        'Drives the provider picker. All providers are MOCK — nothing is ever charged.',
      responses: {
        200: {
          description: 'Providers',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  providers: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PaymentProvider' },
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  '/api/v1/requests/{id}/payment': {
    get: {
      tags: ['Payments'],
      summary: 'The latest payment attempt for a request',
      description: 'Returns `null` when no attempt has been opened yet.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Payment attempt, or null',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  payment: { nullable: true, $ref: '#/components/schemas/Payment' },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    post: {
      tags: ['Payments'],
      summary: 'Open a payment attempt',
      description:
        'Only from PENDING_PAYMENT. The amount is read from the request — a client-supplied ' +
        'amount is not accepted. Opening a new attempt supersedes any pending one. ' +
        'Rate limited per IP.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['provider'],
              properties: {
                provider: { type: 'string', enum: ['ORANGE_MONEY', 'WAVE', 'CARD'] },
                payerPhone: {
                  type: 'string',
                  description: 'Required for mobile money providers.',
                  example: '+22370000101',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Attempt opened (PENDING)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { payment: { $ref: '#/components/schemas/Payment' } },
              },
            },
          },
        },
        400: { description: 'Validation error or missing payer phone', content: jsonError },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        409: {
          description: 'Request not awaiting payment, or the service is free',
          content: jsonError,
        },
        429: { description: 'Too many payment attempts', content: jsonError },
      },
    },
  },

  '/api/v1/requests/{id}/payment/callback': {
    post: {
      tags: ['Payments'],
      summary: 'Settle a payment attempt (simulated gateway callback)',
      description:
        'MOCK: stands in for the provider\'s signed server-to-server webhook. The demo ' +
        'chooses the outcome; a real gateway decides it. On SUCCESS the request moves ' +
        'PENDING_PAYMENT → PAID. Settlement is atomic — a replayed callback gets 409.',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['providerRef', 'outcome'],
              properties: {
                providerRef: { type: 'string', example: 'OM-MOCK-M8QK3TZ2-0001' },
                outcome: { type: 'string', enum: Object.values(PAYMENT_OUTCOMES) },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Attempt settled',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  payment: { $ref: '#/components/schemas/Payment' },
                  request: { $ref: '#/components/schemas/Request' },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { description: 'Request or payment attempt not found', content: jsonError },
        409: { description: 'Attempt already settled', content: jsonError },
        429: { description: 'Too many payment attempts', content: jsonError },
      },
    },
  },
};
