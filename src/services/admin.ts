/**
 * Staff sign-in for the command centre. Prototype only: one demo account checked in the browser.
 * Production would use Accel's single sign-on; nothing here protects real data.
 */
export const ADMIN_EMAIL = "administrator123@udyamdigital.in";
const ADMIN_PASSWORD = "123@123";

/** Accepts the full demo email or just its user name, in any letter case. */
export function checkAdmin(id: string, password: string) {
  const v = id.trim().toLowerCase();
  return (v === ADMIN_EMAIL || v === ADMIN_EMAIL.split("@")[0]) && password === ADMIN_PASSWORD;
}
