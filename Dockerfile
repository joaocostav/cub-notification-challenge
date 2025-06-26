FROM node:22

WORKDIR /app

COPY . .
RUN rm -rf node_modules
RUN npm i -g pnpm
RUN pnpm i

ARG DATABASE_URL="postgresql://postgres:postgrespassword@host.docker.internal:5432/notifications"
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm prisma migrate deploy
RUN pnpm prisma generate

RUN pnpm build
EXPOSE 3000

# Use a non-root user to run the application
USER node
# Set the environment variable for production
ENV NODE_ENV=production
# Start the application
ENTRYPOINT ["pnpm", "start"]
