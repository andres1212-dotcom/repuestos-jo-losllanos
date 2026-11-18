FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar SOLO el package.json de la subcarpeta server para cachear dependencias
COPY server/package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar todo el proyecto
COPY . .

# El servidor principal está en server/server.js
WORKDIR /app/server

# Puerto de la aplicación
ENV PORT=3000
EXPOSE 3000

# Arrancar la aplicación
CMD ["node", "server.js"]
