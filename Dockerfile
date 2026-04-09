FROM node:20-slim
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm i --no-fund --no-audit --legacy-peer-deps

ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL

ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

ARG NEXT_PUBLIC_VMPAY_API_BASE_URL
ENV NEXT_PUBLIC_VMPAY_API_BASE_URL=$NEXT_PUBLIC_VMPAY_API_BASE_URL

# Copiar o restante
COPY . .

# Fazer a build (as variaveis serao pegas no railway runtime ou ignoradas na build estatica)
RUN npm run build

# Expor e iniciar
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["npm", "start"]
