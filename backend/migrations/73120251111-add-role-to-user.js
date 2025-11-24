// migrations/20241111120000-add-role-to-users.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('Users', 'role', {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'user',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('Users', 'role');
}
 