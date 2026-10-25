import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Pass a strong password of at least 12 characters: npm run admin:hash -- \"your-password\"");
  process.exit(1);
}

console.log(await bcrypt.hash(password, 12));
