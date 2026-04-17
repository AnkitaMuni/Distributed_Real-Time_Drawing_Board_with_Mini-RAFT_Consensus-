FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies globally to avoid volume mount issues
RUN npm install -g express ws cors body-parser axios http-server

# 2. Set the path so Node can find the global modules
ENV NODE_PATH=/usr/local/lib/node_modules

# 3. Copy your replica's code and the frontend file
COPY . .

# 4. Expose the Backend port (400x) and the Frontend port (8080)
EXPOSE 4001 4002 4003 8080

# 5. Start both the Raft logic and the web server serving the CURRENT directory (.)
CMD node index.js & http-server . -p 8080 -c-1 --cors