/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
// export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.addColumns('users', {
    invite_token: {
      type: 'varchar(64)',
      unique: true,
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  })

  // Admin created via init-admin.js should be active by default
  pgm.sql(`UPDATE users SET is_active = true WHERE role = 'admin'`)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumns('users', ['invite_token', 'is_active'])
};
