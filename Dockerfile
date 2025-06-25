from node:20

WORKDIR /app
COPY . .
RUN npm install pnpm
RUN pnpm install

RUN pnpm build
EXPOSE 3000

# Use a non-root user to run the application
USER node
# Set the environment variable for production
ENV NODE_ENV=production
# Start the application
ENTRYPOINT ["pnpm", "start"]
