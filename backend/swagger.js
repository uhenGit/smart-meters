const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Meter API',
      version: '1.0.0',
      description: 'REST API for tracking utility meter readings and tariffs',
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
          },
        },
        Tax: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            gas_tax: { type: 'number' },
            water_tax: { type: 'number' },
            dayelec_tax: { type: 'number' },
            nightelec_tax: { type: 'number' },
            trash_fixed: { type: 'number' },
            water_delivery_fixed: { type: 'number' },
          },
        },
        Indication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            gas: { type: 'integer' },
            water: { type: 'integer' },
            dayelec: { type: 'integer' },
            nightelec: { type: 'integer' },
            heat: { type: 'integer' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date' },
            tax_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
      // Reusable responses
      responses: {
        Unauthorized: {
          description: 'Missing or invalid token',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' },
            },
          },
        },
        FieldsMissing: {
          description: 'Required fields missing',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' },
            },
          },
        },
        FieldAlreadyTaken: {
          description: 'Email or username already taken',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' }
            },
          },
        },
        InvalidValue: {
          description: 'Invalid value provided',
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/Error' }
            },
          },
        },
      },
    },
    // Applied globally — every route requires cookie auth unless overridden
    security: [{ cookieAuth: [] }],
  },
  // Scan all route files for @openapi comments
  apis: ['./routes/*.js'],
}

module.exports = swaggerJsdoc(options)