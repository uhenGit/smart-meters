exports.up = (pgm) => {
  pgm.createTable('indications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    gas:       { type: 'integer', notNull: true },
    water:     { type: 'integer', notNull: true },
    dayelec:   { type: 'integer', notNull: true },
    nightelec: { type: 'integer', notNull: true },
    heat:      { type: 'integer', default: 0 },
    notes:     { type: 'varchar(255)' },
    created_at: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    updated_at: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    user_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
    },
    tax_id: {
      type: 'uuid',
      references: '"taxes"',
      onDelete: 'SET NULL',
    },
  })

  // Unique constraint: one record per user per month
  pgm.createIndex('indications', ['user_id', 'created_at'], { unique: true })

  // Index for date range queries used in history and statistics routes
  pgm.createIndex('indications', ['user_id', 'created_at'])
}

exports.down = (pgm) => {
  pgm.dropTable('indications')
}