import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import apartmentsRouter from "./apartments";
import inspectionsRouter from "./inspections";
import uploadRouter from "./upload";
import bookingsRouter from "./bookings";
import favoritesRouter from "./favorites";
import usersRouter from "./users";
import supportRouter from "./support";
import adminRouter from "./admin";
import notificationsRouter from "./notifications";
import geoRouter from "./geo";
import { ensureSeedApartments } from "../lib/seed-apartments";

// Pre-seed base apartments in PostgreSQL on startup
ensureSeedApartments().catch((err) => {
  console.error("Failed to initial seed apartments:", err);
});

const router: IRouter = Router();

router.use(healthRouter);
router.use("/profile", profileRouter);
router.use("/apartments", apartmentsRouter);
router.use("/inspections", inspectionsRouter);
router.use("/upload", uploadRouter);
router.use("/bookings", bookingsRouter);
router.use("/favorites", favoritesRouter);
router.use("/users", usersRouter);
router.use("/support", supportRouter);
router.use("/admin", adminRouter);
router.use("/notifications", notificationsRouter);
router.use("/geo", geoRouter);

export default router;
