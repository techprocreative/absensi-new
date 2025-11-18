import swaggerJsdoc from "swagger-jsdoc";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "FaceAttend API",
      version: "1.0.0",
      description: "Face Recognition Attendance System API Documentation",
      contact: {
        name: "FaceAttend Team",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Authorization header using the Bearer scheme",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Data tidak valid" },
                details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
                timestamp: { type: "string", format: "date-time" },
                path: { type: "string" },
              },
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            role: { type: "string", enum: ["admin", "hrd", "employee"] },
            employeeId: { type: "string", nullable: true },
          },
        },
        Employee: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            employeeId: { type: "string" },
            name: { type: "string" },
            position: { type: "string" },
            email: { type: "string", format: "email", nullable: true },
            phone: { type: "string", nullable: true },
            photo: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Attendance: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            employeeId: { type: "string" },
            date: { type: "string", format: "date" },
            checkIn: { type: "string", format: "date-time", nullable: true },
            breakStart: { type: "string", format: "date-time", nullable: true },
            breakEnd: { type: "string", format: "date-time", nullable: true },
            checkOut: { type: "string", format: "date-time", nullable: true },
            status: {
              type: "string",
              enum: ["present", "late", "absent", "on_break"],
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "admin" },
            password: { type: "string", example: "password123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            employee: { $ref: "#/components/schemas/Employee", nullable: true },
            token: { type: "string", description: "JWT authentication token" },
          },
        },
        Statistics: {
          type: "object",
          properties: {
            totalEmployees: { type: "number" },
            presentToday: { type: "number" },
            lateToday: { type: "number" },
            absentToday: { type: "number" },
            attendanceRate: { type: "string", example: "85.5" },
          },
        },
      },
    },
    tags: [
      { name: "Authentication", description: "Authentication endpoints" },
      { name: "Employees", description: "Employee management" },
      { name: "Attendance", description: "Attendance management" },
      { name: "Schedules", description: "Schedule management" },
      { name: "Reports", description: "Reports and statistics" },
      { name: "Health", description: "Health check endpoints" },
    ],
  },
  apis: ["./server/routes.ts", "./server/docs/*.ts"],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "FaceAttend API Documentation",
  }));
  
  // Serve OpenAPI JSON
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
}

export default specs;
