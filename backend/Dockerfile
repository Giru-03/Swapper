FROM node:22-alpine

WORKDIR /app

# copy package manifests first to leverage Docker cache
COPY package*.json ./

# set production env and install only production deps (omit devDeps)
ENV NODE_ENV=production
RUN npm ci --omit=dev

# copy app source
COPY . .

# run as non-root user for improved container security
USER node

CMD ["npm", "start"]