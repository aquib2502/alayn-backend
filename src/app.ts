import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { errorMiddleware } from './middleware/error.middleware';
import routes from './routes';
import { swaggerDocument } from './config/swagger';

const app = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://alaynai.com",
    "https://www.alaynai.com"
  ],
  credentials: true,
}));

// Request Parsers
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve Static Uploads
import path from 'path';
app.use(
  '/uploads',
  cors(),
  express.static(path.resolve(__dirname, '../uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  })
);

// Swagger UI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route Mappings
app.use('/api/v1', routes);

// Base Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Alayn Operations & Management Platform API',
    docs: '/api/docs',
  });
});

// Error handling middleware (MUST be last)
app.use(errorMiddleware);

export { app };
export default app;
