// backend/models/Event.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js"; // include .js extension in ESM

const Event = sequelize.define("Event", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING },
  start_date: { type: DataTypes.DATE },
  end_date: { type: DataTypes.DATE },
  location: { type: DataTypes.STRING },
  tags: { type: DataTypes.STRING }, // comma separated or JSON
  price: { type: DataTypes.STRING }
});

export default Event;
