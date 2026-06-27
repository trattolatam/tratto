// ─── AGREGAR ESTOS CAMPOS AL MODELO User EN schema.prisma ────────────────────
//
// Buscar el modelo `model User {` y agregar estas dos líneas dentro,
// junto a los demás campos de verificación:

  emailVerificationToken      String?
  emailVerificationExpiresAt  DateTime?

// ─── Ejemplo de cómo debería quedar el bloque relevante del modelo User ──────
//
// model User {
//   id            String    @id @default(uuid())
//   email         String    @unique
//   passwordHash  String
//   name          String
//   role          UserRole  @default(USER)
//   country       String
//   city          String?
//   phone         String?
//   avatarUrl     String?
//   isVerified    Boolean   @default(false)
//   verifiedAt    DateTime?
//
//   // ── Agregar estas dos líneas ──
//   emailVerificationToken      String?
//   emailVerificationExpiresAt  DateTime?
//
//   isPro         Boolean   @default(false)
//   ...
// }
//
// Después de editar el schema, correr:
//   npx prisma migrate dev --name add_email_verification
