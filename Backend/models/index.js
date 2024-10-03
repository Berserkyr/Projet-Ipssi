const User = require('./User');
const Invoice = require('./invoices');

User.hasMany(Invoice, { foreignKey: 'userId', as: 'invoices' });
Invoice.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Invoice };
