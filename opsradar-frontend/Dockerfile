FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
ENV HOST=0.0.0.0
ENV CHOKIDAR_USEPOLLING=true
EXPOSE 3000
CMD ["npm", "start"]
