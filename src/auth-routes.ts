import { Router, Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}

const router = Router();

const ADMIN_USER = process.env.DASHBOARD_USER ?? "admin";
const ADMIN_PASS = process.env.DASHBOARD_PASS ?? "demo.20.26";

router.post("/api/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, mensaje: "Usuario o contraseña incorrectos" });
  }
});

router.get("/api/auth/me", (req: Request, res: Response) => {
  res.json({ authenticated: !!req.session.authenticated });
});

router.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => res.json({ ok: true }));
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ ok: false, mensaje: "No autorizado" });
  }
}

export default router;
