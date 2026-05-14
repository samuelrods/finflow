import { NestFactory } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { API_PREFIX } from './common/constants';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust reverse proxy headers
  app.set('trust proxy', 1);

  app.use(cookieParser());

  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow if no origin (e.g. server-to-server) or if it's in the allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Log the blocked origin for debugging but don't throw an exception to avoid 500/502s
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix(API_PREFIX);

  const config = new DocumentBuilder()
    .setTitle('FinFlow API')
    .setDescription('The FinFlow API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(
      'refresh_token',
      { type: 'apiKey', in: 'cookie' },
      'refresh_token',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server listening on port ${port}`);
}
void bootstrap();
