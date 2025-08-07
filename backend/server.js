import e from "express";
import { connectDB } from "./config/db.js";
import { configDotenv } from "dotenv";
 configDotenv();
const app= e();
app.get("/",(req,res)=> {
    // res.send("server is ready ")
})
console.log(process.env.MONGO_URI);

app.listen(5000,()=>{
    connectDB();
    console.log("Server started at http://localhost:5000");
})

// og7pT9fciqspfQsH
// project database password = khgQkynbAyOgooKi