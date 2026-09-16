import express from "express";
import assetRoutes from "./routes/assetRoutes";

const app = express();

app.use(express.json());

app.use("/api", assetRoutes);

export default app;