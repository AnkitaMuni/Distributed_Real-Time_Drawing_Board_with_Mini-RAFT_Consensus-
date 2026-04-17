FROM node:20-alpine

WORKDIR /app

# Install everything globally to ensure they are available regardless of volume mounts
RUN npm install -g express ws cors body-parser axios http-server

# Tell Node to look in the global folder for modules
ENV NODE_PATH=/usr/local/lib/node_modules

COPY . .

EXPOSE 4001 4002 4003 3000 8080

# Use the full path for node to ensure it executes index.js
CMD node index.js & http-server -p 8080 -c-1 --cors