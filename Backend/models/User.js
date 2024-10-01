const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const File = require('./File');

const User = sequelize.define('User', {
    ID_Utilisateur: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Nom: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Prenom: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    Mot_de_passe: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Adresse: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'user',
    },
}, {
    tableName: 'utilisateur',
    timestamps: false,
});

User.hasMany(File, { foreignKey: 'ID_Utilisateur' });
File.belongsTo(User, { foreignKey: 'ID_Utilisateur' });

module.exports = User;
