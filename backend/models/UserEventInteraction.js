// backend/models/UserEventInteraction.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import User from "./User.js";
import Event from "./Event.js";

const UserEventInteraction = sequelize.define("UserEventInteraction", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  interaction_type: { type: DataTypes.STRING, allowNull: false }, // e.g. view, register, tag_click
});

// Define relationships
User.belongsToMany(Event, { through: UserEventInteraction });
Event.belongsToMany(User, { through: UserEventInteraction });

export default UserEventInteraction; // ✅ instead of module.exports
