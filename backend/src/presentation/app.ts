import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import warrantyRoutes from "./routes/warrantyRoutes";
import assetRoutes from "./routes/assetRoutes";
import authRoutes from "./routes/authRoutes";
import auditRoutes from "./routes/auditRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import licenseRoutes from "./routes/licenseRoutes";
import storageRoutes from "./routes/storageRoutes";
import spareRoutes from "./routes/spareRoutes";
import procurementRoutes from "./routes/procurementRoutes";
const app = express();
app.use(cors());
app.use(express.json());

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "IT Asset Management API",
      version: "1.0.0",
      description: "API Documentation for IT Asset Management System",
    },
  },
  apis: ["./src/presentation/routes/*.ts"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", assetRoutes);
app.use("/api", authRoutes);
app.use("/api", auditRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", warrantyRoutes);
app.use("/api", licenseRoutes);
app.use("/api", storageRoutes);
app.use("/api", spareRoutes);
app.use("/api", procurementRoutes);
export default app;
