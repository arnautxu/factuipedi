// Ús: node scripts/hashPassword.mjs "la_meva_contrasenya"
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Ús: node scripts/hashPassword.mjs "la_meva_contrasenya"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log("Hash:", hash);
console.log();
console.log("Per a .env.local (Next.js interpola \"$\" fins i tot entre cometes):");
console.log(`APP_LOGIN_PASSWORD_HASH="${hash.replaceAll("$", "\\$")}"`);
console.log();
console.log("Per a Vercel (Settings > Environment Variables, sense escapar):");
console.log(hash);
