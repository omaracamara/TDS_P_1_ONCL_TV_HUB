# TV Hub - Práctica Integradora 1

Proyecto de clase con Node.js, Express, TypeScript, MongoDB y Mongoose. Esta es la base estudiantil de TV Hub V4 para completar el flujo MVC de Watch sin cambiar la arquitectura existente.

## Como correr la aplicación 

```bash
npm install
docker compose up -d
npm run build
npm run import:all-channels
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Architecture

El flujo usa Route, Controller, Mongoose Model y MongoDB. Para canales intervienen `channel.routes.ts`, `channel.controller.ts`, `channel.model.ts`, MongoDB, JSON y `src/public/js/home.js`. Las rutas aplican middleware cuando hace falta; los controladores validan y coordinan; los modelos definen persistencia. El frontend es HTML, CSS y JavaScript vanilla con `fetch` nativo.

Para favoritos intervienen `home.js`, `favorite.routes.ts`, `authenticate`, `favorite.controller.ts`, `favorite.model.ts` y MongoDB. Un índice único en `userId` y `channelId` evita que un usuario guarde el mismo canal dos veces.

## API

| Method | Endpoint               | Description                    |
| ------ | ---------------------- | ------------------------------ |
| GET    | `/health`              | Express health check           |
| GET    | `/ready`               | MongoDB readiness check        |
| POST   | `/api/auth/register`   | Creates a USER and signs in    |
| POST   | `/api/auth/login`      | Signs in and creates a session |
| POST   | `/api/auth/refresh`    | Rotates refresh token          |
| POST   | `/api/auth/logout`     | Revokes current session        |
| POST   | `/api/auth/logout-all` | Revokes all user sessions      |
| GET    | `/api/users/me`        | Current authenticated user     |
| GET    | `/api/admin/demo`      | ADMIN-only demonstration       |
| GET    | `/api/channels`        | Active channels from MongoDB   |
| GET    | `/api/channels/:id`    | One active channel for Watch   |
| GET    | `/api/favorites`       | Current user's favorite channels |
| POST   | `/api/favorites/:channelId` | Adds an active channel to the current user's favorites |
| DELETE | `/api/favorites/:channelId` | Removes a channel from the current user's favorites |
