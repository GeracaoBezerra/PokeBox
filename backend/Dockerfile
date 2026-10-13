FROM node:lts-alpine

WORKDIR /app 

COPY package*.json ./

RUN npm ci

COPY . . 

RUN npx prisma generate

EXPOSE 3000 

CMD ["npm", "start"]