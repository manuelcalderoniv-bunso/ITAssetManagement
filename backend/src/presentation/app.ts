import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

import assetRoutes from "./routes/assetRoutes";
import authRoutes from "./routes/authRoutes";
import auditRoutes from "./routes/auditRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

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

export default app;
