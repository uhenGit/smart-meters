exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true })

  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    username: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    email: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    first_name: { type: 'varchar(50)' },
    last_name:  { type: 'varchar(50)' },
    password: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      default: 'user',
    },
    created_at: {
      type: 'date',
      notNull: true,
      default: pgm.func('CURRENT_DATE'),
    },
  },
  { ifNotExists: true })
}

exports.down = (pgm) => {
  pgm.dropTable('users')
}