// utils/ensureAdmins.js
import bcrypt from "bcrypt";
import User from "../models/User.js";

export async function ensureAdmins() {
  const raw = process.env.ADMIN_EMAILS || "";
  const emails = raw.split(",").map(e => e.trim()).filter(Boolean);
  if (emails.length === 0) {
    console.log("ℹ️ No ADMIN_EMAILS set; skipping admin bootstrap.");
    return;
  }

  const defaultPwd = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@123";
  for (const email of emails) {
    const existing = await User.findOne({ where: { email } });
    if (!existing) {
      const hash = await bcrypt.hash(defaultPwd, 10);
      await User.create({
        name: email.split("@")[0],
        email,
        password: hash,
        role: "admin",
      });
      console.log(`✅ Created admin user ${email}`);
    } else if (existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
      console.log(`✅ Promoted ${email} to admin`);
    } else {
      console.log(`✔️ Already admin: ${email}`);
    }
  }
}
