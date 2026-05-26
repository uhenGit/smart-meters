exports.up = (pgm) => {
  pgm.createTable('taxes', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    start_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    end_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
    gas_tax:                { type: 'float4' },
    water_tax:              { type: 'float4' },
    dayelec_tax:            { type: 'float4' },
    nightelec_tax:          { type: 'float4' },
    trash_fixed:            { type: 'float4' },
    water_delivery_fixed:   { type: 'float4' },
    user_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
    },
  })

  // Index for the "current tax" query pattern: WHERE start_date = end_date
  pgm.createIndex('taxes', ['start_date', 'end_date'])
}

exports.down = (pgm) => {
  pgm.dropTable('taxes')
}