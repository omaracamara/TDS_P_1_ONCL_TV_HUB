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

## Cloud deployment - Practice 2

This section documents the cloud adaptations. The source application remains the TV Hub version from Practice 1.

### MongoDB Atlas

Create an Atlas database and a database user with read/write access limited to that database. Configure a network rule that allows access from Render. Render receives the connection string through `MONGO_URI`; it must not be committed or shown in the delivery PDF.

### Render

The repository includes `render.yaml` for a Node.js web service:

- Build: `npm ci && npm run build`
- Start: `npm start`
- Health: `/health`
- Readiness: `/ready`
- Production variables: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL`, and `REFRESH_TOKEN_TTL`

Create the service with the environment variables in the Render dashboard. Do not enable a deploy hook in the repository or PDF.

### Channel persistence

After configuring the production URI locally or in the deployment environment, compile the project and run:

```bash
npm run build
MONGO_URI="<atlas-uri>" npm run import:all-channels
```

In PowerShell, set `MONGO_URI` with `$env:MONGO_URI="<atlas-uri>"` before running the import command. `import:all-channels` reads `docs/*_playlist.m3u`, deletes existing favorites and channels, and inserts the parsed channels into the selected Atlas database. Verify the documents in Atlas and confirm that `/api/channels` and the public interface return the same channels.

For a safer incremental import that updates channels by country and ID, use:

```bash
npm run import:channels -- docs/mexico_playlist.m3u "Mexico"
```

### CI/CD

`.github/workflows/cicd.yml` validates each push and pull request. A successful CI run on `main` calls Render's deploy hook. Render deploys only when CI reached success; a failed test or build makes the deploy job skip.

Configure one GitHub Actions repository secret:

- `RENDER_DEPLOY_HOOK_URL`: the Render deploy hook URL

Do not paste the hook URL into commits, README text, screenshots, or the PDF.
