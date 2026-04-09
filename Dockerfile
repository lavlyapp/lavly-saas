FROM node:20-alpine
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar o restante
COPY . .

# Fazer a build (as variaveis serao pegas no railway runtime ou ignoradas na build estatica)
RUN npm run build

# Expor e iniciar
EXPOSE 3000
CMD ["npm", "start"]
