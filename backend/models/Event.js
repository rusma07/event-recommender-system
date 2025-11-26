import { DataTypes } from "sequelize";
import sequelize from "../db.js"; 

const Event = sequelize.define("Event", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING },
  start_date: { type: DataTypes.DATE },
  end_date: { type: DataTypes.DATE },
  location: { type: DataTypes.STRING },
  tags: { type: DataTypes.STRING },
  price: { type: DataTypes.STRING }
});

export default Event;
