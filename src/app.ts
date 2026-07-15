import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { errorMiddleware } from './middleware/error.middleware';
import routes from './routes';
import { swaggerDocument } from './config/swagger';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route Mappings
app.use('/api/v1', routes);

// Base Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Café Operations & Management Platform API',
    docs: '/api/docs',
  });
});

// Error handling middleware (MUST be last)
app.use(errorMiddleware);

export { app };
export default app;
