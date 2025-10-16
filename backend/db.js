import { Sequelize } from "sequelize";
import pg from "pg";

const { Pool } = pg;

// Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || "eventdb",
  process.env.DB_USER || "postgres",
  process.env.DB_PASS || "postgres",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "postgres",
  }
);

// pg Pool instance
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "eventdb",
  password: process.env.DB_PASS || "postgres",
  port: process.env.DB_PORT || 5432,
});

export { pool };       
export default sequelize; 
